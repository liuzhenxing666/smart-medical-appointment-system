"""
API监控中间件 - 拦截API调用并记录监控数据
"""

import time
import logging
from django.utils.deprecation import MiddlewareMixin
from .monitoring import monitoring_system

logger = logging.getLogger('django')


class APIMonitoringMiddleware(MiddlewareMixin):
    """API监控中间件"""
    
    def __init__(self, get_response=None):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """处理请求开始"""
        # 只监控API请求
        if not request.path.startswith('/api/'):
            return None
        
        # 记录请求开始时间
        request._monitoring_start_time = time.time()
        
        # 记录用户信息
        user_id = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = request.user.id
        
        request._monitoring_user_id = user_id
        
        return None
    
    def process_response(self, request, response):
        """处理响应完成"""
        # 只监控API请求
        if not hasattr(request, '_monitoring_start_time'):
            return response
        
        try:
            # 计算响应时间
            response_time = time.time() - request._monitoring_start_time
            
            # 获取状态码
            status_code = getattr(response, 'status_code', 200)
            
            # 获取用户ID
            user_id = getattr(request, '_monitoring_user_id', None)
            
            # 记录API调用指标
            monitoring_system.record_api_call(
                endpoint=request.path,
                method=request.method,
                response_time=response_time,
                status_code=status_code,
                user_id=user_id
            )
            
            # 记录监控日志
            logger.info(f"📊 API监控: {request.method} {request.path} - "
                       f"响应时间: {response_time:.3f}s - 状态码: {status_code}")
            
        except Exception as e:
            logger.error(f"API监控中间件错误: {str(e)}")
        
        return response
    
    def process_exception(self, request, exception):
        """处理异常"""
        # 只监控API请求
        if not hasattr(request, '_monitoring_start_time'):
            return None
        
        try:
            # 计算响应时间
            response_time = time.time() - request._monitoring_start_time
            
            # 获取用户ID
            user_id = getattr(request, '_monitoring_user_id', None)
            
            # 记录异常调用指标
            monitoring_system.record_api_call(
                endpoint=request.path,
                method=request.method,
                response_time=response_time,
                status_code=500,  # 异常状态码
                user_id=user_id,
                error_message=str(exception)
            )
            
            # 记录异常监控日志
            logger.error(f"🚨 API异常监控: {request.method} {request.path} - "
                        f"响应时间: {response_time:.3f}s - 异常: {str(exception)}")
            
        except Exception as e:
            logger.error(f"API监控中间件异常处理错误: {str(e)}")
        
        return None