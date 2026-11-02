"""
监控系统URL配置
"""

from django.urls import path
from .monitoring_views import (
    MonitoringDashboardAPI,
    MetricsDetailAPI,
    AlertsAPI,
    ThresholdsAPI
)

urlpatterns = [
    # 监控仪表板
    path('dashboard/', MonitoringDashboardAPI.as_view(), name='monitoring_dashboard'),
    
    # 详细指标数据
    path('metrics/', MetricsDetailAPI.as_view(), name='metrics_detail'),
    
    # 告警管理
    path('alerts/', AlertsAPI.as_view(), name='alerts_management'),
    
    # 阈值配置
    path('thresholds/', ThresholdsAPI.as_view(), name='thresholds_management'),
]