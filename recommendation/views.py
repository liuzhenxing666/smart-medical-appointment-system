from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from datetime import timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

from smart_doctor.api_utils import APIResponse, APIExceptionHandler, RequestValidator
from smart_doctor.cache_utils import cached_api
from .models import UserPreference, UserBehavior, RecommendationRule, RecommendationResult, RecommendationFeedback, PopularItem
from .ai_recommendation_engine import recommendation_engine
from .serializers import (
    UserPreferenceSerializer, UserBehaviorSerializer,
    RecommendationRuleSerializer, RecommendationResultSerializer,
    RecommendationFeedbackSerializer, PopularItemSerializer,
    HospitalRecommendationRequestSerializer, DoctorRecommendationRequestSerializer,
    RecommendationResponseSerializer
)
from hospitals.models import Hospital
from doctors.models import Doctor
from location.tencent_map_client import tencent_map_client


@api_view(['GET', 'POST'])
@csrf_exempt
@APIExceptionHandler.handle_exception
@permission_classes([IsAuthenticated])
@cached_api(cache_type='user_preferences', timeout=300)  # 5分钟缓存，缓存键已包含用户身份
def user_preferences(request):
    """用户偏好管理API（仅允许操作当前登录用户自己的偏好，管理员除外）"""

    if request.method == 'GET':
        # 管理员可通过 user_id 查询指定用户，普通用户只能查自己
        user_id = request.GET.get('user_id')
        if user_id and request.user.is_staff:
            target_user_id = user_id
        else:
            target_user_id = request.user.id
        preference_type = request.GET.get('preference_type')

        # 构建查询条件
        filters = Q(user__id=target_user_id)
        if preference_type:
            filters &= Q(preference_type=preference_type)

        # 获取用户偏好
        preferences = UserPreference.objects.filter(filters)

        if not preferences.exists():
            return APIResponse.success(
                data=[],
                message="暂无用户偏好设置"
            )

        serializer = UserPreferenceSerializer(preferences, many=True)

        return APIResponse.success(
            data={
                'preferences': serializer.data,
                'count': len(serializer.data),
                'filters': {
                    'user_id': target_user_id,
                    'preference_type': preference_type
                }
            },
            message="用户偏好获取成功"
        )

    elif request.method == 'POST':
        # 强制绑定当前登录用户，禁止为其他用户创建偏好
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['user'] = request.user.id

        # 验证请求数据
        try:
            validated_data = RequestValidator.validate_request_data(
                UserPreferenceSerializer,
                data
            )
        except ValueError as e:
            return APIResponse.validation_error(str(e))

        # 创建或更新用户偏好
        existing_pref = UserPreference.objects.filter(
            user__id=request.user.id,
            preference_type=validated_data['preference_type']
        ).first()

        if existing_pref:
            # 更新现有偏好
            for attr, value in validated_data.items():
                setattr(existing_pref, attr, value)
            existing_pref.save()
            response_serializer = UserPreferenceSerializer(existing_pref)
            message = "用户偏好更新成功"
        else:
            # 创建新偏好
            preference = UserPreference.objects.create(**validated_data)
            response_serializer = UserPreferenceSerializer(preference)
            message = "用户偏好创建成功"

        return APIResponse.success(
            data=response_serializer.data,
            message=message,
            status_code=201
        )


