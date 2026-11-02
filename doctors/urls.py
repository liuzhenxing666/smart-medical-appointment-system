"""
医生信息管理API路由配置
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

urlpatterns = [
    # 医生列表和创建
    path('', views.DoctorListView.as_view(), name='doctor-list'),
    
    # 医生详情、更新和删除
    path('<uuid:pk>/', views.DoctorDetailView.as_view(), name='doctor-detail'),
    
    # 医生搜索
    path('search/', views.doctor_search, name='doctor-search'),
    
    # 附近医生
    path('nearby/', views.nearby_doctors, name='nearby-doctors'),
    
    # 热门医生推荐
    path('top/', views.top_doctors, name='top-doctors'),
    
    # 医生排班管理
    path('<uuid:doctor_id>/schedules/', views.DoctorScheduleListView.as_view(), name='doctor-schedule-list'),
    path('<uuid:doctor_id>/schedules/<uuid:pk>/', views.DoctorScheduleDetailView.as_view(), name='doctor-schedule-detail'),

    # 医生评价管理
    path('<uuid:doctor_id>/reviews/', views.DoctorReviewListView.as_view(), name='doctor-review-list'),

    # 预约页专用：可预约日期与时段
    path('<uuid:doctor_id>/available_dates/', views.doctor_available_dates, name='doctor-available-dates'),
    path('<uuid:doctor_id>/time_slots/', views.doctor_time_slots, name='doctor-time-slots'),
]

# 医生相关API接口将在这里定义