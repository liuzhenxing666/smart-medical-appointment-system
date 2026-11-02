from django.contrib import admin
from django.utils.html import format_html
from .models import Doctor, DoctorSchedule, DoctorReview, DoctorSpecialization


class DoctorScheduleInline(admin.TabularInline):
    """医生排班内联显示"""
    model = DoctorSchedule
    extra = 1
    fields = ['weekday', 'time_slot', 'start_time', 'end_time', 'max_appointments', 'is_available']
    readonly_fields = ['created_at']


class DoctorReviewInline(admin.TabularInline):
    """医生评价内联显示"""
    model = DoctorReview
    extra = 0
    fields = ['user', 'average_rating', 'content', 'created_at']
    readonly_fields = ['created_at']
    can_delete = False


class DoctorSpecializationInline(admin.TabularInline):
    """医生专业特长内联显示"""
    model = DoctorSpecialization
    extra = 1
    fields = ['specialization_name', 'description', 'years_of_experience', 'is_certified']


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    """医生管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'name', 'hospital', 'department', 'title', 'specialty', 
        'average_rating', 'review_count', 'is_active', 'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['name', 'hospital__name', 'department__name', 'specialty']
    
    # 过滤器
    list_filter = [
        'title', 'specialty', 'hospital', 'department', 'is_active', 
        'created_at', 'updated_at'
    ]
    
    # 可编辑的字段
    list_editable = ['is_active', 'title']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 内联显示
    inlines = [DoctorScheduleInline, DoctorReviewInline, DoctorSpecializationInline]
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('name', 'title', 'hospital', 'department', 'avatar')
        }),
        ('专业信息', {
            'fields': ('specialty', 'education', 'experience', 'expertise')
        }),
        ('联系信息', {
            'fields': ('phone', 'email', 'office_location')
        }),
        ('服务信息', {
            'fields': ('consultation_fee', 'consultation_duration', 'languages')
        }),
        ('统计信息', {
            'fields': ('average_rating', 'review_count', 'success_rate')
        }),
        ('状态信息', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 
                      'review_count', 'success_rate']
    
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
        return super().get_queryset(request).select_related('hospital', 'department')


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    """医生排班管理界面"""
    
    # 列表页显示的字段
    list_display = ['doctor', 'weekday', 'time_slot', 'start_time', 'end_time', 'max_appointments', 'is_available']
    
    # 可搜索的字段
    search_fields = ['doctor__name', 'doctor__hospital__name']
    
    # 过滤器
    list_filter = ['weekday', 'is_available', 'doctor', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_available', 'max_appointments']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['doctor', 'weekday', 'start_time']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('doctor', 'weekday', 'time_slot', 'start_time', 'end_time')
        }),
        ('预约设置', {
            'fields': ('max_appointments', 'appointment_interval')
        }),
        ('状态信息', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('doctor')


@admin.register(DoctorReview)
class DoctorReviewAdmin(admin.ModelAdmin):
    """医生评价管理界面"""
    
    # 列表页显示的字段
    list_display = ['doctor', 'user', 'rating', 'created_at', 'is_approved']
    
    # 可搜索的字段
    search_fields = ['doctor__name', 'user__username', 'comment']
    
    # 过滤器
    list_filter = ['rating', 'is_approved', 'doctor', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_approved']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('doctor', 'user', 'average_rating')
        }),
        ('评价内容', {
            'fields': ('title', 'content', 'attitude_rating', 'professional_rating', 'efficiency_rating')
        }),
        ('状态信息', {
            'fields': ('is_approved', 'created_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('doctor', 'user')


@admin.register(DoctorSpecialization)
class DoctorSpecializationAdmin(admin.ModelAdmin):
    """医生专业特长管理界面"""
    
    # 列表页显示的字段
    list_display = ['doctor', 'specialization_name', 'years_of_experience', 'is_certified', 'created_at']
    
    # 可搜索的字段
    search_fields = ['doctor__name', 'specialization_name', 'description']
    
    # 过滤器
    list_filter = ['specialization_name', 'is_certified', 'doctor', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_certified', 'years_of_experience']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['doctor', '-years_of_experience']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('doctor', 'specialization_name', 'years_of_experience')
        }),
        ('认证信息', {
            'fields': ('description', 'is_certified')
        }),
        ('状态信息', {
            'fields': ('created_at',)
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('doctor')
