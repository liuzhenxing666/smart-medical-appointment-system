from django.contrib import admin
from django.utils.html import format_html
from .models import Appointment, AppointmentReminder, AppointmentFeedback, AppointmentStatistics


class AppointmentReminderInline(admin.TabularInline):
    """预约提醒内联显示"""
    model = AppointmentReminder
    extra = 0
    fields = ['reminder_type', 'reminder_time', 'sent_at', 'status']
    readonly_fields = ['sent_at']
    can_delete = False


class AppointmentFeedbackInline(admin.TabularInline):
    """预约反馈内联显示"""
    model = AppointmentFeedback
    extra = 0
    fields = ['rating', 'comment', 'created_at']
    readonly_fields = ['created_at']
    can_delete = False


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    """预约管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'appointment_number', 'user', 'doctor', 'appointment_date', 
        'appointment_time', 'status', 'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['appointment_number', 'user__username', 'doctor__name', 'symptoms']
    
    # 过滤器
    list_filter = [
        'status', 'appointment_date', 'doctor', 'hospital', 
        'created_at', 'updated_at'
    ]
    
    # 可编辑的字段
    list_editable = ['status']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-appointment_date', '-appointment_time']
    
    # 内联显示
    inlines = [AppointmentReminderInline, AppointmentFeedbackInline]
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('appointment_number', 'user', 'doctor', 'hospital')
        }),
        ('预约时间', {
            'fields': ('appointment_date', 'appointment_time', 'duration')
        }),
        ('病情信息', {
            'fields': ('symptoms', 'medical_history', 'current_medications')
        }),
        ('费用信息', {
            'fields': ('consultation_fee', 'payment_status', 'payment_method')
        }),
        ('状态信息', {
            'fields': ('status', 'cancellation_reason', 'created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['appointment_number', 'created_at', 'updated_at']
    
    # 自定义方法
    def appointment_details(self, obj):
        """显示预约详情"""
        return f"{obj.doctor.name} - {obj.appointment_date} {obj.appointment_time}"
    appointment_details.short_description = '预约详情'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('user', 'doctor', 'hospital')


@admin.register(AppointmentReminder)
class AppointmentReminderAdmin(admin.ModelAdmin):
    """预约提醒管理界面"""
    
    # 列表页显示的字段
    list_display = ['appointment', 'reminder_type', 'reminder_time', 'sent_at', 'status']
    
    # 可搜索的字段
    search_fields = ['appointment__appointment_number', 'reminder_type']
    
    # 过滤器
    list_filter = ['reminder_type', 'status', 'appointment', 'sent_at']
    
    # 可编辑的字段
    list_editable = ['status']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-reminder_time']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('appointment', 'reminder_type')
        }),
        ('提醒时间', {
            'fields': ('reminder_time', 'sent_at')
        }),
        ('状态信息', {
            'fields': ('status', 'error_message')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['sent_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('appointment')


@admin.register(AppointmentFeedback)
class AppointmentFeedbackAdmin(admin.ModelAdmin):
    """预约反馈管理界面"""
    
    # 列表页显示的字段
    list_display = ['appointment', 'user', 'satisfaction_rating', 'created_at', 'is_processed']
    
    # 可搜索的字段
    search_fields = ['appointment__appointment_number', 'user__username', 'comment']
    
    # 过滤器
    list_filter = ['satisfaction_rating', 'is_processed', 'appointment', 'created_at']
    
    # 可编辑的字段
    list_editable = ['is_processed']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('appointment', 'user', 'satisfaction_rating')
        }),
        ('反馈内容', {
            'fields': ('comment', 'treatment_effectiveness', 'service_attitude', 'waiting_time')
        }),
        ('状态信息', {
            'fields': ('is_processed', 'created_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('appointment', 'user')


@admin.register(AppointmentStatistics)
class AppointmentStatisticsAdmin(admin.ModelAdmin):
    """预约统计管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'statistic_date', 'total_appointments', 'completed_appointments', 
        'cancelled_appointments', 'success_rate', 'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['statistic_date']
    
    # 过滤器
    list_filter = ['statistic_date', 'created_at']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-statistic_date']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('statistics_date', 'time_period')
        }),
        ('预约统计', {
            'fields': ('total_appointments', 'completed_appointments', 'cancelled_appointments')
        }),
        ('质量统计', {
            'fields': ('average_rating', 'average_waiting_time', 'success_rate')
        }),
        ('收入统计', {
            'fields': ('total_revenue', 'average_revenue_per_appointment')
        }),
        ('状态信息', {
            'fields': ('created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    # 自定义方法
    def completion_rate(self, obj):
        """显示完成率"""
        if obj.total_appointments > 0:
            rate = (obj.completed_appointments / obj.total_appointments) * 100
            return f"{rate:.1f}%"
        return "0%"
    completion_rate.short_description = '完成率'
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request)
