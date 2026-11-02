"""
监控系统API视图 - 提供监控数据查询接口
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import json

from .monitoring import monitoring_system


class MonitoringDashboardAPI(APIView):
    """监控仪表板API"""
    
    def get(self, request):
        """获取监控仪表板数据"""
        try:
            # 获取最近1小时的指标摘要
            metrics_summary = monitoring_system.get_metrics_summary(hours=1)
            
            # 获取最近24小时的告警
            recent_alerts = monitoring_system.get_alerts(hours=24)
            
            # 计算系统健康度
            health_score = self._calculate_health_score(metrics_summary)
            
            response_data = {
                'success': True,
                'data': {
                    'health_score': health_score,
                    'metrics_summary': metrics_summary,
                    'recent_alerts': recent_alerts,
                    'timestamp': monitoring_system.metrics[-1].timestamp.isoformat() if monitoring_system.metrics else None
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {
                    'code': 'monitoring_error',
                    'message': f'获取监控数据失败: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _calculate_health_score(self, metrics_summary: dict) -> float:
        """计算系统健康度评分（0-100）"""
        if metrics_summary['total_calls'] == 0:
            return 100.0  # 没有调用时认为系统健康
        
        # 基于响应时间评分（权重40%）
        response_time_score = max(0, 100 - (metrics_summary['avg_response_time'] * 10))
        
        # 基于错误率评分（权重40%）
        error_rate_score = max(0, 100 - (metrics_summary['error_rate'] * 1000))
        
        # 基于QPS稳定性评分（权重20%）
        qps_stability_score = 100 if metrics_summary['qps'] < 50 else max(0, 100 - (metrics_summary['qps'] - 50) * 0.5)
        
        # 加权平均
        health_score = (response_time_score * 0.4 + 
                       error_rate_score * 0.4 + 
                       qps_stability_score * 0.2)
        
        return round(health_score, 2)


class MetricsDetailAPI(APIView):
    """详细指标数据API"""
    
    def get(self, request):
        """获取详细指标数据"""
        try:
            # 获取查询参数
            hours = int(request.GET.get('hours', 1))
            endpoint_filter = request.GET.get('endpoint', None)
            
            # 获取指标摘要
            metrics_summary = monitoring_system.get_metrics_summary(hours=hours)
            
            # 如果指定了端点过滤
            if endpoint_filter:
                filtered_endpoints = [
                    ep for ep in metrics_summary['top_endpoints'] 
                    if endpoint_filter in ep['endpoint']
                ]
                metrics_summary['top_endpoints'] = filtered_endpoints
            
            response_data = {
                'success': True,
                'data': {
                    'time_range_hours': hours,
                    'metrics': metrics_summary,
                    'total_metrics_count': len(monitoring_system.metrics)
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {
                    'code': 'metrics_error',
                    'message': f'获取指标数据失败: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AlertsAPI(APIView):
    """告警管理API"""
    
    def get(self, request):
        """获取告警列表"""
        try:
            # 获取查询参数
            hours = int(request.GET.get('hours', 24))
            severity_filter = request.GET.get('severity', None)
            
            # 获取告警历史
            alerts = monitoring_system.get_alerts(hours=hours)
            
            # 按严重程度过滤
            if severity_filter:
                alerts = [alert for alert in alerts if alert['severity'] == severity_filter]
            
            # 统计告警数量
            alert_stats = {
                'total': len(alerts),
                'critical': len([a for a in alerts if a['severity'] == 'critical']),
                'high': len([a for a in alerts if a['severity'] == 'high']),
                'medium': len([a for a in alerts if a['severity'] == 'medium']),
                'low': len([a for a in alerts if a['severity'] == 'low'])
            }
            
            response_data = {
                'success': True,
                'data': {
                    'alerts': alerts,
                    'stats': alert_stats,
                    'time_range_hours': hours
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {
                    'code': 'alerts_error',
                    'message': f'获取告警数据失败: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """手动触发测试告警"""
        try:
            # 检查权限（这里简化处理，生产环境需要权限验证）
            if not request.user.is_staff:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'permission_denied',
                        'message': '需要管理员权限'
                    }
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 触发测试告警
            test_alert = {
                'id': len(monitoring_system.alert_history) + 1,
                'threshold': 'test_alert',
                'value': 1.0,
                'threshold_value': 0.5,
                'severity': 'medium',
                'timestamp': monitoring_system.metrics[-1].timestamp if monitoring_system.metrics else None,
                'message': '测试告警 - 系统监控功能正常'
            }
            
            monitoring_system.alert_history.append(test_alert)
            
            return Response({
                'success': True,
                'message': '测试告警已触发'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {
                    'code': 'test_alert_error',
                    'message': f'触发测试告警失败: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ThresholdsAPI(APIView):
    """阈值管理API"""
    
    def get(self, request):
        """获取当前阈值配置"""
        try:
            thresholds = []
            for threshold in monitoring_system.alert_thresholds:
                thresholds.append({
                    'metric_name': threshold.metric_name,
                    'threshold_value': threshold.threshold_value,
                    'comparison': threshold.comparison,
                    'duration': threshold.duration,
                    'severity': threshold.severity
                })
            
            return Response({
                'success': True,
                'data': {
                    'thresholds': thresholds,
                    'total_count': len(thresholds)
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {
                    'code': 'thresholds_error',
                    'message': f'获取阈值配置失败: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """更新阈值配置"""
        try:
            # 检查权限
            if not request.user.is_staff:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'permission_denied',
                        'message': '需要管理员权限'
                    }
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 解析请求数据
            data = request.data
            metric_name = data.get('metric_name')
            threshold_value = float(data.get('threshold_value'))
            comparison = data.get('comparison', 'gt')
            duration = int(data.get('duration', 60))
            severity = data.get('severity', 'medium')
            
            # 验证参数
            if metric_name not in ['response_time', 'error_rate', 'qps']:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'invalid_metric',
                        'message': '不支持的指标类型'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if comparison not in ['gt', 'lt', 'eq']:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'invalid_comparison',
                        'message': '不支持的比较操作符'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if severity not in ['low', 'medium', 'high', 'critical']:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'invalid_severity',
                        'message': '不支持的严重程度'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 更新阈值配置
            from .monitoring import AlertThreshold
            new_threshold = AlertThreshold(
                metric_name=metric_name,
                threshold_value=threshold_value,
                comparison=comparison,
                duration=duration,
                severity=severity
            )
            
            # 移除旧的相同指标阈值
            monitoring_system.alert_thresholds = [
                t for t in monitoring_system.alert_thresholds 
                if t.metric_name != metric_name
            ]
            
            # 添加新阈值
            monitoring_system.alert_thresholds.append(new_threshold)
            
            return Response({
                'success': True,
                'message': '阈值配置已更新'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {
                    'code': 'update_threshold_error',
                    'message': f'更新阈值配置失败: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)