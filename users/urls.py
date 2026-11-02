from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 创建路由器并注册视图集
router = DefaultRouter()
router.register(r'profiles', views.UserProfileViewSet, basename='userprofile')

# API URL配置
urlpatterns = [
    # 普通登录相关
    path('auth/login/', views.login, name='login'),
    
    # 微信登录相关
    path('auth/wechat-login/', views.wechat_login, name='wechat-login'),
    path('auth/refresh-token/', views.refresh_token, name='refresh-token'),
    path('auth/check/', views.check_auth, name='check-auth'),
    path('auth/change-password/', views.change_password, name='change-password'),
    
    # 用户资料管理（通过视图集）
    path('', include(router.urls)),
]