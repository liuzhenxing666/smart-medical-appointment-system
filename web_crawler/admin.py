"""
Web Crawler 管理界面
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import HospitalCrawlData, CrawlLog, DoctorCrawlData


@admin.register(HospitalCrawlData)
class HospitalCrawlDataAdmin(admin.ModelAdmin):
    """医院爬虫数据管理"""
    
    list_display = [
        'hospital_name', 
        'city', 
        'crawl_time', 
        'is_active', 
        'doctor_count', 
        'department_count',
        'admin_actions'
    ]
    
    list_filter = ['city', 'is_active', 'crawl_time']
    search_fields = ['hospital_name', 'city']
    readonly_fields = ['crawl_time']
    
    fieldsets = (
        ('基本信息', {
            'fields': ('hospital_name', 'city', 'hospital_level', 'address', 'phone')
        }),
        ('科室信息', {
            'fields': ('departments',)
        }),
        ('医生信息', {
            'fields': ('doctors',)
        }),
        ('爬虫信息', {
            'fields': ('source_url', 'crawl_time', 'is_active')
        }),
    )
    
    def doctor_count(self, obj):
        """医生数量统计"""
        if obj.doctors:
            return len(obj.doctors)
        return 0
    doctor_count.short_description = '医生数量'
    
    def department_count(self, obj):
        """科室数量统计"""
        if obj.departments:
            return len(obj.departments)
        return 0
    department_count.short_description = '科室数量'
    
    def admin_actions(self, obj):
        """操作按钮"""
        return format_html(
            '<a href="/api/web-crawler/sync-hospital/?hospital={}" class="button" target="_blank">同步数据</a> '
            '<a href="/api/web-crawler/schedules/?hospital={}" class="button" target="_blank">查看排班</a>',
            obj.hospital_name, obj.hospital_name
        )
    admin_actions.short_description = '操作'
    
    admin_actions.allow_tags = True


@admin.register(DoctorCrawlData)
class DoctorCrawlDataAdmin(admin.ModelAdmin):
    """医生爬虫数据管理"""
    
    list_display = [
        'name', 
        'hospital', 
        'department', 
        'title', 
        'crawl_time', 
        'is_active',
        'schedule_count'
    ]
    
    list_filter = ['hospital', 'department', 'title', 'is_active']
    search_fields = ['name', 'hospital', 'department']
    readonly_fields = ['crawl_time']
    
    fieldsets = (
        ('基本信息', {
            'fields': ('name', 'hospital', 'department', 'title', 'specialty', 'experience')
        }),
        ('爬虫信息', {
            'fields': ('source_url', 'crawl_time', 'is_active')
        }),
    )
    
    def schedule_count(self, obj):
        """排班数量统计"""
        # DoctorCrawlData模型中没有schedules字段，这里返回0
        return 0
    schedule_count.short_description = '排班数量'


@admin.register(CrawlLog)
class CrawlLogAdmin(admin.ModelAdmin):
    """爬虫日志管理"""
    
    list_display = [
        'hospital_name', 
        'log_type', 
        'level', 
        'created_at', 
        'execution_time', 
        'records_processed',
        'message'
    ]
    
    list_filter = ['log_type', 'level', 'created_at']
    search_fields = ['hospital_name', 'message', 'doctor_name']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('基本信息', {
            'fields': ('log_type', 'level', 'hospital_name', 'doctor_name')
        }),
        ('日志内容', {
            'fields': ('message',)
        }),
        ('执行信息', {
            'fields': ('execution_time', 'records_processed', 'created_at')
        }),
    )
    
    def has_add_permission(self, request):
        """禁止手动添加日志"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """禁止修改日志"""
        return False


# 自定义管理命令链接
class WebCrawlerAdminSite(admin.AdminSite):
    """自定义Web Crawler管理站点"""
    
    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        
        custom_urls = [
            path('sync-all-hospitals/', self.admin_view(self.sync_all_hospitals), name='sync-all-hospitals'),
            path('cleanup-old-data/', self.admin_view(self.cleanup_old_data), name='cleanup-old-data'),
        ]
        
        return custom_urls + urls
    
    def sync_all_hospitals(self, request):
        """同步所有医院数据"""
        from django.contrib import messages
        from django.shortcuts import redirect
        from .sync_services import data_sync_service
        
        try:
            success_count, total_count = data_sync_service.sync_all_hospitals("贵阳")
            messages.success(request, f"成功同步 {success_count}/{total_count} 家医院数据")
        except Exception as e:
            messages.error(request, f"同步失败: {str(e)}")
        
        return redirect('admin:web_crawler_hospitalcrawldata_changelist')
    
    def cleanup_old_data(self, request):
        """清理过期数据"""
        from django.contrib import messages
        from django.shortcuts import redirect
        from .sync_services import data_sync_service
        
        try:
            cleaned_count = data_sync_service.cleanup_old_data(30)
            messages.success(request, f"成功清理 {cleaned_count} 条过期数据")
        except Exception as e:
            messages.error(request, f"清理失败: {str(e)}")
        
        return redirect('admin:web_crawler_hospitalcrawldata_changelist')


# 替换默认的admin site
# admin.site = WebCrawlerAdminSite(name='web_crawler_admin')