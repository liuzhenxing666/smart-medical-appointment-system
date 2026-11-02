"""
URL configuration for smart_doctor project.

智能医生预约挂号系统 - URL配置
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from . import views

urlpatterns = [
    # 首页
    path('', views.home, name='home'),
    
    # 个人中心
    path('profile/', views.profile, name='profile'),
    
    # 医院相关页面
    path('hospital-list/', views.hospital_list, name='hospital-list'),
    path('hospital-detail/<uuid:pk>/', views.hospital_detail, name='hospital-detail'),
    path('doctors/', views.doctor_list, name='doctor-list'),
    path('doctor-detail/<uuid:pk>/', views.doctor_detail, name='doctor-detail'),
    
    # 预约相关页面
    path('appointment-list/', views.appointment_list, name='appointment-list'),
    path('appointment-detail/<uuid:pk>/', views.appointment_detail, name='appointment-detail'),
    path('appointment-search/', views.appointment_search, name='appointment-search'),
    path('appointment-booking/', views.appointment_booking, name='appointment-booking'),
    
    # 管理面板
    path('admin-dashboard/', TemplateView.as_view(template_name='admin_dashboard.html'), name='admin_dashboard'),
    
    # 管理后台
    path('admin/', admin.site.urls),

    # 认证页面（登录/登出）
    path('accounts/', include('django.contrib.auth.urls')),
    
    # API接口
    path('api/users/', include('users.urls')),
    
    # 其他应用API
    path('api/hospitals/', include('hospitals.urls')),
    path('api/doctors/', include('doctors.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/location/', include('location.urls')),
    path('api/recommendation/', include('recommendation.urls')),
    path('api/mini/', include('miniprogram.urls')),
    path('api/user/collections/', include('favorites.urls')),
    path('api/reviews/', include('reviews.urls')),
    
    # Web爬虫API
    path('api/web-crawler/', include('web_crawler.urls')),
    
    # 监控API
    path('api/monitoring/', include('smart_doctor.monitoring_urls')),
]

# 静态文件和媒体文件服务
# 在开发和生产环境下都提供媒体文件服务
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# 开发环境下的静态文件服务
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
