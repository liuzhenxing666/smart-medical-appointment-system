from django.contrib import admin
from django.utils.html import format_html
from .models import Hospital, Department, HospitalImage, HospitalReview


class HospitalImageInline(admin.TabularInline):
    """医院图片内联显示"""
    model = HospitalImage
    extra = 1
    fields = ['image', 'description', 'is_primary', 'created_at']
    readonly_fields = ['created_at']


class HospitalReviewInline(admin.TabularInline):
    """医院评价内联显示"""
    model = HospitalReview
    extra = 0
    fields = ['user', 'average_rating', 'comment', 'created_at']
    readonly_fields = ['created_at']
    can_delete = False


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    """医院管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'name', 'hospital_type', 'level', 'city', 
        'average_rating', 'review_count', 'is_active', 'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['name', 'city', 'address', 'phone']
    
    # 过滤器
    list_filter = [
        'hospital_type', 'level', 'city', 'is_active', 
        'average_rating', 'created_at', 'updated_at'
    ]
    
    # 可编辑的字段
    list_editable = ['is_active', 'hospital_type']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 内联显示
    inlines = [HospitalImageInline, HospitalReviewInline]
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('name', 'hospital_type', 'level', 'description')
        }),
        ('联系信息', {
            'fields': ('phone', 'email', 'website', 'address', 'city')
        }),
        ('位置信息', {
            'fields': ('latitude', 'longitude')
        }),
        ('服务信息', {
            'fields': ('specialties', 'facilities')
        }),
        ('统计信息', {
            'fields': ('average_rating', 'review_count', 'total_doctors', 'total_beds')
        }),
        ('状态信息', {
            'fields': ('is_active', 'is_verified', 'created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 'review_count']
    
    # 自定义方法
    def rating_display(self, obj):
        """显示评分星级"""
        if obj.average_rating:
            stars = '★' * int(obj.average_rating) + '☆' * (5 - int(obj.average_rating))
            return f"{stars} ({obj.average_rating:.1f})"
        return "暂无评分"
    rating_display.short_description = '评分'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).prefetch_related('images', 'reviews')


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """科室管理界面"""
    
    # 列表页显示的字段
    list_display = ['name', 'hospital', 'department_type', 'is_active', 'created_at']
    
    # 可搜索的字段
    search_fields = ['name', 'hospital__name', 'description']
    
    # 过滤器
    list_filter = ['department_type', 'is_active', 'hospital', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_active']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['hospital', 'name']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('name', 'hospital', 'department_type', 'description')
        }),
        ('位置信息', {
            'fields': ('floor', 'room_number')
        }),
        ('服务信息', {
            'fields': ('appointment_hours', 'total_doctors')
        }),
        ('状态信息', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('hospital')


@admin.register(HospitalImage)
class HospitalImageAdmin(admin.ModelAdmin):
    """医院图片管理界面"""
    
    # 列表页显示的字段
    list_display = ['hospital', 'image_preview', 'is_primary', 'created_at']
    
    # 可搜索的字段
    search_fields = ['hospital__name', 'description']
    
    # 过滤器
    list_filter = ['is_primary', 'hospital', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_primary']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 自定义方法
    def image_preview(self, obj):
        """显示图片预览"""
        if obj.image:
            return format_html('<img src="{}" width="50" height="50" />', obj.image.url)
        return "无图片"
    image_preview.short_description = '图片预览'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('hospital')


@admin.register(HospitalReview)
class HospitalReviewAdmin(admin.ModelAdmin):
    """医院评价管理界面"""
    
    # 列表页显示的字段
    list_display = ['hospital', 'user', 'rating', 'service_rating', 'environment_rating', 'medical_rating', 'is_approved', 'created_at']
    
    # 可搜索的字段
    search_fields = ['hospital__name', 'user__username', 'title', 'content']
    
    # 过滤器
    list_filter = ['rating', 'is_approved', 'hospital', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_approved']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('hospital', 'user', 'average_rating')
        }),
        ('评价内容', {
            'fields': ('title', 'content')
        }),
        ('评价维度', {
            'fields': ('service_rating', 'environment_rating', 'medical_rating')
        }),
        ('状态信息', {
            'fields': ('is_anonymous', 'is_approved', 'created_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('hospital', 'user')