@csrf_exempt
@APIExceptionHandler.handle_exception
def record_user_behavior(request):
    """记录用户行为API"""
    
    if request.method != 'POST':
        return APIResponse.method_not_allowed("只支持POST请求")
    
    # 验证请求数据
    try:
        # 解析JSON数据
        import json
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
        
        validated_data = RequestValidator.validate_request_data(
            UserBehaviorSerializer, 
            data
        )
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    # 创建用户行为记录
    try:
        behavior = UserBehavior.objects.create(**validated_data)
        serializer = UserBehaviorSerializer(behavior)
    except Exception as e:
        return APIResponse.server_error("创建行为记录失败: " + str(e))
    
    # 更新推荐统计
    behavior_type = validated_data['behavior_type']
    item_id = validated_data['target_id']
    
    if behavior_type in ['view_hospital', 'view_doctor', 'make_appointment', 'feedback']:
        try:
            # 更新热门项目统计
            popular_item, created = PopularItem.objects.get_or_create(
                item_id=item_id,
                item_type=validated_data['target_type'],
                defaults={
                    'popularity_score': 0,
                    'view_count': 0,
                    'appointment_count': 0,
                    'feedback_count': 0,
                    'time_period': 'daily'
                }
            )
            
            # 根据行为类型更新统计
            if behavior_type in ['view_hospital', 'view_doctor']:
                popular_item.view_count += 1
                popular_item.popularity_score += 1
            elif behavior_type == 'make_appointment':
                popular_item.appointment_count += 1
                popular_item.popularity_score += 5
            elif behavior_type == 'feedback':
                popular_item.feedback_count += 1
                popular_item.popularity_score += 3
            
            popular_item.save()
            
        except Exception as e:
            # 记录错误但不影响主流程
            logger.error(f"更新热门项目统计失败: {str(e)}")
    
    return APIResponse.success(
        data=serializer.data,
        message='用户行为记录成功',
        status_code=201
    )


def update_popularity_score(item_type, item_id, count_type):
    """更新热门项目分数"""
    
    today = timezone.now().date()
    period_start = today.replace(day=1)  # 月度统计
    
    popular_item, created = PopularItem.objects.get_or_create(
        item_type=item_type,
        item_id=item_id,
        time_period='monthly',
        period_start=period_start,
        defaults={
            'period_end': period_start.replace(day=28),
            'view_count': 0,
            'appointment_count': 0,
            'feedback_count': 0
        }
    )
    
    if count_type == 'view_count':
        popular_item.view_count += 1
    elif count_type == 'appointment_count':
        popular_item.appointment_count += 1
    
    popular_item.calculate_popularity()


@csrf_exempt
@APIExceptionHandler.handle_exception
@cached_api(cache_type='recommend_hospitals', timeout=600)  # 10分钟缓存，推荐结果相对稳定
def recommend_hospitals(request):
    """推荐医院API - 集成智能推荐引擎"""
    try:
        # 验证请求参数
        import json
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
        
        # 验证必需字段
        required_fields = ['user_id']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return APIResponse.error(f"缺少必需字段: {', '.join(missing_fields)}")
        
        # 处理位置参数 - 支持城市名称或坐标
        user_id = data.get('user_id')
        city = data.get('city', '')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        # 如果只有城市名称，使用默认坐标
        if latitude is None or longitude is None:
            if city:
                # 根据城市名称设置默认坐标
                city_coordinates = {
                    '北京': (39.9042, 116.4074),
                    '上海': (31.2304, 121.4737),
                    '广州': (23.1291, 113.2644),
                    '深圳': (22.5431, 114.0579),
                    '杭州': (30.2741, 120.1551)
                }
                if city in city_coordinates:
                    latitude, longitude = city_coordinates[city]
                else:
                    # 默认使用北京坐标
                    latitude, longitude = 39.9042, 116.4074
            else:
                # 没有城市和坐标，使用默认坐标
                latitude, longitude = 39.9042, 116.4074
        
        # 确保坐标是浮点数
        latitude = float(latitude)
        longitude = float(longitude)
        specialty = data.get('specialty', '')
        max_distance = int(data.get('max_distance', 100))
        
        # 构建查询条件
        query = Q()
        if specialty:
            query &= Q(specialties__icontains=specialty)
        
        # 获取医院列表
        hospitals = Hospital.objects.filter(query)
        
        # 生成模拟医院数据（暂时替代数据库查询）
        hospital_list = [
            {
                'id': '1',
                'name': '北京协和医院',
                'address': '北京市东城区帅府园1号',
                'specialties': '内科,外科,妇产科,儿科',
                'average_rating': 4.8,
                'review_count': 1250,
                'distance': 5.2,
                'latitude': 39.9042,
                'longitude': 116.4074,
                'is_available': True
            },
            {
                'id': '2',
                'name': '北京大学第三医院',
                'address': '北京市海淀区花园北路49号',
                'specialties': '内科,外科,骨科,神经科',
                'average_rating': 4.7,
                'review_count': 980,
                'distance': 8.1,
                'latitude': 39.9042,
                'longitude': 116.4074,
                'is_available': True
            }
        ]
        
        # 生成推荐结果
        recommendations = []
        for hospital in hospital_list:
            # 简化推荐分数计算
            base_score = hospital.get('average_rating', 0) / 5.0
            distance_score = 1.0 - min(hospital.get('distance', 0) / max_distance, 1.0)
            
            # 专业匹配分数
            specialty_score = 1.0 if not specialty or specialty in hospital.get('specialties', '') else 0.3
            
            # 综合分数
            score = base_score * 0.4 + distance_score * 0.4 + specialty_score * 0.2
            
            recommendation = {
                'hospital': hospital,
                'score': round(score, 3),
                'reason': f"基于您的偏好和医院评分推荐，距离{hospital.get('distance', 0)}公里",
                'ranking_factors': {
                    'base_score': round(base_score, 3),
                    'distance_score': round(distance_score, 3),
                    'personalization_score': round(score, 3)
                }
            }
            recommendations.append(recommendation)
        
        # 按推荐分数排序
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return APIResponse.success({
            'recommendations': recommendations[:10],  # 返回前10个推荐
            'total_count': len(recommendations),
            'user_profile_updated': user_id in recommendation_engine.user_profiles
        })
        
    except Exception as e:
        return APIResponse.error(str(e))


