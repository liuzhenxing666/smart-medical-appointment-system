"""
API工具类 - 错误处理和响应格式化
"""

from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.http import JsonResponse
import logging
import time

logger = logging.getLogger('django')


class APIResponse:
    """API响应工具类"""
    
    @staticmethod
    def success(data=None, message="操作成功", status_code=200):
        """成功响应"""
        response_data = {
            'success': True,
            'message': message,
            'data': data
        }
        return JsonResponse(response_data, status=status_code)
    
    @staticmethod
    def error(message="操作失败", error_code=None, details=None, status_code=400, user_message=None):
        """错误响应"""
        # 为用户提供友好的错误消息
        friendly_messages = {
            'validation_error': '请检查输入的数据是否正确',
            'missing_parameter': '缺少必要的参数，请检查请求',
            'value_error': '输入的数据格式不正确',
            'not_found': '请求的资源不存在',
            'unauthorized': '请先登录后再进行操作',
            'forbidden': '您没有权限执行此操作',
            'bad_request': '请求参数有误，请检查后重试',
            'method_not_allowed': '请求方法不被允许',
            'internal_server_error': '服务器内部错误，请稍后重试',
            'unknown_error': '系统发生未知错误'
        }
        
        error_data = {
            'success': False,
            'error': {
                'code': error_code or 'unknown_error',
                'message': message,
                'user_message': user_message or friendly_messages.get(error_code, '操作失败，请稍后重试'),
                'details': details or {},
                'timestamp': time.time() if 'time' in globals() else None
            }
        }
        
        # 记录错误日志
        logger.error(f"API错误: {message} - 错误码: {error_code} - 详情: {details}")
        
        return JsonResponse(error_data, status=status_code)
    
    @staticmethod
    def validation_error(errors, message="数据验证失败"):
        """验证错误响应"""
        return APIResponse.error(
            message=message,
            error_code='validation_error',
            details=errors,
            status_code=400
        )
    
    @staticmethod
    def not_found(message="资源不存在"):
        """资源不存在响应"""
        return APIResponse.error(
            message=message,
            error_code='not_found',
            status_code=404
        )
    
    @staticmethod
    def unauthorized(message="未授权访问"):
        """未授权响应"""
        return APIResponse.error(
            message=message,
            error_code='unauthorized',
            status_code=401
        )
    
    @staticmethod
    def forbidden(message="权限不足"):
        """权限不足响应"""
        return APIResponse.error(
            message=message,
            error_code='forbidden',
            status_code=403
        )
    
    @staticmethod
    def bad_request(message="请求参数错误"):
        """请求参数错误响应"""
        return APIResponse.error(
            message=message,
            error_code='bad_request',
            status_code=400
        )
    
    @staticmethod
    def method_not_allowed(message="请求方法不允许"):
        """请求方法不允许响应"""
        return APIResponse.error(
            message=message,
            error_code='method_not_allowed',
            status_code=405
        )
    
    @staticmethod
    def server_error(message="服务器内部错误"):
        """服务器错误响应"""
        return APIResponse.error(
            message=message,
            error_code='internal_server_error',
            status_code=500
        )


class APIExceptionHandler:
    """API异常处理器"""
    
    @staticmethod
    def handle_exception(func):
        """异常处理装饰器"""
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                # 如果结果是字典，包装为JsonResponse对象（兼容旧代码）
                if isinstance(result, dict):
                    # 从字典中提取状态码，默认为200
                    status_code = 200
                    if 'status_code' in result:
                        status_code = result.pop('status_code')
                    elif 'error' in result and 'status_code' in result.get('error', {}):
                        status_code = result['error']['status_code']
                    
                    return JsonResponse(result, status=status_code)
                return result
            except Exception as e:
                return APIExceptionHandler._handle_specific_exception(e)
        return wrapper
    
    @staticmethod
    def _handle_specific_exception(exception):
        """处理特定异常"""
        exception_type = type(exception).__name__
        
        # 记录异常详细信息
        logger.error(f"API异常: {exception_type} - {str(exception)}", exc_info=True)
        
        # 根据异常类型返回不同的错误响应
        if exception_type == 'ValidationError':
            return APIResponse.validation_error(getattr(exception, 'detail', str(exception)))
        
        elif exception_type == 'DoesNotExist':
            return APIResponse.not_found("请求的资源不存在")
        
        elif exception_type == 'PermissionDenied':
            return APIResponse.forbidden("权限不足")
        
        elif exception_type == 'AuthenticationFailed':
            return APIResponse.unauthorized("认证失败")
        
        elif exception_type == 'ValueError':
            return APIResponse.error(message=str(exception), error_code='value_error')
        
        elif exception_type == 'KeyError':
            return APIResponse.error(message=f"缺少必要参数: {str(exception)}", error_code='missing_parameter')
        
        else:
            # 其他未处理异常
            return APIResponse.server_error("服务器内部错误")


class RequestValidator:
    """请求验证器"""
    
    @staticmethod
    def validate_request_data(serializer_class, data, context=None):
        """验证请求数据"""
        serializer = serializer_class(data=data, context=context or {})
        
        if not serializer.is_valid():
            raise ValueError(serializer.errors)
        
        return serializer.validated_data
    
    @staticmethod
    def validate_required_fields(data, required_fields):
        """验证必需字段"""
        missing_fields = []
        
        for field in required_fields:
            if field not in data or data[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"缺少必需字段: {', '.join(missing_fields)}")
        
        return True
    
    @staticmethod
    def validate_field_types(data, field_types):
        """验证字段类型"""
        type_errors = []
        
        for field, expected_type in field_types.items():
            if field in data and data[field] is not None:
                if not isinstance(data[field], expected_type):
                    type_errors.append(f"{field} 应为 {expected_type.__name__} 类型")
        
        if type_errors:
            raise ValueError(f"字段类型错误: {', '.join(type_errors)}")
        
        return True
    
    @staticmethod
    def validate_field_ranges(data, field_ranges):
        """验证字段范围"""
        range_errors = []
        
        for field, (min_val, max_val) in field_ranges.items():
            if field in data and data[field] is not None:
                value = data[field]
                if value < min_val or value > max_val:
                    range_errors.append(f"{field} 应在 {min_val} 到 {max_val} 之间")
        
        if range_errors:
            raise ValueError(f"字段范围错误: {', '.join(range_errors)}")
        
        return True