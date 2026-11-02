from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """自定义用户管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'username', 'email', 'phone', 'preferred_hospital_type', 
        'appointment_count', 'is_active', 'date_joined'
    ]
    
    # 可搜索的字段
    search_fields = ['username', 'email', 'phone', 'wechat_openid']
    
    # 过滤器
    list_filter = [
        'preferred_hospital_type', 'is_active', 'is_staff', 
        'date_joined', 'last_login'
    ]
    
    # 可编辑的字段
    list_editable = ['is_active', 'preferred_hospital_type']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-date_joined']
    
    # 字段分组显示
    fieldsets = UserAdmin.fieldsets + (
        ('微信信息', {
            'fields': ('wechat_openid', 'wechat_unionid')
        }),
        ('联系信息', {
            'fields': ('phone', 'avatar')
        }),
        ('位置信息', {
            'fields': ('latitude', 'longitude', 'location_updated_at')
        }),
        ('偏好设置', {
            'fields': ('preferred_hospital_type',)
        }),
        ('统计信息', {
            'fields': ('appointment_count', 'last_appointment_at')
        }),
    )
    
    # 添加用户时的字段
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('联系信息', {
            'fields': ('phone',)
        }),
    )
    
    # 只读字段
    readonly_fields = ['date_joined', 'last_login', 'appointment_count', 'location_updated_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related()
    
    def appointment_stats(self, obj):
        """显示预约统计"""
        return f"总预约: {obj.appointment_count}, 最后预约: {obj.last_appointment_at}"
    appointment_stats.short_description = '预约统计'