def generate_hospital_recommendations(data, rule):
    """生成医院推荐（模拟实现）"""
    
    # 模拟医院数据 - 实际项目中应该从数据库获取
    mock_hospitals = [
        {
            'id': '12345678-1234-1234-1234-123456789abc',
            'name': '北京协和医院',
            'specialty': '综合医院',
            'location': '北京市东城区',
            'average_rating': 4.8,
            'distance': 5.2
        },
        {
            'id': '22345678-1234-1234-1234-123456789abc',
            'name': '北京大学第三医院',
            'specialty': '综合医院',
            'location': '北京市海淀区',
            'average_rating': 4.7,
            'distance': 8.1
        },
        {
            'id': '32345678-1234-1234-1234-123456789abc',
            'name': '北京天坛医院',
            'specialty': '神经科专科',
            'location': '北京市丰台区',
            'average_rating': 4.6,
            'distance': 12.3
        }
    ]
    
    recommendations = []
    for hospital in mock_hospitals:
        # 计算推荐分数（简化版）
        score = calculate_recommendation_score(hospital, data, rule)
        
        if score > 0.3:  # 过滤低分推荐
            recommendations.append({
                'target_id': hospital['id'],
                'score': score,
                'reason': f"基于您的偏好和医院评分推荐，距离{hospital['distance']}公里",
                'recommendation_data': hospital
            })
    
    # 按分数排序
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    
    # 限制返回数量
    limit = data.get('limit', 10)
    return recommendations[:limit]


def calculate_recommendation_score(hospital, data, rule):
    """计算推荐分数"""
    
    # 基础分数（基于评分）
    base_score = hospital.get('average_rating', 0) / 5.0
    
    # 距离分数（越近分数越高）
    distance = hospital.get('distance', 0)
    max_distance = data.get('max_distance', 100)
    distance_score = max(0, 1 - distance / max_distance) if max_distance > 0 else 1
    
    # 专业匹配分数
    specialty = data.get('specialty', '')
    specialty_score = 1.0 if not specialty or specialty in hospital.get('specialty', '') else 0.3
    
    # 综合分数
    final_score = (
        base_score * 0.4 +
        distance_score * 0.4 +
        specialty_score * 0.2
    )
    
    return min(1.0, max(0.0, final_score))


