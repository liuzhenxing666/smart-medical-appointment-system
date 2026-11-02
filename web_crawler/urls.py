from django.urls import path
from . import views
from . import views_stats

urlpatterns = [
    # 实时爬取API
    path('hospitals/', views.get_hospitals, name='get_hospitals'),
    path('departments/', views.get_hospital_departments, name='get_hospital_departments'),
    path('doctors/', views.get_department_doctors, name='get_department_doctors'),
    
    # 医生排班API
    path('schedules/', views.get_doctor_schedules, name='get_doctor_schedules'),
    path('weekly-schedules/', views.get_weekly_schedules, name='get_weekly_schedules'),
    path('available-slots/', views.get_available_time_slots, name='get_available_time_slots'),
    
    # 搜索API
    path('search/', views.search_medical_info, name='search_medical_info'),
    path('guizhou-hospital/', views.get_guizhou_hospital_info, name='get_guizhou_hospital_info'),
    
    # 统计和监控API
    path('stats/', views_stats.crawl_stats, name='crawl_stats'),
    path('stats/hospital/<str:hospital_name>/', views_stats.hospital_detail_stats, name='hospital_detail_stats'),
    path('stats/sync-status/', views_stats.sync_status, name='sync_status'),
    path('sync/trigger/', views_stats.trigger_sync, name='trigger_sync'),
]