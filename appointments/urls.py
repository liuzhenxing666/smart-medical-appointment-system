"""
预约管理API路由配置
提供预约相关的所有API端点

注意：预约主键为UUID，所有详情类路由由 DefaultRouter 动态生成，
手动注册的 <int:pk> 路由无法匹配 UUID 主键，已移除。
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 创建路由器
router = DefaultRouter()
# 预约主路由：注册在 '' 前缀，列表/详情/confirm/cancel/complete/search/
# statistics/weather 等动态 action 路由全部由路由器自动生成
router.register(r'', views.AppointmentViewSet, basename='appointment')
router.register(r'reminders', views.AppointmentReminderViewSet, basename='reminder')
router.register(r'feedbacks', views.AppointmentFeedbackViewSet, basename='feedback')
# 注册在 stats 前缀，避免与上方预约统计 action 的 /statistics/ 路径冲突
router.register(r'stats', views.AppointmentStatisticsViewSet, basename='statistics')

urlpatterns = [
    # API路由（含预约CRUD与所有动态action）
    path('', include(router.urls)),

    # 预约管理仪表板
    path('dashboard/', views.appointment_dashboard, name='appointment_dashboard'),

    # 独立演示端点
    path('demo-data/',
         views.AppointmentDemoView.as_view(),
         name='appointment-demo-data'),

    # 提醒相关操作
    path('reminders/create/',
         views.AppointmentReminderViewSet.as_view({'post': 'create_reminder'}),
         name='reminder-create'),

    # 反馈相关操作
    path('feedbacks/<uuid:pk>/process/',
         views.AppointmentFeedbackViewSet.as_view({'post': 'process'}),
         name='feedback-process'),

    # 统计相关操作
    path('stats/generate-today/',
         views.AppointmentStatisticsViewSet.as_view({'get': 'generate_today'}),
         name='statistic-generate-today'),
    path('stats/hospital-ranking/',
         views.AppointmentStatisticsViewSet.as_view({'get': 'hospital_ranking'}),
         name='statistic-hospital-ranking'),
    path('stats/doctor-ranking/',
         views.AppointmentStatisticsViewSet.as_view({'get': 'doctor_ranking'}),
         name='statistic-doctor-ranking'),
]
