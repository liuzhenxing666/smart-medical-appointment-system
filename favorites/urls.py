from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UserFavoriteViewSet

# 创建路由器并注册视图集
router = DefaultRouter()
router.register(r'', UserFavoriteViewSet, basename='userfavorite')

urlpatterns = router.urls