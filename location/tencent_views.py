"""
腾讯地图API视图
用于提供基于腾讯地图的地理位置服务
"""

from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from django.conf import settings

# 导入腾讯地图客户端
from .tencent_map_client import tencent_map_client
from smart_doctor.api_utils import APIResponse, APIExceptionHandler, RequestValidator
from smart_doctor.cache_utils import cached_api

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='tencent_geocode_address', timeout=3600)  # 1小时缓存，地址信息相对稳定
def tencent_geocode_address(request):
    """
    腾讯地图地址解析API - 将地址转换为经纬度坐标
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    address = request.GET.get('address', '')
    city = request.GET.get('city', '')
    
    if not address:
        return APIResponse.validation_error("地址参数不能为空")
    
    # 验证地址长度
    if len(address) < 2:
        return APIResponse.validation_error("地址参数过短，至少需要2个字符")
    
    if len(address) > 200:
        return APIResponse.validation_error("地址参数过长，最多200个字符")
    
    try:
        # 调用腾讯地图地理编码API
        result = tencent_map_client.geocode(address=address, city=city)
        
        if result.get('status') == '1' and result.get('geocodes'):
            return APIResponse.success(
                data=result,
                message="地址解析成功"
            )
        else:
            return APIResponse.error(
                message="地址解析失败",
                error_code='tencent_geocoding_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'address': address,
                    'city': city
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"腾讯地图地址解析服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='tencent_reverse_geocode', timeout=3600)  # 1小时缓存，位置信息相对稳定
def tencent_reverse_geocode(request):
    """
    腾讯地图逆地理编码API - 将经纬度坐标转换为地址信息
    如果腾讯地图API失败，自动切换到高德地图API作为备用方案
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    location = request.GET.get('location', '')
    
    if not location:
        return APIResponse.validation_error("经纬度参数不能为空")
    
    # 验证经纬度格式
    try:
        coords = location.split(',')
        if len(coords) != 2:
            return APIResponse.validation_error("经纬度格式错误，应为'经度,纬度'格式")
        
        longitude = float(coords[0].strip())
        latitude = float(coords[1].strip())
        
        if not (-180 <= longitude <= 180):
            return APIResponse.validation_error("经度必须在-180到180之间")
        
        if not (-90 <= latitude <= 90):
            return APIResponse.validation_error("纬度必须在-90到90之间")
            
    except ValueError:
        return APIResponse.validation_error("经纬度参数必须是有效的数字")
    
    try:
        # 首先尝试调用腾讯地图逆地理编码API
        result = tencent_map_client.reverse_geocode(location=location)
        
        if result.get('status') == '1' and result.get('regeocode'):
            return APIResponse.success(
                data=result,
                message="逆地理编码成功（腾讯地图）"
            )
        else:
            # 腾讯地图API失败，尝试切换到高德地图API作为备用方案
            from .amap_client import amap_client
            amap_result = amap_client.reverse_geocode(location=location)
            
            if amap_result.get('status') == '1' and amap_result.get('regeocode'):
                return APIResponse.success(
                    data=amap_result,
                    message="逆地理编码成功（高德地图备用方案）"
                )
            else:
                # 两个API都失败，返回腾讯地图的错误信息
                return APIResponse.error(
                    message="逆地理编码失败",
                    error_code='reverse_geocoding_failed',
                    details={
                        'error_info': result.get('info', '未知错误'),
                        'location': location,
                        'fallback_attempted': True
                    }
                )
    except Exception as e:
        # 腾讯地图API异常，尝试高德地图备用方案
        try:
            from .amap_client import amap_client
            amap_result = amap_client.reverse_geocode(location=location)
            
            if amap_result.get('status') == '1' and amap_result.get('regeocode'):
                return APIResponse.success(
                    data=amap_result,
                    message="逆地理编码成功（高德地图备用方案）"
                )
        except Exception as fallback_error:
            # 备用方案也失败
            return APIResponse.server_error(f"逆地理编码服务异常: {str(e)}，备用方案也失败: {str(fallback_error)}")
        
        # 如果备用方案成功，直接返回成功响应
        return APIResponse.server_error(f"腾讯地图逆地理编码服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='tencent_calculate_distance', timeout=1800)  # 30分钟缓存，距离信息相对稳定
def tencent_calculate_distance(request):
    """
    腾讯地图距离计算API - 计算两点之间的距离
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    origins = request.GET.get('origins', '')
    destination = request.GET.get('destination', '')
    distance_type = request.GET.get('type', '1')  # 1:驾车, 3:步行
    
    if not origins or not destination:
        return APIResponse.validation_error("起点和终点参数不能为空")
    
    # 验证距离类型
    if distance_type not in ['1', '3']:
        return APIResponse.validation_error("腾讯地图距离类型参数错误，应为1(驾车)或3(步行)")
    
    # 验证坐标格式
    try:
        # 验证起点坐标格式
        origin_points = origins.split('|')
        for point in origin_points:
            coords = point.split(',')
            if len(coords) != 2:
                return APIResponse.validation_error("起点坐标格式错误，应为'经度,纬度'格式")
            longitude = float(coords[0].strip())
            latitude = float(coords[1].strip())
            if not (-180 <= longitude <= 180) or not (-90 <= latitude <= 90):
                return APIResponse.validation_error("起点坐标范围错误")
        
        # 验证终点坐标格式
        dest_coords = destination.split(',')
        if len(dest_coords) != 2:
            return APIResponse.validation_error("终点坐标格式错误，应为'经度,纬度'格式")
        longitude = float(dest_coords[0].strip())
        latitude = float(dest_coords[1].strip())
        if not (-180 <= longitude <= 180) or not (-90 <= latitude <= 90):
            return APIResponse.validation_error("终点坐标范围错误")
            
    except ValueError:
        return APIResponse.validation_error("坐标参数必须是有效的数字")
    
    try:
        # 调用腾讯地图距离计算API
        result = tencent_map_client.calculate_distance(
            origins=origins, 
            destination=destination, 
            type=distance_type
        )
        
        if result.get('status') == '1' and result.get('results'):
            return APIResponse.success(
                data=result,
                message="距离计算成功"
            )
        else:
            return APIResponse.error(
                message="距离计算失败",
                error_code='tencent_distance_calculation_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'origins': origins,
                    'destination': destination,
                    'type': distance_type
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"腾讯地图距离计算服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='tencent_search_poi', timeout=1800)  # 30分钟缓存，POI信息相对稳定
def tencent_search_poi(request):
    """
    腾讯地图POI搜索API - 搜索周边兴趣点
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    keywords = request.GET.get('keywords', '')
    location = request.GET.get('location', '')
    radius = request.GET.get('radius', '1000')  # 默认搜索半径1000米
    page_size = request.GET.get('page_size', '20')  # 默认每页20条
    page_index = request.GET.get('page_index', '1')  # 默认第1页
    
    if not keywords:
        return APIResponse.validation_error("关键词参数不能为空")
    
    if not location:
        return APIResponse.validation_error("位置参数不能为空")
    
    # 验证参数格式
    try:
        radius = int(radius)
        if radius < 100 or radius > 50000:
            return APIResponse.validation_error("搜索半径应在100米到50000米之间")
    except ValueError:
        return APIResponse.validation_error("搜索半径必须是数字")
    
    try:
        page_size = int(page_size)
        if page_size < 1 or page_size > 100:
            return APIResponse.validation_error("每页数量应在1到100之间")
    except ValueError:
        return APIResponse.validation_error("每页数量必须是数字")
    
    try:
        page_index = int(page_index)
        if page_index < 1:
            return APIResponse.validation_error("页码必须是大于0的数字")
    except ValueError:
        return APIResponse.validation_error("页码必须是数字")
    
    # 验证位置格式
    try:
        coords = location.split(',')
        if len(coords) != 2:
            return APIResponse.validation_error("位置格式错误，应为'经度,纬度'格式")
        
        longitude = float(coords[0].strip())
        latitude = float(coords[1].strip())
        
        if not (-180 <= longitude <= 180):
            return APIResponse.validation_error("经度必须在-180到180之间")
        
        if not (-90 <= latitude <= 90):
            return APIResponse.validation_error("纬度必须在-90到90之间")
            
    except ValueError:
        return APIResponse.validation_error("位置参数必须是有效的数字")
    
    try:
        # 调用腾讯地图POI搜索API
        result = tencent_map_client.search_poi(
            keywords=keywords,
            location=location,
            radius=radius,
            page_size=page_size,
            page_index=page_index
        )
        
        if result.get('status') == '1':
            return APIResponse.success(
                data=result,
                message="POI搜索成功"
            )
        else:
            return APIResponse.error(
                message="POI搜索失败",
                error_code='tencent_poi_search_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'keywords': keywords,
                    'location': location,
                    'radius': radius
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"腾讯地图POI搜索服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='tencent_route_planning', timeout=1800)  # 30分钟缓存，路线信息相对稳定
def tencent_route_planning(request):
    """
    腾讯地图路径规划API - 获取出行路线规划
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    origin = request.GET.get('origin', '')
    destination = request.GET.get('destination', '')
    route_type = request.GET.get('type', 'driving')  # 默认驾车路线
    city = request.GET.get('city', '')
    cityd = request.GET.get('cityd', '')
    
    if not origin or not destination:
        return APIResponse.validation_error("起点和终点参数不能为空")
    
    # 验证路线类型
    valid_types = ['driving', 'walking', 'transit', 'bicycling']
    if route_type not in valid_types:
        return APIResponse.validation_error(f"路线类型参数错误，应为: {', '.join(valid_types)}")
    
    # 验证起点和终点格式
    try:
        # 验证起点坐标格式
        origin_coords = origin.split(',')
        if len(origin_coords) != 2:
            return APIResponse.validation_error("起点坐标格式错误，应为'经度,纬度'格式")
        origin_longitude = float(origin_coords[0].strip())
        origin_latitude = float(origin_coords[1].strip())
        if not (-180 <= origin_longitude <= 180) or not (-90 <= origin_latitude <= 90):
            return APIResponse.validation_error("起点坐标范围错误")
        
        # 验证终点坐标格式
        dest_coords = destination.split(',')
        if len(dest_coords) != 2:
            return APIResponse.validation_error("终点坐标格式错误，应为'经度,纬度'格式")
        dest_longitude = float(dest_coords[0].strip())
        dest_latitude = float(dest_coords[1].strip())
        if not (-180 <= dest_longitude <= 180) or not (-90 <= dest_latitude <= 90):
            return APIResponse.validation_error("终点坐标范围错误")
            
    except ValueError:
        return APIResponse.validation_error("坐标参数必须是有效的数字")
    
    try:
        # 调用腾讯地图路径规划API
        result = tencent_map_client.route_planning(
            from_point=origin,
            to_point=destination,
            type=route_type,
            from_city=city,
            to_city=cityd
        )
        
        if result.get('status') == '1' and result.get('route', {}).get('paths'):
            return APIResponse.success(
                data=result,
                message="路径规划成功"
            )
        else:
            return APIResponse.error(
                message="路径规划失败",
                error_code='tencent_route_planning_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'origin': origin,
                    'destination': destination,
                    'type': route_type
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"腾讯地图路径规划服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='tencent_weather', timeout=1800)  # 30分钟缓存，天气信息相对稳定
def tencent_weather(request):
    """
    腾讯地图天气查询API - 获取城市天气信息
    注意：腾讯地图API不提供天气查询功能，这里返回模拟数据
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    city = request.GET.get('city', '')
    
    if not city:
        return APIResponse.validation_error("城市参数不能为空")
    
    try:
        # 调用腾讯地图天气查询API（模拟数据）
        result = tencent_map_client.get_weather(city=city)
        
        if result.get('status') == '1' and result.get('lives'):
            return APIResponse.success(
                data=result,
                message="天气查询成功"
            )
        else:
            return APIResponse.error(
                message="天气查询失败",
                error_code='tencent_weather_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'city': city
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"腾讯地图天气查询服务异常: {str(e)}")