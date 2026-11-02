"""
医院信息管理API视图
"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
import math
from .models import Hospital, Department, HospitalImage, HospitalReview
from .serializers import (
    HospitalListSerializer, HospitalDetailSerializer, HospitalCreateUpdateSerializer,
    DepartmentSerializer, HospitalImageSerializer, HospitalReviewSerializer,
    HospitalSearchSerializer, NearbyHospitalSearchSerializer
)
from smart_doctor.cache_utils import cached_api
from smart_doctor.api_utils import APIResponse


from django.utils.decorators import method_decorator

class HospitalListView(generics.ListCreateAPIView):
    """医院列表和创建API"""
    
    queryset = Hospital.objects.filter(is_active=True)
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city', 'district', 'level', 'hospital_type']
    search_fields = ['name', 'description', 'specialties']
    ordering_fields = ['average_rating', 'review_count', 'total_doctors', 'created_at']
    ordering = ['-average_rating']
    
    @method_decorator(cached_api(cache_type='hospital_list', timeout=600))  # 10分钟缓存
    def list(self, request, *args, **kwargs):
        """获取医院列表（带缓存）"""
        response = super().list(request, *args, **kwargs)
        # 将DRF分页响应转换为前端期望的格式
        return APIResponse.success(response.data, '获取医院列表成功')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return HospitalCreateUpdateSerializer
        return HospitalListSerializer
    
    def create(self, request, *args, **kwargs):
        """重写create方法，返回APIResponse格式"""
        response = super().create(request, *args, **kwargs)
        return APIResponse.success(response.data, '创建医院成功', status_code=201)
    
    def perform_create(self, serializer):
        """创建医院时设置默认值"""
        serializer.save(is_verified=False)


class HospitalDetailView(generics.RetrieveUpdateDestroyAPIView):
    """医院详情、更新和删除API"""
    
    queryset = Hospital.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    @method_decorator(cached_api(cache_type='hospital_detail', timeout=1800))  # 30分钟缓存
    def retrieve(self, request, *args, **kwargs):
        """获取医院详情（带缓存）"""
        response = super().retrieve(request, *args, **kwargs)
        return APIResponse.success(response.data, '获取医院详情成功')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return HospitalCreateUpdateSerializer
        return HospitalDetailSerializer
    
    def update(self, request, *args, **kwargs):
        """重写update方法，返回APIResponse格式"""
        response = super().update(request, *args, **kwargs)
        return APIResponse.success(response.data, '更新医院信息成功')
    
    def destroy(self, request, *args, **kwargs):
        """重写destroy方法，返回APIResponse格式"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return APIResponse.success('删除医院信息成功')
    
    def perform_destroy(self, instance):
        """软删除医院"""
        instance.is_active = False
        instance.save()


class DepartmentListView(generics.ListCreateAPIView):
    """科室列表和创建API"""
    
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """根据医院ID过滤科室"""
        hospital_id = self.kwargs.get('hospital_id')
        return Department.objects.filter(hospital_id=hospital_id, is_active=True)
    
    def perform_create(self, serializer):
        """创建科室时关联医院"""
        hospital_id = self.kwargs.get('hospital_id')
        hospital = Hospital.objects.get(id=hospital_id)
        serializer.save(hospital=hospital)


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """科室详情、更新和删除API"""
    
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """根据医院ID过滤科室"""
        hospital_id = self.kwargs.get('hospital_id')
        return Department.objects.filter(hospital_id=hospital_id)
    
    def perform_destroy(self, instance):
        """软删除科室"""
        instance.is_active = False
        instance.save()


class HospitalReviewListView(generics.ListCreateAPIView):
    """医院评价列表和创建API"""
    
    serializer_class = HospitalReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """根据医院ID过滤评价"""
        hospital_id = self.kwargs.get('hospital_id')
        return HospitalReview.objects.filter(hospital_id=hospital_id)
    
    def perform_create(self, serializer):
        """创建评价时关联医院和用户"""
        hospital_id = self.kwargs.get('hospital_id')
        hospital = Hospital.objects.get(id=hospital_id)
        serializer.save(hospital=hospital, user=self.request.user)


