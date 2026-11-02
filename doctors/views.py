"""
医生信息管理API视图
"""
from django.shortcuts import render
from django.db.models import Q, Avg, Count
from django.utils.decorators import method_decorator
import math
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from smart_doctor.api_utils import APIResponse, APIExceptionHandler, RequestValidator
from smart_doctor.cache_utils import cached_api
from .models import Doctor, DoctorSchedule, DoctorReview
from .serializers import (
    DoctorListSerializer, DoctorDetailSerializer, DoctorCreateUpdateSerializer,
    DoctorScheduleSerializer, DoctorReviewSerializer, ScheduleCreateUpdateSerializer,
    ReviewCreateSerializer, DoctorSearchSerializer
)
from .serializers_param import TopDoctorsParamSerializer, DoctorSearchParamSerializer, NearbyDoctorsParamSerializer
from hospitals.models import Hospital, Department


class DoctorPagination(PageNumberPagination):
    """医生列表分页"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class DoctorListView(generics.ListCreateAPIView):
    """医生列表和创建API"""
    queryset = Doctor.objects.select_related('hospital', 'department').all()
    serializer_class = DoctorListSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = DoctorPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['hospital', 'department', 'specialty', 'title', 'is_available']
    search_fields = ['name', 'specialty', 'description']
    ordering_fields = ['average_rating', 'consultation_fee', 'review_count', 'created_at']
    ordering = ['-average_rating', '-review_count']

    @method_decorator(cached_api(cache_type='doctor_list', timeout=600))  # 10分钟缓存
    def list(self, request, *args, **kwargs):
        """获取医生列表（带缓存）"""
        response = super().list(request, *args, **kwargs)
        return APIResponse.success(response.data, '获取医生列表成功')

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 过滤可用医生
        available_only = self.request.query_params.get('available_only', '').lower()
        if available_only == 'true':
            queryset = queryset.filter(is_available=True)
        
        # 按评分过滤
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            try:
                queryset = queryset.filter(average_rating__gte=float(min_rating))
            except (ValueError, TypeError):
                pass
        
        # 按费用范围过滤
        min_fee = self.request.query_params.get('min_fee')
        max_fee = self.request.query_params.get('max_fee')
        if min_fee:
            try:
                queryset = queryset.filter(consultation_fee__gte=float(min_fee))
            except (ValueError, TypeError):
                pass
        if max_fee:
            try:
                queryset = queryset.filter(consultation_fee__lte=float(max_fee))
            except (ValueError, TypeError):
                pass

        return queryset

    def create(self, request, *args, **kwargs):
        """重写create方法，返回APIResponse格式"""
        response = super().create(request, *args, **kwargs)
        return APIResponse.success(response.data, '创建医生成功', status_code=201)

    def perform_create(self, serializer):
        # 只有管理员可以创建医生信息
        if not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('只有管理员可以创建医生信息')
        serializer.save()


class DoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    """医生详情、更新和删除API"""
    queryset = Doctor.objects.select_related('hospital', 'department').all()
    serializer_class = DoctorDetailSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @method_decorator(cached_api(cache_type='doctor_detail', timeout=1800))  # 30分钟缓存
    def retrieve(self, request, *args, **kwargs):
        """获取医生详情（带缓存）"""
        response = super().retrieve(request, *args, **kwargs)
        return APIResponse.success(response.data, '获取医生详情成功')

    def update(self, request, *args, **kwargs):
        """重写update方法，返回APIResponse格式"""
        response = super().update(request, *args, **kwargs)
        return APIResponse.success(response.data, '更新医生信息成功')

    def destroy(self, request, *args, **kwargs):
        """重写destroy方法，返回APIResponse格式"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return APIResponse.success('删除医生信息成功')

    def perform_update(self, serializer):
        # 只有管理员可以更新医生信息
        if not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('只有管理员可以更新医生信息')
        serializer.save()

    def perform_destroy(self, instance):
        # 只有管理员可以删除医生信息
        if not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('只有管理员可以删除医生信息')
        instance.delete()


