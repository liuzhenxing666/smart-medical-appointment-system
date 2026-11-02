"""
自定义中间件 - API错误处理和日志记录
"""

import json
import logging
import traceback
from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger('django')


class ExceptionHandlingMiddleware(MiddlewareMixin):
    """全局异常处理中间件（仅对 /api/ 路径生效，避免网页错误被转成 JSON）"""

    def process_exception(self, request, exception):
        """处理所有未捕获的异常"""
        # 非 API 请求交给 Django 默认错误处理（DEBUG 下可显示调试页面）
        if not request.path.startswith('/api/'):
            return None

        # 记录错误日志
        error_message = f"未处理的异常: {str(exception)}"
        logger.error(error_message, exc_info=True)
        
        # 根据异常类型返回不同的错误响应
        if isinstance(exception, APIException):
            # REST Framework异常
            response = JsonResponse({
                'success': False,
                'error': {
                    'code': exception.get_codes(),
                    'message': str(exception.detail),
                    'type': 'api_exception'
                }
            }, status=exception.status_code)
        
        elif isinstance(exception, ValueError):
            # 值错误（数据验证失败）
            response = JsonResponse({
                'success': False,
                'error': {
                    'code': 'validation_error',
                    'message': str(exception),
                    'type': 'value_error'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        elif isinstance(exception, KeyError):
            # 键错误（缺少必要参数）
            response = JsonResponse({
                'success': False,
                'error': {
                    'code': 'missing_parameter',
                    'message': f"缺少必要参数: {str(exception)}",
                    'type': 'key_error'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        else:
            # 其他未处理异常
            response = JsonResponse({
                'success': False,
                'error': {
                    'code': 'internal_server_error',
                    'message': '服务器内部错误',
                    'type': 'unhandled_exception',
                    'detail': str(exception) if settings.DEBUG else '请联系系统管理员'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 确保响应对象有必要的属性
        if not hasattr(response, 'headers'):
            response.headers = {}
        
        return response


class RequestLoggingMiddleware(MiddlewareMixin):
    """请求日志记录中间件"""
    
    def process_request(self, request):
        """记录请求信息"""
        # 记录API请求
        if request.path.startswith('/api/'):
            logger.info(f"API请求: {request.method} {request.path} - 用户: {request.user}")
    
    def process_response(self, request, response):
        """记录响应信息"""
        # 记录API响应
        if request.path.startswith('/api/'):
            # 安全地获取状态码
            status_code = getattr(response, 'status_code', None)
            if status_code is not None:
                status_category = 'success' if 200 <= status_code < 400 else 'error'
                logger.info(f"API响应: {request.method} {request.path} - 状态: {status_code} ({status_category})")
        
        return response


class ValidationErrorMiddleware(MiddlewareMixin):
    """数据验证错误处理中间件"""
    
    def process_response(self, request, response):
        """处理验证错误响应"""
        
        # 只处理API请求
        if not request.path.startswith('/api/'):
            return response
        
        # 安全地获取状态码
        status_code = getattr(response, 'status_code', None)
        if status_code is None:
            return response
        
        # 处理400错误（通常是验证错误）
        if status_code == status.HTTP_400_BAD_REQUEST:
            try:
                # 尝试解析响应内容
                if hasattr(response, 'data'):
                    error_data = response.data
                else:
                    content = response.content.decode('utf-8')
                    error_data = json.loads(content) if content else {}
                
                # 统一错误响应格式
                if 'errors' in error_data:
                    response.data = {
                        'success': False,
                        'error': {
                            'code': 'validation_error',
                            'message': '数据验证失败',
                            'type': 'validation_error',
                            'details': error_data.get('errors', {})
                        }
                    }
                
            except (json.JSONDecodeError, AttributeError):
                # 如果无法解析，保持原响应
                pass
        
        return response