from smart_doctor.api_utils import APIResponse, APIExceptionHandler, RequestValidator
from smart_doctor.cache_utils import cached_api

@APIExceptionHandler.handle_exception
@cached_api(cache_type='hospital_search', timeout=300)  # 5分钟缓存
def hospital_search(request):
    """医院搜索API"""
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    try:
        validated_data = RequestValidator.validate_request_data(
            HospitalSearchSerializer, 
            request.GET
        )
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    # 构建搜索条件
    query = Q(is_active=True)
    
    if validated_data.get('name'):
        query &= Q(name__icontains=validated_data['name'])
    
    if validated_data.get('city'):
        query &= Q(city__icontains=validated_data['city'])
    
    if validated_data.get('district'):
        query &= Q(district__icontains=validated_data['district'])
    
    if validated_data.get('level'):
        query &= Q(level=validated_data['level'])
    
    if validated_data.get('hospital_type'):
        query &= Q(hospital_type=validated_data['hospital_type'])
    
    # 执行搜索
    hospitals = Hospital.objects.filter(query)
    
    if not hospitals.exists():
        return APIResponse.success(
            data={
                'count': 0,
                'results': [],
                'filters': validated_data
            },
            message="未找到符合条件的医院"
        )
    
    serializer = HospitalListSerializer(hospitals, many=True)
    
    return APIResponse.success(
        data={
            'count': hospitals.count(),
            'results': serializer.data,
            'filters': validated_data
        },
        message="医院搜索成功"
    )


@APIExceptionHandler.handle_exception
@cached_api(cache_type='nearby_hospitals', timeout=180)  # 3分钟缓存，地理位置变化较快
def nearby_hospitals(request):
    """附近医院搜索API"""
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    try:
        validated_data = RequestValidator.validate_request_data(
            NearbyHospitalSearchSerializer, 
            request.GET
        )
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    latitude = validated_data['latitude']
    longitude = validated_data['longitude']
    radius = validated_data.get('radius', 100)  # 默认100公里
    
    # 验证坐标范围
    if not (-90 <= latitude <= 90):
        return APIResponse.validation_error("纬度必须在-90到90之间")
    
    if not (-180 <= longitude <= 180):
        return APIResponse.validation_error("经度必须在-180到180之间")
    
    # 验证半径范围
    if not (0.1 <= radius <= 1000):
        return APIResponse.validation_error("搜索半径必须在0.1到1000公里之间")
    
    # 计算距离并排序（使用简单的地理距离计算）
    try:
        # 获取所有活跃的医院
        hospitals = Hospital.objects.filter(is_active=True)
        
        # 计算每个医院到目标点的距离
        hospitals_with_distance = []
        for hospital in hospitals:
            if hospital.latitude and hospital.longitude:
                # 使用Haversine公式计算距离（公里）
                lat1, lon1 = math.radians(latitude), math.radians(longitude)
                lat2, lon2 = math.radians(hospital.latitude), math.radians(hospital.longitude)
                
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                
                a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
                c = 2 * math.asin(math.sqrt(a))
                distance_km = 6371 * c  # 地球半径6371公里
                
                # 如果距离在搜索半径内，添加到结果
                if distance_km <= radius:
                    hospitals_with_distance.append((hospital, distance_km))
        
        # 按距离排序
        hospitals_with_distance.sort(key=lambda x: x[1])
        hospitals = [hospital for hospital, distance in hospitals_with_distance]
        
    except Exception as e:
        return APIResponse.server_error(f"地理查询失败: {str(e)}")
    
    if not hospitals:
        return APIResponse.success(
            data={
                'count': 0,
                'radius': radius,
                'center': {'latitude': latitude, 'longitude': longitude},
                'results': [],
                'message': f"在{radius}公里范围内未找到医院"
            },
            message="附近医院搜索完成"
        )
    
    serializer = HospitalListSerializer(hospitals, many=True)
    
    return APIResponse.success(
        data={
            'count': len(hospitals),
            'radius': radius,
            'center': {'latitude': latitude, 'longitude': longitude},
            'results': serializer.data
        },
        message="附近医院搜索成功"
    )
