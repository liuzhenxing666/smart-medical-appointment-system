"""
API调用监控和异常告警系统

功能：
1. API调用统计和性能指标收集
2. 异常检测和告警机制
3. 阈值监控和自动告警
4. 监控数据存储和可视化
"""

import time
import logging
import threading
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
import json

logger = logging.getLogger('django')


@dataclass
class APIMetric:
    """API调用指标"""
    endpoint: str
    method: str
    response_time: float
    status_code: int
    timestamp: datetime
    user_id: Optional[int] = None
    error_message: Optional[str] = None


@dataclass
class AlertThreshold:
    """告警阈值配置"""
    metric_name: str
    threshold_value: float
    comparison: str  # 'gt', 'lt', 'eq'
    duration: int  # 持续时间（秒）
    severity: str  # 'low', 'medium', 'high', 'critical'


class APIMonitoringSystem:
    """API监控系统"""
    
    def __init__(self):
        self.metrics: List[APIMetric] = []
        self.alert_thresholds: List[AlertThreshold] = []
        self.alert_history: List[Dict] = []
        self.metrics_lock = threading.Lock()
        self.cleanup_interval = 3600  # 1小时清理一次旧数据
        self.max_metrics_age = 86400  # 保留24小时数据
        
        # 初始化默认阈值
        self._setup_default_thresholds()
        
        # 启动后台清理线程
        self._start_cleanup_thread()
    
    def _setup_default_thresholds(self):
        """设置默认告警阈值"""
        default_thresholds = [
            AlertThreshold('response_time', 5.0, 'gt', 60, 'medium'),  # 响应时间超过5秒
            AlertThreshold('error_rate', 0.05, 'gt', 300, 'high'),    # 错误率超过5%
            AlertThreshold('qps', 100.0, 'gt', 60, 'medium'),          # QPS超过100
            AlertThreshold('response_time', 10.0, 'gt', 30, 'high'),  # 响应时间超过10秒
            AlertThreshold('error_rate', 0.1, 'gt', 60, 'critical'),   # 错误率超过10%
        ]
        self.alert_thresholds.extend(default_thresholds)
    
    def record_api_call(self, endpoint: str, method: str, response_time: float, 
                       status_code: int, user_id: Optional[int] = None,
                       error_message: Optional[str] = None):
        """记录API调用指标"""
        metric = APIMetric(
            endpoint=endpoint,
            method=method,
            response_time=response_time,
            status_code=status_code,
            timestamp=datetime.now(),
            user_id=user_id,
            error_message=error_message
        )
        
        with self.metrics_lock:
            self.metrics.append(metric)
        
        # 检查是否需要触发告警
        self._check_alerts()
    
    def _check_alerts(self):
        """检查告警阈值"""
        current_time = datetime.now()
        
        for threshold in self.alert_thresholds:
            if self._is_threshold_breached(threshold, current_time):
                self._trigger_alert(threshold, current_time)
    
    def _is_threshold_breached(self, threshold: AlertThreshold, current_time: datetime) -> bool:
        """检查阈值是否被突破"""
        time_window = current_time - timedelta(seconds=threshold.duration)
        
        with self.metrics_lock:
            recent_metrics = [m for m in self.metrics if m.timestamp >= time_window]
        
        if not recent_metrics:
            return False
        
        if threshold.metric_name == 'response_time':
            avg_response_time = sum(m.response_time for m in recent_metrics) / len(recent_metrics)
            if threshold.comparison == 'gt':
                return avg_response_time > threshold.threshold_value
            elif threshold.comparison == 'lt':
                return avg_response_time < threshold.threshold_value
        
        elif threshold.metric_name == 'error_rate':
            error_count = sum(1 for m in recent_metrics if m.status_code >= 400)
            total_count = len(recent_metrics)
            error_rate = error_count / total_count if total_count > 0 else 0
            
            if threshold.comparison == 'gt':
                return error_rate > threshold.threshold_value
        
        elif threshold.metric_name == 'qps':
            qps = len(recent_metrics) / threshold.duration
            if threshold.comparison == 'gt':
                return qps > threshold.threshold_value
        
        return False
    
    def _trigger_alert(self, threshold: AlertThreshold, timestamp: datetime):
        """触发告警"""
        alert = {
            'id': len(self.alert_history) + 1,
            'threshold': threshold.metric_name,
            'value': self._get_current_metric_value(threshold.metric_name),
            'threshold_value': threshold.threshold_value,
            'severity': threshold.severity,
            'timestamp': timestamp,
            'message': self._generate_alert_message(threshold)
        }
        
        # 检查是否已经有相同的告警（避免重复告警）
        recent_alerts = [a for a in self.alert_history 
                        if a['threshold'] == threshold.metric_name 
                        and (timestamp - a['timestamp']).total_seconds() < 300]  # 5分钟内不重复告警
        
        if not recent_alerts:
            self.alert_history.append(alert)
            self._send_alert_notification(alert)
    
    def _get_current_metric_value(self, metric_name: str) -> float:
        """获取当前指标值"""
        current_time = datetime.now()
        time_window = current_time - timedelta(seconds=60)  # 最近1分钟
        
        with self.metrics_lock:
            recent_metrics = [m for m in self.metrics if m.timestamp >= time_window]
        
        if not recent_metrics:
            return 0.0
        
        if metric_name == 'response_time':
            return sum(m.response_time for m in recent_metrics) / len(recent_metrics)
        elif metric_name == 'error_rate':
            error_count = sum(1 for m in recent_metrics if m.status_code >= 400)
            return error_count / len(recent_metrics)
        elif metric_name == 'qps':
            return len(recent_metrics) / 60.0
        
        return 0.0
    
    def _generate_alert_message(self, threshold: AlertThreshold) -> str:
        """生成告警消息"""
        current_value = self._get_current_metric_value(threshold.metric_name)
        
        if threshold.metric_name == 'response_time':
            return f"API响应时间异常: {current_value:.2f}s > {threshold.threshold_value}s (阈值)"
        elif threshold.metric_name == 'error_rate':
            return f"API错误率异常: {current_value:.2%} > {threshold.threshold_value:.2%} (阈值)"
        elif threshold.metric_name == 'qps':
            return f"API QPS异常: {current_value:.2f} > {threshold.threshold_value:.2f} (阈值)"
        
        return f"指标 {threshold.metric_name} 异常"
    
    def _send_alert_notification(self, alert: Dict):
        """发送告警通知"""
        # 这里可以实现邮件、短信、微信等告警通知
        logger.warning(f"🚨 系统告警 [{alert['severity'].upper()}] - {alert['message']}")
        
        # 记录到文件（生产环境可以集成到监控系统）
        alert_log = {
            'timestamp': alert['timestamp'].isoformat(),
            'severity': alert['severity'],
            'message': alert['message'],
            'metric': alert['threshold'],
            'current_value': alert['value'],
            'threshold': alert['threshold_value']
        }
        
        logger.info(f"告警记录: {json.dumps(alert_log, ensure_ascii=False)}")
    
    def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """获取指标摘要"""
        time_window = datetime.now() - timedelta(hours=hours)
        
        with self.metrics_lock:
            recent_metrics = [m for m in self.metrics if m.timestamp >= time_window]
        
        if not recent_metrics:
            return {
                'total_calls': 0,
                'avg_response_time': 0.0,
                'error_rate': 0.0,
                'qps': 0.0,
                'top_endpoints': []
            }
        
        total_calls = len(recent_metrics)
        avg_response_time = sum(m.response_time for m in recent_metrics) / total_calls
        error_count = sum(1 for m in recent_metrics if m.status_code >= 400)
        error_rate = error_count / total_calls
        qps = total_calls / (hours * 3600)
        
        # 统计热门端点
        endpoint_stats = defaultdict(list)
        for metric in recent_metrics:
            endpoint_stats[metric.endpoint].append(metric.response_time)
        
        top_endpoints = []
        for endpoint, response_times in endpoint_stats.items():
            avg_time = sum(response_times) / len(response_times)
            call_count = len(response_times)
            top_endpoints.append({
                'endpoint': endpoint,
                'call_count': call_count,
                'avg_response_time': avg_time,
                'error_count': sum(1 for m in recent_metrics 
                                 if m.endpoint == endpoint and m.status_code >= 400)
            })
        
        top_endpoints.sort(key=lambda x: x['call_count'], reverse=True)
        
        return {
            'total_calls': total_calls,
            'avg_response_time': avg_response_time,
            'error_rate': error_rate,
            'qps': qps,
            'top_endpoints': top_endpoints[:10]  # 前10个热门端点
        }
    
    def get_alerts(self, hours: int = 24) -> List[Dict]:
        """获取告警历史"""
        time_window = datetime.now() - timedelta(hours=hours)
        return [alert for alert in self.alert_history if alert['timestamp'] >= time_window]
    
    def _start_cleanup_thread(self):
        """启动后台清理线程"""
        def cleanup_old_metrics():
            while True:
                time.sleep(self.cleanup_interval)
                self._cleanup_old_metrics()
        
        thread = threading.Thread(target=cleanup_old_metrics, daemon=True)
        thread.start()
    
    def _cleanup_old_metrics(self):
        """清理旧指标数据"""
        cutoff_time = datetime.now() - timedelta(seconds=self.max_metrics_age)
        
        with self.metrics_lock:
            self.metrics = [m for m in self.metrics if m.timestamp >= cutoff_time]
        
        logger.info(f"清理旧指标数据完成，当前保留 {len(self.metrics)} 条记录")


# 全局监控系统实例
monitoring_system = APIMonitoringSystem()