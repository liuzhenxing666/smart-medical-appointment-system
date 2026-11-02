"""
医院信息管理API路由配置
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

urlpatterns = [
    # 医院列表和创建
    path('', views.HospitalListView.as_view(), name='hospital-list'),
    
    # 医院详情、更新和删除
    path('<uuid:pk>/', views.HospitalDetailView.as_view(), name='hospital-detail'),
    
    # 医院搜索
    path('search/', views.hospital_search, name='hospital-search'),
    
    # 附近医院
    path('nearby/', views.nearby_hospitals, name='nearby-hospitals'),
    
    # 科室管理
    path('<uuid:hospital_id>/departments/', views.DepartmentListView.as_view(), name='department-list'),
    path('<uuid:hospital_id>/departments/<uuid:pk>/', views.DepartmentDetailView.as_view(), name='department-detail'),
    
    # 医院评价
    path('<uuid:hospital_id>/reviews/', views.HospitalReviewListView.as_view(), name='hospital-review-list'),
]

# 医院相关API接口将在这里定义