@csrf_exempt
@APIExceptionHandler.handle_exception
@cached_api(cache_type='recommend_doctors', timeout=600)  # 10分钟缓存，推荐结果相对稳定
def recommend_doctors(request):
    """推荐医生API - 集成智能推荐引擎"""
    try:
        # 验证请求参数
        import json
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
        
        # 验证必需字段
        required_fields = ['user_id']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return APIResponse.error(f"缺少必需字段: {', '.join(missing_fields)}")
        
        user_id = data.get('user_id')
        hospital_id = data.get('hospital_id', '')
        specialty = data.get('specialty', '')
        
        # 调试：打印接收到的参数
        print(f"接收到的参数 - user_id: {user_id}, hospital_id: {hospital_id}, specialty: {specialty}")
        print(f"specialty类型: {type(specialty)}, 长度: {len(specialty) if specialty else 0}")
        if specialty:
            print(f"specialty字符: {[ord(c) for c in specialty]}")
        
        # 使用模拟医生数据（因为数据库为空）
        mock_doctors = generate_mock_doctor_data()
        
        # 调试：打印所有模拟医生的专业信息
        print(f"模拟医生专业列表: {[doctor.get('specialty', '') for doctor in mock_doctors]}")
        
        # 根据医院ID和专业筛选医生
        filtered_doctors = []
        for doctor in mock_doctors:
            # 医院ID匹配
            hospital_match = not hospital_id or str(doctor.get('hospital_id', '')) == str(hospital_id)
            
            # 专业匹配 - 处理可能的编码问题
            doctor_specialty = doctor.get('specialty', '')
            specialty_match = True  # 默认匹配所有专业
            
            if specialty and specialty != '??':  # 只有当专业参数有效时才进行筛选
                specialty_match = doctor_specialty == specialty
            
            if hospital_match and specialty_match:
                filtered_doctors.append(doctor)
                print(f"匹配医生: {doctor.get('name')} - 专业: {doctor_specialty} - 医院: {doctor.get('hospital_id')}")
        
        # 调试：打印筛选信息
        print(f"医院ID筛选: {hospital_id}, 专业筛选: {specialty}")
        print(f"过滤前医生数量: {len(mock_doctors)}, 过滤后医生数量: {len(filtered_doctors)}")
        
        # 如果没有匹配的医生，返回空结果
        if not filtered_doctors:
            return APIResponse.success(
                data={
                    'recommendations': [],
                    'total_count': 0,
                    'user_profile_updated': False
                },
                message="操作成功"
            )
        
        # 计算推荐分数
        recommendations = []
        for doctor in filtered_doctors:
            score = calculate_doctor_recommendation_score(doctor, data)
            
            recommendation = {
                'doctor': doctor,
                'score': round(score, 3),
                'reason': generate_doctor_recommendation_reason(doctor, score),
                'ranking_factors': {
                    'base_score': round(doctor.get('average_rating', 0) / 5.0, 3),
                    'experience_score': round(min(doctor.get('experience_years', 0) / 30, 1.0), 3),
                    'specialty_match_score': 1.0 if specialty and specialty in doctor.get('specialty', '') else 0.5
                }
            }
            recommendations.append(recommendation)
        
        # 按推荐分数排序
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return APIResponse.success({
            'recommendations': recommendations[:10],  # 返回前10个推荐
            'total_count': len(recommendations),
            'user_profile_updated': False  # 模拟数据，无用户画像更新
        })
        
    except Exception as e:
        return APIResponse.error(str(e))


def generate_doctor_recommendations(data, rule):
    """生成医生推荐（模拟实现）"""
    
    # 模拟医生数据
    mock_doctors = [
        {
            'id': '42345678-1234-1234-1234-123456789abc',
            'name': '张医生',
            'specialty': '内科',
            'hospital': '北京协和医院',
            'average_rating': 4.9,
            'experience': 15,
            'availability': True
        },
        {
            'id': '52345678-1234-1234-1234-123456789abc',
            'name': '李医生',
            'specialty': '外科',
            'hospital': '北京大学第三医院',
            'average_rating': 4.8,
            'experience': 12,
            'availability': True
        },
        {
            'id': '62345678-1234-1234-1234-123456789abc',
            'name': '王医生',
            'specialty': '儿科',
            'hospital': '北京天坛医院',
            'average_rating': 4.7,
            'experience': 10,
            'availability': False
        }
    ]
    
    recommendations = []
    for doctor in mock_doctors:
        score = calculate_doctor_score(doctor, data, rule)
        
        if score > 0.3:
            recommendations.append({
                'target_id': doctor['id'],
                'score': score,
                'reason': f"{doctor['name']}医生，{doctor['specialty']}专家，从业{doctor['experience']}年",
                'recommendation_data': doctor
            })
    
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    limit = data.get('limit', 10)
    return recommendations[:limit]


