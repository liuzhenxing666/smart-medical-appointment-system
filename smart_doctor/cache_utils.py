"""
Redis缓存工具类
为高频API接口提供缓存支持，提升系统性能
"""

from django.core.cache import cache
from django.conf import settings
import json
import hashlib
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class CacheManager:
    """缓存管理器"""
    
    # 缓存时间配置（单位：秒）
    CACHE_TIMEOUTS = {
        'hospital_search': 300,  # 5分钟
        'doctor_search': 300,    # 5分钟
        'appointment_list': 120, # 2分钟
        'weather_data': 1800,    # 30分钟
        'route_planning': 3600,  # 1小时
        'poi_search': 1800,      # 30分钟
        'user_preferences': 86400, # 24小时
        'popular_items': 3600,   # 1小时
    }
    
    @classmethod
    def generate_cache_key(cls, prefix, *args, **kwargs):
        """生成缓存键"""
        key_parts = [prefix]
        
        # 添加位置参数
        for arg in args:
            if isinstance(arg, (str, int, float, bool)):
                key_parts.append(str(arg))
        
        # 添加关键字参数
        for key, value in sorted(kwargs.items()):
            if isinstance(value, (str, int, float, bool)):
                key_parts.append(f"{key}={value}")
        
        # 生成MD5哈希作为键
        key_string = "::".join(key_parts)
        return f"smart_doctor:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    @classmethod
    def get_cache_timeout(cls, cache_type):
        """获取缓存超时时间"""
        return cls.CACHE_TIMEOUTS.get(cache_type, 300)  # 默认5分钟
    
    @classmethod
    def set_cache(cls, key, value, timeout=None):
        """设置缓存"""
        try:
            if timeout is None:
                timeout = 300  # 默认5分钟
            
            cache.set(key, value, timeout)
            logger.debug(f"缓存设置成功: {key}")
            return True
        except Exception as e:
            logger.error(f"缓存设置失败: {key}, 错误: {str(e)}")
            return False
    
    @classmethod
    def get_cache(cls, key):
        """获取缓存"""
        try:
            value = cache.get(key)
            if value is not None:
                logger.debug(f"缓存命中: {key}")
            return value
        except Exception as e:
            logger.error(f"缓存获取失败: {key}, 错误: {str(e)}")
            return None
    
    @classmethod
    def delete_cache(cls, key):
        """删除缓存"""
        try:
            cache.delete(key)
            logger.debug(f"缓存删除成功: {key}")
            return True
        except Exception as e:
            logger.error(f"缓存删除失败: {key}, 错误: {str(e)}")
            return False
    
    @classmethod
    def clear_pattern(cls, pattern):
        """清除匹配模式的缓存"""
        try:
            # 获取所有匹配的键
            keys = cache.keys(pattern)
            if keys:
                cache.delete_many(keys)
                logger.debug(f"清除缓存模式: {pattern}, 删除 {len(keys)} 个键")
            return True
        except Exception as e:
            logger.error(f"清除缓存模式失败: {pattern}, 错误: {str(e)}")
            return False


def cached_api(cache_type, timeout=None):
    """
    API缓存装饰器
    
    Args:
        cache_type: 缓存类型，用于确定超时时间
        timeout: 自定义超时时间（秒）
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键：区分请求方法、路径、用户身份和查询参数，避免串号
            key_parts = [f"api_{cache_type}", func.__name__]
            request = args[0] if args else None
            if request is not None and hasattr(request, 'method'):
                key_parts.append(request.method)
                key_parts.append(request.path)
                user = getattr(request, 'user', None)
                if user is not None and getattr(user, 'is_authenticated', False):
                    key_parts.append(f"user={user.id}")
                else:
                    key_parts.append("user=anonymous")
                query_params = getattr(request, 'GET', None)
                if query_params is None:
                    query_params = getattr(request, 'query_params', None)
                if query_params:
                    key_parts.append(str(sorted(query_params.items())))
            cache_key = CacheManager.generate_cache_key(*key_parts)
            
            # 尝试从缓存获取
            cached_result = CacheManager.get_cache(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 执行原始函数
            result = func(*args, **kwargs)
            
            # 将结果缓存
            if result and hasattr(result, 'status_code') and result.status_code == 200:
                cache_timeout = timeout or CacheManager.get_cache_timeout(cache_type)
                CacheManager.set_cache(cache_key, result, cache_timeout)
            
            return result
        
        return wrapper
    return decorator


def cache_invalidate(pattern):
    """
    缓存失效装饰器
    
    Args:
        pattern: 缓存键模式，用于匹配需要失效的缓存
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 执行原始函数
            result = func(*args, **kwargs)
            
            # 清除匹配的缓存
            if result and hasattr(result, 'status_code') and result.status_code in [200, 201, 204]:
                CacheManager.clear_pattern(pattern)
            
            return result
        
        return wrapper
    return decorator


class APICacheStats:
    """API缓存统计"""
    
    @classmethod
    def get_cache_stats(cls):
        """获取缓存统计信息"""
        try:
            # 获取所有缓存键
            keys = cache.keys("smart_doctor:*")
            
            stats = {
                'total_keys': len(keys),
                'cache_types': {},
                'memory_usage': 0  # 估算内存使用
            }
            
            # 按类型统计
            for key in keys:
                key_parts = key.split(':')
                if len(key_parts) >= 3:
                    cache_type = key_parts[2]
                    stats['cache_types'][cache_type] = stats['cache_types'].get(cache_type, 0) + 1
            
            return stats
        except Exception as e:
            logger.error(f"获取缓存统计失败: {str(e)}")
            return {'error': str(e)}
    
    @classmethod
    def clear_all_cache(cls):
        """清除所有缓存"""
        try:
            keys = cache.keys("smart_doctor:*")
            if keys:
                cache.delete_many(keys)
                logger.info(f"清除所有缓存，共 {len(keys)} 个键")
            return True
        except Exception as e:
            logger.error(f"清除所有缓存失败: {str(e)}")
            return False