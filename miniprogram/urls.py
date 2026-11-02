"""
小程序专用API路由配置
"""
from django.urls import path, include
from . import views

urlpatterns = [
    # 首页数据
    path('home/', views.home_data, name='miniprogram_home'),
    
    # 认证相关路由（转发到users应用）
    path('', include('users.urls')),
]