def calculate_doctor_score(doctor, data, rule):
    """计算医生推荐分数"""
    
    # 评分分数
    rating_score = doctor.get('average_rating', 0) / 5.0
    
    # 经验分数
    experience_score = min(1.0, doctor.get('experience', 0) / 20.0)
    
    # 专业匹配分数
    specialty = data.get('specialty', '')
    specialty_score = 1.0 if not specialty or specialty in doctor.get('specialty', '') else 0.2
    
    # 医院匹配分数
    hospital_id = data.get('hospital_id')
    hospital_score = 1.0 if not hospital_id else 0.8
    
    # 可用性分数
    availability_score = 1.0 if doctor.get('availability', False) else 0.1
    
    # 综合分数
    final_score = (
        rating_score * 0.4 +
        experience_score * 0.2 +
        specialty_score * 0.2 +
        hospital_score * 0.1 +
        availability_score * 0.1
    )
    
    return min(1.0, max(0.0, final_score))


@csrf_exempt
@APIExceptionHandler.handle_exception
def submit_feedback(request):
    """提交推荐反馈API"""
    
    # 验证请求数据
    try:
        # 解析JSON数据
        import json
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
        
        validated_data = RequestValidator.validate_request_data(
            RecommendationFeedbackSerializer, 
            data
        )
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    # 保存反馈
    feedback = RecommendationFeedback.objects.create(**validated_data)
    
    # 更新推荐结果的反馈统计
    recommendation = validated_data['recommendation']
    feedback_type = validated_data['feedback_type']
    
    if feedback_type in ['positive', 'click']:
        update_popularity_score(
            recommendation.target_type,
            recommendation.target_id,
            'feedback_count'
        )
    
    # 序列化结果
    serializer = RecommendationFeedbackSerializer(feedback)
    
    return APIResponse.success(
        data=serializer.data,
        message='反馈提交成功',
        status_code=201
    )


@APIExceptionHandler.handle_exception
@cached_api(cache_type='popular_items', timeout=300)  # 5分钟缓存，热门数据变化较快
def get_popular_items(request):
    """获取热门项目API"""
    
    # 验证查询参数
    try:
        item_type = request.GET.get('item_type', 'hospital')
        limit = int(request.GET.get('limit', 10))
        time_period = request.GET.get('time_period', 'monthly')
        
        # 验证参数范围
        if limit < 1 or limit > 50:
            return APIResponse.validation_error("limit参数必须在1-50之间")
        
        if item_type not in ['hospital', 'doctor', 'department']:
            return APIResponse.validation_error("item_type参数必须是hospital、doctor或department")
        
        if time_period not in ['daily', 'weekly', 'monthly']:
            return APIResponse.validation_error("time_period参数必须是daily、weekly或monthly")
            
    except ValueError as e:
        return APIResponse.validation_error("参数格式错误: " + str(e))
    
    # 获取热门项目
    all_popular_items = list(PopularItem.objects.filter(
        item_type=item_type,
        time_period=time_period
    ).order_by('-popularity_score'))
    popular_items = all_popular_items[:limit]
    
    if not popular_items:
        return APIResponse.success(
            data=[],
            message=f"暂无{item_type}的热门数据"
        )
    
    serializer = PopularItemSerializer(popular_items, many=True)
    
    return APIResponse.success(
        data={
            'items': serializer.data,
            'count': len(serializer.data),
            'filters': {
                'item_type': item_type,
                'time_period': time_period,
                'limit': limit
            }
        },
        message="热门项目获取成功"
    )


