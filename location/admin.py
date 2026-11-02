from django.contrib import admin
from django.utils.html import format_html
from .models import Location, RoutePlan, SearchHistory, HospitalDistanceCache, AreaBoundary


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    """位置信息管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'name', 'address', 'latitude', 'longitude', 'location_type', 
        'is_active', 'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['name', 'address', 'city', 'district']
    
    # 过滤器
    list_filter = [
        'location_type', 'is_active', 'city', 'district', 
        'created_at', 'updated_at'
    ]
    
    # 可编辑的字段
    list_editable = ['is_active']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('name', 'address', 'location_type')
        }),
        ('地理坐标', {
            'fields': ('latitude', 'longitude', 'accuracy')
        }),
        ('行政区域', {
            'fields': ('country', 'province', 'city', 'district', 'street')
        }),
        ('附加信息', {
            'fields': ('description', 'tags', 'is_active')
        }),
        ('状态信息', {
            'fields': ('created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    # 自定义方法
    def coordinates(self, obj):
        """显示坐标信息"""
        return f"{obj.latitude}, {obj.longitude}"
    coordinates.short_description = '坐标'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request)


@admin.register(RoutePlan)
class RoutePlanAdmin(admin.ModelAdmin):
    """路径规划管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'id', 'origin', 'destination', 'transport_mode', 'distance', 'duration', 
        'status', 'created_at', 'updated_at'
    ]
    
    # 可搜索的字段
    search_fields = ['origin__name', 'destination__name']
    
    # 过滤器
    list_filter = [
        'transport_mode', 'status', 'created_at'
    ]
    
    # 可编辑的字段
    list_editable = ['status']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('路径信息', {
            'fields': ['origin', 'destination', 'transport_mode']
        }),
        ('规划结果', {
            'fields': ['distance', 'duration', 'status']
        }),
        ('路径详情', {
            'fields': ['route_polyline', 'steps']
        }),
        ('费用信息', {
            'fields': ['cost']
        }),
        ('用户信息', {
            'fields': ['user']
        }),
        ('时间信息', {
            'fields': ['created_at', 'updated_at']
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    # 自定义方法
    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M:%S') if obj.updated_at else 'N/A'
    updated_at_formatted.short_description = '更新时间'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('origin', 'destination')


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    """搜索历史管理界面"""
    
    # 列表页显示的字段
    list_display = ['id', 'user', 'search_type', 'search_keyword', 'search_location', 'search_radius', 'result_count', 'created_at']
    
    # 可搜索的字段
    search_fields = ['search_keyword', 'user__username']
    
    # 过滤器
    list_filter = ['search_type', 'created_at']
    
    # 可编辑的字段
    list_editable = ['search_type', 'search_keyword', 'search_radius', 'result_count']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ['user', 'search_type', 'search_keyword']
        }),
        ('位置信息', {
            'fields': ['search_location', 'search_radius']
        }),
        ('搜索结果', {
            'fields': ['result_count', 'search_results']
        }),
        ('时间信息', {
            'fields': ['created_at']
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at']
    
    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M:%S') if obj.updated_at else 'N/A'
    updated_at_formatted.short_description = '更新时间'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('user')


@admin.register(HospitalDistanceCache)
class HospitalDistanceCacheAdmin(admin.ModelAdmin):
    """医院距离缓存管理界面"""
    
    # 列表页显示的字段
    list_display = ['id', 'user_location', 'hospital_location', 'straight_distance', 'is_cached', 'created_at', 'updated_at']
    
    # 可搜索的字段
    search_fields = ['user_location__name', 'hospital_location__name']
    
    # 过滤器
    list_filter = ['is_cached', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_cached']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('位置信息', {
            'fields': ['user_location', 'hospital_location']
        }),
        ('距离信息', {
            'fields': ['straight_distance', 'driving_distance', 'driving_duration', 'walking_distance', 'walking_duration']
        }),
        ('缓存状态', {
            'fields': ['is_cached', 'cached_at']
        }),
        ('时间信息', {
            'fields': ['created_at', 'updated_at']
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M:%S') if obj.updated_at else 'N/A'
    updated_at_formatted.short_description = '更新时间'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('user_location', 'hospital_location')


@admin.register(AreaBoundary)
class AreaBoundaryAdmin(admin.ModelAdmin):
    """区域边界管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'name', 'area_type', 'code', 'level', 'hospital_count', 
        'created_at', 'updated_at'
    ]
    
    # 可搜索的字段
    search_fields = ['name', 'code', 'area_type']
    
    # 过滤器
    list_filter = [
        'area_type', 'level', 'created_at', 'updated_at'
    ]
    
    # 可编辑的字段
    list_editable = ['level', 'hospital_count']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['level', 'name']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('name', 'area_type', 'code')
        }),
        ('地理信息', {
            'fields': ('boundary_coordinates', 'center_latitude', 'center_longitude')
        }),
        ('层级关系', {
            'fields': ('parent_area', 'level')
        }),
        ('统计信息', {
            'fields': ('hospital_count', 'population')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request)
