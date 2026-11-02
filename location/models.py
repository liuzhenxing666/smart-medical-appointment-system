from django.db import models
from django.utils import timezone
import uuid


class Location(models.Model):
    """地理位置信息模型"""
    
    # 位置类型选项
    LOCATION_TYPE_CHOICES = [
        ('hospital', '医院'),
        ('clinic', '诊所'),
        ('pharmacy', '药店'),
        ('user_home', '用户家庭地址'),
        ('user_work', '用户工作地址'),
        ('other', '其他'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 位置基本信息
    name = models.CharField(max_length=200, verbose_name='位置名称')
    address = models.TextField(verbose_name='详细地址')
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES, verbose_name='位置类型')
    
    # 地理坐标
    latitude = models.FloatField(verbose_name='纬度')
    longitude = models.FloatField(verbose_name='经度')
    
    # 行政区划信息
    province = models.CharField(max_length=50, verbose_name='省份', blank=True)
    city = models.CharField(max_length=50, verbose_name='城市', blank=True)
    district = models.CharField(max_length=50, verbose_name='区县', blank=True)
    street = models.CharField(max_length=100, verbose_name='街道', blank=True)
    
    # 联系信息
    phone = models.CharField(max_length=20, verbose_name='联系电话', blank=True)
    contact_person = models.CharField(max_length=50, verbose_name='联系人', blank=True)
    
    # 附加信息
    description = models.TextField(verbose_name='位置描述', blank=True)
    is_active = models.BooleanField(default=True, verbose_name='是否有效')
    
    # 关联对象
    hospital = models.OneToOneField('hospitals.Hospital', on_delete=models.CASCADE, null=True, blank=True, verbose_name='关联医院')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, null=True, blank=True, verbose_name='关联用户')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '地理位置信息'
        verbose_name_plural = '地理位置信息'
        ordering = ['name']
        indexes = [
            models.Index(fields=['location_type', 'is_active']),
            models.Index(fields=['province', 'city']),
            models.Index(fields=['latitude', 'longitude']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.address}"
    
    def save(self, *args, **kwargs):
        """保存位置信息"""
        super().save(*args, **kwargs)
    
    @property
    def coordinates(self):
        """返回坐标字符串"""
        return f"{self.latitude},{self.longitude}"
    
    def get_distance_to(self, target_location):
        """计算到目标位置的距离（直线距离）"""
        if not self.latitude or not self.longitude or not target_location.latitude or not target_location.longitude:
            return None
        
        # 使用Haversine公式计算距离（单位：米）
        import math
        
        # 将经纬度转换为弧度
        lat1 = math.radians(self.latitude)
        lon1 = math.radians(self.longitude)
        lat2 = math.radians(target_location.latitude)
        lon2 = math.radians(target_location.longitude)
        
        # Haversine公式
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        # 地球半径（米）
        radius = 6371000
        distance = radius * c
        
        return distance


class RoutePlan(models.Model):
    """路径规划模型"""
    
    # 交通方式选项
    TRANSPORT_MODE_CHOICES = [
        ('driving', '驾车'),
        ('walking', '步行'),
        ('transit', '公共交通'),
        ('bicycling', '骑行'),
    ]
    
    # 规划状态选项
    STATUS_CHOICES = [
        ('pending', '待规划'),
        ('completed', '已完成'),
        ('failed', '规划失败'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 起点和终点
    origin = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='route_origins', verbose_name='起点')
    destination = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='route_destinations', verbose_name='终点')
    
    # 规划信息
    transport_mode = models.CharField(max_length=20, choices=TRANSPORT_MODE_CHOICES, default='driving', verbose_name='交通方式')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='规划状态')
    
    # 路径详情
    distance = models.FloatField(null=True, blank=True, verbose_name='距离（米）')
    duration = models.FloatField(null=True, blank=True, verbose_name='时间（秒）')
    route_polyline = models.TextField(verbose_name='路径折线', blank=True)
    steps = models.JSONField(default=list, verbose_name='详细步骤')
    
    # 费用信息（公共交通）
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='费用')
    
    # 用户信息
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, null=True, blank=True, verbose_name='规划用户')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '路径规划'
        verbose_name_plural = '路径规划'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['origin', 'destination']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['transport_mode', 'status']),
        ]
    
    def __str__(self):
        return f"{self.origin.name} → {self.destination.name} - {self.get_transport_mode_display()}"
    
    @property
    def formatted_distance(self):
        """格式化距离显示"""
        if not self.distance:
            return "未知"
        
        if self.distance < 1000:
            return f"{self.distance:.0f}米"
        else:
            return f"{self.distance/1000:.1f}公里"
    
    @property
    def formatted_duration(self):
        """格式化时间显示"""
        if not self.duration:
            return "未知"
        
        minutes = int(self.duration // 60)
        if minutes < 60:
            return f"{minutes}分钟"
        else:
            hours = minutes // 60
            remaining_minutes = minutes % 60
            if remaining_minutes == 0:
                return f"{hours}小时"
            else:
                return f"{hours}小时{remaining_minutes}分钟"


class SearchHistory(models.Model):
    """搜索历史模型"""
    
    # 搜索类型选项
    SEARCH_TYPE_CHOICES = [
        ('hospital', '医院搜索'),
        ('doctor', '医生搜索'),
        ('location', '位置搜索'),
        ('route', '路径规划'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 搜索信息
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='搜索用户')
    search_type = models.CharField(max_length=20, choices=SEARCH_TYPE_CHOICES, verbose_name='搜索类型')
    search_keyword = models.CharField(max_length=200, verbose_name='搜索关键词')
    
    # 位置信息
    search_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='搜索位置')
    search_radius = models.FloatField(null=True, blank=True, verbose_name='搜索半径（米）')
    
    # 搜索结果
    result_count = models.IntegerField(default=0, verbose_name='结果数量')
    search_results = models.JSONField(default=list, verbose_name='搜索结果')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='搜索时间')
    
    class Meta:
        verbose_name = '搜索历史'
        verbose_name_plural = '搜索历史'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'search_type']),
            models.Index(fields=['search_keyword']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.search_keyword} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class HospitalDistanceCache(models.Model):
    """医院距离缓存模型"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 用户位置和医院位置
    user_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='distance_cache_user', verbose_name='用户位置')
    hospital_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='distance_cache_hospital', verbose_name='医院位置')
    
    # 距离信息
    straight_distance = models.FloatField(verbose_name='直线距离（米）')
    driving_distance = models.FloatField(null=True, blank=True, verbose_name='驾车距离（米）')
    driving_duration = models.FloatField(null=True, blank=True, verbose_name='驾车时间（秒）')
    walking_distance = models.FloatField(null=True, blank=True, verbose_name='步行距离（米）')
    walking_duration = models.FloatField(null=True, blank=True, verbose_name='步行时间（秒）')
    
    # 缓存信息
    is_cached = models.BooleanField(default=False, verbose_name='是否已缓存')
    cached_at = models.DateTimeField(null=True, blank=True, verbose_name='缓存时间')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '医院距离缓存'
        verbose_name_plural = '医院距离缓存'
        unique_together = ['user_location', 'hospital_location']
        indexes = [
            models.Index(fields=['user_location', 'straight_distance']),
            models.Index(fields=['hospital_location']),
            models.Index(fields=['is_cached']),
        ]
    
    def __str__(self):
        return f"{self.user_location.name} → {self.hospital_location.name}"
    
    def update_cache(self, transport_mode, distance, duration):
        """更新缓存信息"""
        if transport_mode == 'driving':
            self.driving_distance = distance
            self.driving_duration = duration
        elif transport_mode == 'walking':
            self.walking_distance = distance
            self.walking_duration = duration
        
        self.is_cached = True
        self.cached_at = timezone.now()
        self.save()


class AreaBoundary(models.Model):
    """区域边界模型"""
    
    # 区域类型选项
    AREA_TYPE_CHOICES = [
        ('city', '城市'),
        ('district', '区县'),
        ('business', '商圈'),
        ('hospital_area', '医院区域'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 区域基本信息
    name = models.CharField(max_length=100, verbose_name='区域名称')
    area_type = models.CharField(max_length=20, choices=AREA_TYPE_CHOICES, verbose_name='区域类型')
    code = models.CharField(max_length=20, unique=True, verbose_name='区域代码')
    
    # 边界坐标（使用JSON存储边界点）
    boundary_coordinates = models.JSONField(default=list, verbose_name='边界坐标')
    
    # 中心点坐标
    center_latitude = models.FloatField(verbose_name='中心点纬度')
    center_longitude = models.FloatField(verbose_name='中心点经度')
    
    # 行政区划信息
    parent_area = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, verbose_name='上级区域')
    level = models.IntegerField(default=0, verbose_name='层级')
    
    # 统计信息
    hospital_count = models.IntegerField(default=0, verbose_name='医院数量')
    population = models.IntegerField(null=True, blank=True, verbose_name='人口数量')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '区域边界'
        verbose_name_plural = '区域边界'
        ordering = ['level', 'name']
        indexes = [
            models.Index(fields=['area_type', 'level']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_area_type_display()})"
    
    def contains_point(self, latitude, longitude):
        """检查点是否在区域内（使用射线法）"""
        if not self.boundary_coordinates:
            return False
        
        # 射线法判断点是否在多边形内
        count = 0
        n = len(self.boundary_coordinates)
        
        for i in range(n):
            j = (i + 1) % n
            
            # 获取边界点坐标
            xi, yi = self.boundary_coordinates[i]
            xj, yj = self.boundary_coordinates[j]
            
            # 检查射线与边的交点
            if ((yi > longitude) != (yj > longitude)) and \
               (latitude < (xj - xi) * (longitude - yi) / (yj - yi) + xi):
                count += 1
        
        return count % 2 == 1
    
    def get_hospitals_in_area(self):
        """获取区域内的医院"""
        from hospitals.models import Hospital
        
        # 获取所有医院
        hospitals = Hospital.objects.all()
        
        # 过滤在区域内的医院
        hospitals_in_area = []
        for hospital in hospitals:
            if hospital.latitude and hospital.longitude:
                if self.contains_point(hospital.latitude, hospital.longitude):
                    hospitals_in_area.append(hospital)
        
        return hospitals_in_area