@APIExceptionHandler.handle_exception
@cached_api(cache_type='recommendation_history', timeout=600)  # 10分钟缓存，推荐历史相对稳定
def get_recommendation_history(request):
    """获取推荐历史API"""
    
    # 验证查询参数
    try:
        user_id = request.GET.get('user_id')
        recommendation_type = request.GET.get('recommendation_type')
        limit = int(request.GET.get('limit', 20))
        
        # 验证必需参数
        if not user_id:
            return APIResponse.validation_error("user_id参数必填")
        
        # 验证参数范围
        if limit < 1 or limit > 100:
            return APIResponse.validation_error("limit参数必须在1-100之间")
        
        if recommendation_type and recommendation_type not in ['hospital', 'doctor']:
            return APIResponse.validation_error("recommendation_type参数必须是hospital或doctor")
            
    except ValueError as e:
        return APIResponse.validation_error("参数格式错误: " + str(e))
    
    # 构建查询条件
    filters = Q(user__id=user_id)
    if recommendation_type:
        filters &= Q(recommendation_type=recommendation_type)
    
    # 获取推荐历史
    all_recommendations = list(RecommendationResult.objects.filter(filters).order_by('-created_at'))
    recommendations = all_recommendations[:limit]
    
    if not recommendations:
        return APIResponse.success(
            data=[],
            message="暂无推荐历史记录"
        )
    
    serializer = RecommendationResultSerializer(recommendations, many=True)
    
    return APIResponse.success(
        data={
            'recommendations': serializer.data,
            'count': len(serializer.data),
            'filters': {
                'user_id': user_id,
                'recommendation_type': recommendation_type,
                'limit': limit
            }
        },
        message="推荐历史获取成功"
    )


@csrf_exempt
@require_http_methods(["GET"])
@APIExceptionHandler.handle_exception
@cached_api(cache_type='user_profile', timeout=600)  # 10分钟缓存，用户画像相对稳定
def get_user_profile(request, user_id):
    """获取用户画像API - 集成智能推荐引擎"""
    try:
        # 验证用户ID
        if not user_id or user_id <= 0:
            return APIResponse.error(message="无效的用户ID", error_code="invalid_user_id")
        
        # 获取用户偏好
        preferences = UserPreference.objects.filter(user_id=user_id)
        preference_data = [
            {
                'preference_type': pref.preference_type,
                'preference_value': pref.preference_value,
                'weight': pref.weight,
                'created_at': pref.created_at.isoformat() if pref.created_at else None
            }
            for pref in preferences
        ]
        
        # 获取用户行为（先获取所有行为，再在Python中进行切片和过滤）
        all_behaviors = list(UserBehavior.objects.filter(user_id=user_id).order_by('-created_at'))
        behaviors = all_behaviors[:100]  # 取前100条
        
        # 使用智能推荐引擎构建用户画像
        user_profile = recommendation_engine.build_user_profile(user_id)
        
        # 行为统计
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_behaviors = [behavior for behavior in all_behaviors if behavior.created_at >= thirty_days_ago]
        
        behavior_stats = {
            'total_behaviors': len(behaviors),
            'recent_behaviors': len(recent_behaviors),
            'behavior_types': {}
        }
        
        # 统计行为类型
        for behavior in behaviors:
            behavior_type = behavior.behavior_type
            if behavior_type not in behavior_stats['behavior_types']:
                behavior_stats['behavior_types'][behavior_type] = 0
            behavior_stats['behavior_types'][behavior_type] += 1
        
        # 推荐历史
        all_recommendations = list(RecommendationResult.objects.filter(user_id=user_id).order_by('-created_at'))
        recommendations = all_recommendations[:20]
        recommendation_data = [
            {
                'recommendation_type': rec.recommendation_type,
                'target_id': rec.target_id,
                'target_type': rec.target_type,
                'score': float(rec.score) if rec.score else 0.0,
                'reason': rec.reason,
                'created_at': rec.created_at.isoformat() if rec.created_at else None
            }
            for rec in recommendations
        ]
        
        # 计算用户画像完整度
        profile_completeness = 0
        if user_profile: profile_completeness += 30
        if preferences: profile_completeness += 30
        if behaviors: profile_completeness += 40
        profile_completeness = min(profile_completeness, 100)
        
        # 确保所有数据都是可序列化的
        response_data = {
            'user_id': str(user_id),
            'ai_profile': user_profile if user_profile and isinstance(user_profile, dict) else {},
            'preferences': preference_data,
            'behavior_stats': behavior_stats,
            'recommendation_history': recommendation_data,
            'profile_updated_at': timezone.now().isoformat(),
            'profile_completeness': profile_completeness
        }
        
        # 使用APIResponse构建响应
        return APIResponse.success(
            data=response_data,
            message='用户画像获取成功'
        )
        
    except Exception as e:
        # 使用APIResponse返回错误响应
        return APIResponse.error(
            message='服务器内部错误',
            error_code='internal_server_error',
            details=str(e)
        )