class DoctorScheduleListView(generics.ListCreateAPIView):
    """医生排班列表和创建API"""
    queryset = DoctorSchedule.objects.select_related('doctor').all()
    serializer_class = DoctorScheduleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = DoctorPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor', 'weekday', 'is_available']
    ordering_fields = ['start_time', 'end_time', 'created_at']
    ordering = ['weekday', 'start_time']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 按URL路径中的医生ID过滤
        doctor_id = self.kwargs.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        # 按查询参数中的医生ID过滤（备用）
        query_doctor_id = self.request.query_params.get('doctor_id')
        if query_doctor_id:
            queryset = queryset.filter(doctor_id=query_doctor_id)
        
        # 按日期过滤
        date = self.request.query_params.get('date')
        if date:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date, '%Y-%m-%d').date()
                weekday = target_date.weekday()  # 0=周一, 6=周日
                queryset = queryset.filter(weekday=weekday)
            except (ValueError, TypeError):
                pass
        
        # 只显示可用的排班
        available_only = self.request.query_params.get('available_only', '').lower()
        if available_only == 'true':
            queryset = queryset.filter(is_available=True)
        
        return queryset

    def list(self, request, *args, **kwargs):
        """重写list方法，返回APIResponse格式"""
        response = super().list(request, *args, **kwargs)
        return APIResponse.success(response.data, '获取医生排班列表成功')

    def create(self, request, *args, **kwargs):
        """重写create方法，返回APIResponse格式"""
        response = super().create(request, *args, **kwargs)
        return APIResponse.success(response.data, '创建医生排班成功', status_code=201)

    def perform_create(self, serializer):
        # 只有管理员可以创建医生排班
        if not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('只有管理员可以创建医生排班')
        serializer.save()


class DoctorScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """医生排班详情、更新和删除API"""
    serializer_class = DoctorScheduleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'pk'

    def get_queryset(self):
        doctor_id = self.kwargs['doctor_id']
        return DoctorSchedule.objects.filter(doctor_id=doctor_id)

    def retrieve(self, request, *args, **kwargs):
        """重写retrieve方法，返回APIResponse格式"""
        response = super().retrieve(request, *args, **kwargs)
        return APIResponse.success(response.data, '获取医生排班详情成功')

    def update(self, request, *args, **kwargs):
        """重写update方法，返回APIResponse格式"""
        response = super().update(request, *args, **kwargs)
        return APIResponse.success(response.data, '更新医生排班成功')

    def destroy(self, request, *args, **kwargs):
        """重写destroy方法，返回APIResponse格式"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return APIResponse.success('删除医生排班成功')

    def perform_update(self, serializer):
        # 只有管理员或医生本人可以更新排班
        doctor = self.get_object().doctor
        if not (self.request.user.is_staff or self.request.user == doctor.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('只有管理员或医生本人可以更新排班')
        serializer.save()

    def perform_destroy(self, instance):
        # 只有管理员或医生本人可以删除排班
        doctor = instance.doctor
        if not (self.request.user.is_staff or self.request.user == doctor.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('只有管理员或医生本人可以删除排班')
        instance.delete()


class DoctorReviewListView(generics.ListCreateAPIView):
    """医生评价列表和创建API"""
    queryset = DoctorReview.objects.select_related('doctor', 'user').all()
    serializer_class = DoctorReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = DoctorPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 按医生ID过滤
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        # 按评分范围过滤
        min_rating = self.request.query_params.get('min_rating')
        max_rating = self.request.query_params.get('max_rating')
        if min_rating:
            try:
                queryset = queryset.filter(average_rating__gte=float(min_rating))
            except (ValueError, TypeError):
                pass
        if max_rating:
            try:
                queryset = queryset.filter(average_rating__lte=float(max_rating))
            except (ValueError, TypeError):
                pass

        # 只显示已审核的评价
        approved_only = self.request.query_params.get('approved_only', '').lower()
        if approved_only == 'true':
            queryset = queryset.filter(is_approved=True)
        
        return queryset

    def list(self, request, *args, **kwargs):
        """重写list方法，返回APIResponse格式"""
        response = super().list(request, *args, **kwargs)
        return APIResponse.success(response.data, '获取医生评价列表成功')

    def create(self, request, *args, **kwargs):
        """重写create方法，返回APIResponse格式"""
        response = super().create(request, *args, **kwargs)
        return APIResponse.success('创建医生评价成功', response.data, status_code=201)

    def perform_create(self, serializer):
        # 从URL参数获取医生ID
        doctor_id = self.kwargs.get('doctor_id')
        # 检查是否已经评价过该医生
        if DoctorReview.objects.filter(user=self.request.user, doctor_id=doctor_id).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError('您已经评价过该医生')
        
        serializer.save(user=self.request.user, doctor_id=doctor_id)


@APIExceptionHandler.handle_exception
@cached_api(cache_type='doctor_search', timeout=300)  # 5分钟缓存
def doctor_search(request):
    """医生搜索API"""
    # 校验请求方法
    if request.method != 'GET':
        return APIResponse.method_not_allowed('只支持GET请求')
    
    try:
        # 验证请求参数
        query_params = RequestValidator.validate_request_data(
            DoctorSearchParamSerializer, request.GET.dict()
        )
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    query = query_params.get('q', '')
    specialty = query_params.get('specialty', '')
    hospital_id = query_params.get('hospital_id')
    department_id = query_params.get('department_id')
    hospital_level = query_params.get('hospital_level', '')
    doctor_title = query_params.get('doctor_title', '')
    min_rating = query_params.get('min_rating')
    max_fee = query_params.get('max_fee')
    city = query_params.get('city', '')
    district = query_params.get('district', '')
    sort_by = query_params.get('sort_by', 'rating')
    sort_order = query_params.get('sort_order', 'desc')
    
    queryset = Doctor.objects.select_related('hospital', 'department').filter(
        is_available=True
    )
    
    if query:
        queryset = queryset.filter(
            Q(name__icontains=query) |
            Q(specialty__icontains=query) |
            Q(expertise__icontains=query)
        )
    
    if specialty:
        queryset = queryset.filter(specialty__icontains=specialty)
    
    if hospital_id:
        queryset = queryset.filter(hospital_id=hospital_id)
    
    if department_id:
        queryset = queryset.filter(department_id=department_id)
    
    if hospital_level:
        queryset = queryset.filter(hospital__level=hospital_level)
    
    if doctor_title:
        queryset = queryset.filter(title=doctor_title)
    
    if min_rating:
        queryset = queryset.filter(average_rating__gte=min_rating)
    
    if max_fee:
        queryset = queryset.filter(consultation_fee__lte=max_fee)
    
    if city:
        queryset = queryset.filter(hospital__city=city)
    
    if district:
        queryset = queryset.filter(hospital__district=district)
    
    # 排序逻辑
    sort_mapping = {
        'rating': 'average_rating',
        'review_count': 'review_count',
        'fee': 'consultation_fee',
        'appointment_count': 'appointment_count',
        'name': 'name'
    }
    
    sort_field = sort_mapping.get(sort_by, 'average_rating')
    if sort_order == 'desc':
        sort_field = f'-{sort_field}'
    
    queryset = queryset.order_by(sort_field)

    serializer = DoctorSearchSerializer(queryset, many=True)
    return APIResponse.success(serializer.data, '搜索成功')


@APIExceptionHandler.handle_exception
@cached_api(cache_type='nearby_doctors', timeout=180)  # 3分钟缓存，地理位置变化较快
def nearby_doctors(request):
    """附近医生查询API"""
    # 校验请求方法
    if request.method != 'GET':
        return APIResponse.method_not_allowed('只支持GET请求')
    
    try:
        # 验证请求参数
        query_params = RequestValidator.validate_request_data(
            NearbyDoctorsParamSerializer, request.GET.dict()
        )
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    user_lat = query_params['lat']
    user_lng = query_params['lng']
    radius_km = query_params['radius']
    
    # 获取所有医院
    all_hospitals = Hospital.objects.all()
    
    # 计算距离并筛选附近医院
    nearby_hospital_ids = []
    for hospital in all_hospitals:
        if hospital.latitude and hospital.longitude:
            # 使用Haversine公式计算距离
            distance = calculate_distance(
                user_lat, user_lng, 
                hospital.latitude, hospital.longitude
            )
            if distance <= radius_km:
                nearby_hospital_ids.append(hospital.id)
    
    # 查询附近医院中的医生
    doctors = Doctor.objects.filter(
        hospital_id__in=nearby_hospital_ids,
        is_available=True
    ).select_related('hospital', 'department').order_by('-average_rating', '-review_count')
    
    serializer = DoctorSearchSerializer(doctors, many=True)
    return APIResponse.success('查询成功', serializer.data)


def calculate_distance(lat1, lon1, lat2, lon2):
    """计算两个经纬度之间的距离（公里）"""
    # 将角度转换为弧度
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine公式
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # 地球半径（公里）
    
    return c * r


@APIExceptionHandler.handle_exception
@cached_api(cache_type='top_doctors', timeout=600)  # 10分钟缓存，热门医生数据变化较慢
def top_doctors(request):
    """热门医生推荐API"""
    # 校验请求方法
    if request.method != 'GET':
        return APIResponse.method_not_allowed('只支持GET请求')
    
    try:
        # 验证请求参数
        query_params = RequestValidator.validate_request_data(
            TopDoctorsParamSerializer, request.GET.dict()
        )
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    limit = query_params['limit']
    
    doctors = Doctor.objects.filter(
        is_available=True,
        average_rating__gte=4.0,
        review_count__gte=5
    ).select_related('hospital', 'department').order_by(
        '-average_rating', '-review_count'
    )[:limit]

    serializer = DoctorSearchSerializer(doctors, many=True)
    return APIResponse.success(serializer.data, '查询成功')


# 时段类型对应的代表时间（用于 appointment_time 字段展示）
PERIOD_DEFAULT_TIME = {
    'morning': '09:00',
    'afternoon': '15:00',
    'evening': '19:00',
    'full_day': '09:00',
}


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def doctor_available_dates(request, doctor_id):
    """
    获取医生未来30天内可预约的日期列表
    响应: {'doctor_id': ..., 'dates': ['YYYY-MM-DD', ...]}
    """
    from datetime import timedelta
    from django.utils import timezone as dj_timezone
    from django.http import JsonResponse

    if not Doctor.objects.filter(id=doctor_id, is_available=True).exists():
        return JsonResponse({'doctor_id': str(doctor_id), 'dates': []})

    weekdays = set(
        DoctorSchedule.objects.filter(
            doctor_id=doctor_id, is_available=True
        ).values_list('weekday', flat=True)
    )

    today = dj_timezone.localdate()
    dates = []
    for i in range(1, 31):
        day = today + timedelta(days=i)
        if day.weekday() in weekdays:
            dates.append(day.isoformat())

    return JsonResponse({'doctor_id': str(doctor_id), 'dates': dates})


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def doctor_time_slots(request, doctor_id):
    """
    获取医生指定日期的可预约时段
    参数: ?date=YYYY-MM-DD
    响应: {'date': ..., 'time_slots': [{'time','period','available','available_count'}]}
    """
    from datetime import datetime, time as dtime
    from django.http import JsonResponse

    date_str = request.GET.get('date')
    if not date_str:
        return JsonResponse({'date': None, 'time_slots': []})
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'date': date_str, 'time_slots': []})

    schedules = DoctorSchedule.objects.filter(
        doctor_id=doctor_id, weekday=target_date.weekday(), is_available=True
    )

    time_slots = []
    for s in schedules:
        remaining = max(0, s.max_appointments - s.current_appointments)
        # 全天排班拆分为上午、下午两个可约时段
        periods = (
            [('morning', s.start_time), ('afternoon', dtime(14, 0))]
            if s.time_slot == 'full_day'
            else [(s.time_slot, s.start_time)]
        )
        for period, start in periods:
            time_slots.append({
                'time': start.strftime('%H:%M'),
                'period': period,
                'available': remaining > 0,
                'available_count': remaining,
            })

    time_slots.sort(key=lambda x: x['time'])
    return JsonResponse({'date': date_str, 'time_slots': time_slots})
