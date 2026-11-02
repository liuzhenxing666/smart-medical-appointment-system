"""
小程序专用API视图
处理小程序首页数据请求
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from smart_doctor.api_utils import APIResponse, APIExceptionHandler, RequestValidator
from smart_doctor.cache_utils import cached_api
from hospitals.models import Hospital
from doctors.models import Doctor
from recommendation.models import PopularItem


@api_view(['GET'])
@csrf_exempt  # CSRF豁免
@APIExceptionHandler.handle_exception
@cached_api(cache_type='miniprogram_home', timeout=300)  # 5分钟缓存
def home_data(request):
    """小程序首页数据API"""
    
    # 获取查询参数
    latitude = request.GET.get('latitude')
    longitude = request.GET.get('longitude')
    city = request.GET.get('city', '')
    
    # 构建响应数据
    response_data = {
        'banners': get_home_banners(),
        'quick_services': get_quick_services(),
        'nearby_hospitals': get_nearby_hospitals(latitude, longitude, city),
        'popular_hospitals': get_popular_hospitals(),
        'recommended_doctors': get_recommended_doctors(),
        'health_tips': get_health_tips(),
        'timestamp': timezone.now().isoformat()
    }
    
    return APIResponse.success(
        data=response_data,
        message="首页数据获取成功"
    )


def get_home_banners():
    """获取首页轮播图数据"""
    return [
        {
            'id': 1,
            'image': '../../images/banner1.jpg',
            'title': '智能医疗推荐',
            'description': '为您推荐最适合的医院和医生',
            'link': '/pages/hospitals/hospitals'
        },
        {
            'id': 2,
            'image': '../../images/banner2.jpg',
            'title': '在线预约挂号',
            'description': '快速预约，免排队',
            'link': '/pages/appointment/appointment'
        },
        {
            'id': 3,
            'image': '../../images/banner3.jpg',
            'title': '健康咨询服务',
            'description': '专业医生在线解答',
            'link': '/pages/consultation/consultation'
        }
    ]


def get_quick_services():
    """获取快捷服务列表"""
    return [
        {
            'id': 1,
            'icon': '🏥',
            'title': '找医院',
            'description': '附近医院',
            'link': '/pages/hospitals/hospitals'
        },
        {
            'id': 2,
            'icon': '👨‍⚕️',
            'title': '找医生',
            'description': '专业医生',
            'link': '/pages/doctors/doctors'
        },
        {
            'id': 3,
            'icon': '📅',
            'title': '预约挂号',
            'description': '在线预约',
            'link': '/pages/appointment/appointment'
        },
        {
            'id': 4,
            'icon': '💬',
            'title': '健康咨询',
            'description': '在线咨询',
            'link': '/pages/consultation/consultation'
        }
    ]


def get_nearby_hospitals(latitude, longitude, city):
    """获取附近医院列表"""
    
    # 基础查询条件
    hospitals = Hospital.objects.filter(is_active=True)
    
    # 如果有城市信息，按城市过滤
    if city:
        hospitals = hospitals.filter(city__icontains=city)
    
    # 限制返回数量
    hospitals = hospitals[:10]
    
    hospital_data = []
    for hospital in hospitals:
        # 获取医院主图
        primary_image = hospital.images.filter(is_primary=True).first()
        # 将Django图片路径转换为小程序可用的URL格式
        if primary_image and primary_image.image:
            # 构建完整的图片URL（使用相对路径，由前端处理完整URL）
            image_url = primary_image.image.url
        else:
            # 使用小程序本地默认图片
            image_url = '../../images/hospital-default.png'
        
        hospital_data.append({
            'id': hospital.id,
            'name': hospital.name,
            'level': hospital.level,
            'hospital_type': hospital.hospital_type,
            'address': hospital.address,
            'distance': calculate_distance(latitude, longitude, hospital.latitude, hospital.longitude),
            'rating': hospital.average_rating or 0,
            'review_count': hospital.review_count or 0,
            'image': image_url
        })
    
    return hospital_data


def get_popular_hospitals():
    """获取热门医院列表"""
    
    # 从热门项目表中获取热门医院
    popular_hospitals = PopularItem.objects.filter(
        item_type='hospital',
        time_period='monthly'
    ).order_by('-popularity_score')[:8]
    
    hospital_data = []
    for popular in popular_hospitals:
        try:
            hospital = Hospital.objects.get(id=popular.item_id, is_active=True)
            # 获取医院主图
            primary_image = hospital.images.filter(is_primary=True).first()
            # 将Django图片路径转换为小程序可用的URL格式
            if primary_image and primary_image.image:
                # 构建完整的图片URL（使用相对路径，由前端处理完整URL）
                image_url = primary_image.image.url
            else:
                # 使用小程序本地默认图片
                image_url = '../../images/hospital-default.png'
            
            hospital_data.append({
                'id': hospital.id,
                'name': hospital.name,
                'level': hospital.level,
                'hospital_type': hospital.hospital_type,
                'address': hospital.address,
                'rating': hospital.average_rating or 0,
                'review_count': hospital.review_count or 0,
                'popularity_score': popular.popularity_score,
                'image': image_url
            })
        except Hospital.DoesNotExist:
            continue
    
    # 如果热门医院不足，补充一些高评分医院
    if len(hospital_data) < 8:
        additional_hospitals = Hospital.objects.filter(
            is_active=True,
            average_rating__gte=4.0
        ).order_by('-average_rating')[:8-len(hospital_data)]
        
        for hospital in additional_hospitals:
            # 获取医院主图
            primary_image = hospital.images.filter(is_primary=True).first()
            # 将Django图片路径转换为小程序可用的URL格式
            if primary_image and primary_image.image:
                # 构建完整的图片URL（使用相对路径，由前端处理完整URL）
                image_url = primary_image.image.url
            else:
                # 使用小程序本地默认图片
                image_url = '../../images/hospital-default.png'
            
            hospital_data.append({
                'id': hospital.id,
                'name': hospital.name,
                'level': hospital.level,
                'hospital_type': hospital.hospital_type,
                'address': hospital.address,
                'rating': hospital.average_rating or 0,
                'review_count': hospital.review_count or 0,
                'popularity_score': 0,
                'image': image_url
            })
    
    return hospital_data


def get_recommended_doctors():
    """获取推荐医生列表"""
    
    # 获取高评分医生
    doctors = Doctor.objects.filter(
        is_active=True,
        average_rating__gte=4.5
    ).order_by('-average_rating')[:6]
    
    doctor_data = []
    for doctor in doctors:
        doctor_data.append({
            'id': doctor.id,
            'name': doctor.name,
            'title': doctor.title,
            'department': doctor.department.name if doctor.department else '',
            'hospital': doctor.hospital.name if doctor.hospital else '',
            'rating': doctor.average_rating or 0,
            'review_count': doctor.review_count or 0,
            'specialty': doctor.specialty or '',
            'image': doctor.avatar.url if doctor.avatar else '../../images/doctor-default.png'
        })
    
    return doctor_data


def get_health_tips():
    """获取健康小贴士"""
    return [
        {
            'id': 1,
            'title': '春季养生小贴士',
            'content': '春季气温变化大，注意保暖防感冒',
            'image': '../../images/tip1.jpg'
        },
        {
            'id': 2,
            'title': '饮食健康建议',
            'content': '均衡饮食，多吃蔬菜水果',
            'image': '../../images/tip2.jpg'
        },
        {
            'id': 3,
            'title': '运动健身指南',
            'content': '适量运动，保持身体健康',
            'image': '../../images/tip3.jpg'
        }
    ]


def calculate_distance(lat1, lon1, lat2, lon2):
    """计算两点之间的距离（简化版）"""
    if not all([lat1, lon1, lat2, lon2]):
        return "未知"
    
    try:
        # 简化的距离计算（实际项目中应该使用更精确的算法）
        import math
        
        # 将经纬度转换为弧度
        lat1_rad = math.radians(float(lat1))
        lon1_rad = math.radians(float(lon1))
        lat2_rad = math.radians(float(lat2))
        lon2_rad = math.radians(float(lon2))
        
        # 计算距离（千米）
        dlon = lon2_rad - lon1_rad
        dlat = lat2_rad - lat1_rad
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        distance_km = 6371 * c  # 地球半径6371km
        
        if distance_km < 1:
            return f"{int(distance_km * 1000)}米"
        else:
            return f"{distance_km:.1f}公里"
            
    except (ValueError, TypeError):
        return "未知"