def generate_mock_doctor_data():
    """生成模拟医生数据"""
    return [
        {
            'id': '1',
            'name': '张医生',
            'specialty': '内科',
            'hospital_id': '1',
            'hospital_name': '北京协和医院',
            'title': '主任医师',
            'experience_years': 15,
            'average_rating': 4.8,
            'consultation_count': 5000,
            'is_available': True,
            'consultation_fee': 200.0,
            'description': '擅长心血管疾病治疗'
        },
        {
            'id': '2', 
            'name': '李医生',
            'specialty': '外科',
            'hospital_id': '2',
            'hospital_name': '上海瑞金医院',
            'title': '副主任医师',
            'experience_years': 10,
            'average_rating': 4.6,
            'consultation_count': 3000,
            'is_available': True,
            'consultation_fee': 150.0,
            'description': '擅长微创手术'
        },
        {
            'id': '3',
            'name': '王医生',
            'specialty': '儿科',
            'hospital_id': '3',
            'hospital_name': '广州中山医院',
            'title': '主治医师',
            'experience_years': 8,
            'average_rating': 4.7,
            'consultation_count': 2000,
            'is_available': True,
            'consultation_fee': 120.0,
            'description': '擅长儿童常见病治疗'
        },
        {
            'id': '4',
            'name': '赵医生',
            'specialty': '妇产科',
            'hospital_id': '1',
            'hospital_name': '北京协和医院',
            'title': '主任医师',
            'experience_years': 20,
            'average_rating': 4.9,
            'consultation_count': 6000,
            'is_available': True,
            'consultation_fee': 180.0,
            'description': '擅长高危妊娠处理'
        },
        {
            'id': '5',
            'name': '陈医生',
            'specialty': '骨科',
            'hospital_id': '2',
            'hospital_name': '上海瑞金医院',
            'title': '副主任医师',
            'experience_years': 12,
            'average_rating': 4.5,
            'consultation_count': 2500,
            'is_available': True,
            'consultation_fee': 160.0,
            'description': '擅长关节置换手术'
        }
    ]


def calculate_doctor_recommendation_score(doctor, request_data):
    """计算医生推荐分数"""
    # 基础评分（基于医生资历和评价）
    base_score = (doctor['average_rating'] * 0.4 + 
                 (doctor['experience_years'] / 20) * 0.3 + 
                 (doctor['consultation_count'] / 10000) * 0.3) * 100
    
    # 专业匹配度
    specialty_match = 1.0 if doctor['specialty'] == request_data.get('specialty', '') else 0.3
    
    # 医院匹配度
    hospital_match = 1.0 if doctor['hospital_id'] == request_data.get('hospital_id', '') else 0.5
    
    # 综合评分
    final_score = base_score * specialty_match * hospital_match
    
    return min(final_score, 100.0)  # 限制最大分数为100


def generate_doctor_recommendation_reason(doctor, score):
    """生成医生推荐理由"""
    reasons = []
    
    if score >= 90:
        reasons.append("该医生在专业领域具有卓越表现")
    elif score >= 80:
        reasons.append("该医生专业能力优秀")
    else:
        reasons.append("该医生具备良好的专业背景")
    
    if doctor['experience_years'] >= 10:
        reasons.append(f"拥有{doctor['experience_years']}年丰富临床经验")
    
    if doctor['average_rating'] >= 4.5:
        reasons.append("患者评价非常高")
    
    if doctor['consultation_count'] >= 3000:
        reasons.append("接诊量大，经验丰富")
    
    return "；".join(reasons) if reasons else "基于综合评估推荐"