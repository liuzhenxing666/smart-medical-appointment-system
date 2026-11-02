from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from django.conf import settings

# 导入腾讯地图API客户端
from .tencent_map_client import tencent_map_client
from smart_doctor.api_utils import APIResponse, APIExceptionHandler, RequestValidator
from smart_doctor.cache_utils import cached_api

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='geocode_address', timeout=3600)  # 1小时缓存，地址信息相对稳定
def geocode_address(request):
    """
    地址解析API - 将地址转换为经纬度坐标
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
                error_code='geocoding_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'address': address,
                    'city': city
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"地址解析服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='reverse_geocode', timeout=3600)  # 1小时缓存，位置信息相对稳定
def reverse_geocode(request):
    """
    逆地理编码API - 将经纬度坐标转换为地址信息
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
        # 调用腾讯地图逆地理编码API
        result = tencent_map_client.reverse_geocode(location=location)
        
        if result.get('status') == '1' and result.get('regeocode'):
            return APIResponse.success(
                data=result,
                message="逆地理编码成功"
            )
        else:
            return APIResponse.error(
                message="逆地理编码失败",
                error_code='reverse_geocoding_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'location': location
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"逆地理编码服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='calculate_distance', timeout=1800)  # 30分钟缓存，距离信息相对稳定
def calculate_distance(request):
    """
    距离计算API - 计算两点之间的距离
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    origins = request.GET.get('origins', '')
    destination = request.GET.get('destination', '')
    distance_type = request.GET.get('type', '1')  # 1:驾车, 0:直线, 3:步行
    
    if not origins or not destination:
        return APIResponse.validation_error("起点和终点参数不能为空")
    
    # 验证距离类型
    if distance_type not in ['0', '1', '3']:
        return APIResponse.validation_error("距离类型参数错误，应为0(直线)、1(驾车)或3(步行)")
    
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
            distance_type=distance_type
        )
        
        if result.get('status') == '1' and result.get('results'):
            return APIResponse.success(
                data=result,
                message="距离计算成功"
            )
        else:
            return APIResponse.error(
                message="距离计算失败",
                error_code='distance_calculation_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'origins': origins,
                    'destination': destination,
                    'type': distance_type
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"距离计算服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='search_poi', timeout=1800)  # 30分钟缓存，POI信息相对稳定
def search_poi(request):
    """
    POI搜索API - 搜索周边兴趣点
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    keywords = request.GET.get('keywords', '')
    location = request.GET.get('location', '')
    radius = request.GET.get('radius', '100000')  # 默认100公里
    
    if not keywords or not location:
        return APIResponse.validation_error("关键词和位置参数不能为空")
    
    # 验证关键词长度
    if len(keywords) < 1:
        return APIResponse.validation_error("关键词不能为空")
    
    if len(keywords) > 50:
        return APIResponse.validation_error("关键词过长，最多50个字符")
    
    # 验证半径范围
    try:
        radius_int = int(radius)
        if not (100 <= radius_int <= 100000):
            return APIResponse.validation_error("搜索半径必须在100到100000米之间")
    except ValueError:
        return APIResponse.validation_error("半径参数必须是有效的数字")
    
    # 验证位置坐标格式
    try:
        coords = location.split(',')
        if len(coords) != 2:
            return APIResponse.validation_error("位置坐标格式错误，应为'经度,纬度'格式")
        
        longitude = float(coords[0].strip())
        latitude = float(coords[1].strip())
        
        if not (-180 <= longitude <= 180):
            return APIResponse.validation_error("经度必须在-180到180之间")
        
        if not (-90 <= latitude <= 90):
            return APIResponse.validation_error("纬度必须在-90到90之间")
            
    except ValueError:
        return APIResponse.validation_error("位置坐标参数必须是有效的数字")
    
    try:
        # 调用腾讯地图周边搜索API
        result = tencent_map_client.search_poi(
            keywords=keywords,
            location=location,
            radius=radius
        )
        
        if result.get('status') == '1' and result.get('pois'):
            return APIResponse.success(
                data=result,
                message="POI搜索成功"
            )
        else:
            return APIResponse.error(
                message="POI搜索失败",
                error_code='poi_search_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'keywords': keywords,
                    'location': location,
                    'radius': radius
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"POI搜索服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='route_planning', timeout=1800)  # 30分钟缓存，路径信息相对稳定
def get_route_planning(request):
    """
    路径规划API - 获取出行路线规划
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    origin = request.GET.get('origin', '')
    destination = request.GET.get('destination', '')
    route_type = request.GET.get('type', 'driving')  # driving, walking, transit, bicycling
    
    if not origin or not destination:
        return APIResponse.validation_error("起点和终点参数不能为空")
    
    # 验证路径类型
    if route_type not in ['driving', 'walking', 'transit', 'bicycling']:
        return APIResponse.validation_error("路径类型参数错误，应为driving(驾车)、walking(步行)、transit(公交)或bicycling(骑行)")
    
    # 验证坐标格式
    try:
        # 验证起点坐标格式
        origin_coords = origin.split(',')
        if len(origin_coords) != 2:
            return APIResponse.validation_error("起点坐标格式错误，应为'经度,纬度'格式")
        longitude = float(origin_coords[0].strip())
        latitude = float(origin_coords[1].strip())
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
    
    # 获取城市参数
    city = request.GET.get('city', '北京')
    cityd = request.GET.get('cityd', '北京')
    
    # 验证城市参数
    if len(city) > 20 or len(cityd) > 20:
        return APIResponse.validation_error("城市参数过长，最多20个字符")
    
    try:
        # 调用腾讯地图路径规划API
        result = tencent_map_client.route_planning(
            origin=origin,
            destination=destination,
            route_type=route_type,
            city=city,
            cityd=cityd
        )
        
        if result.get('status') == '1' and result.get('route'):
            return APIResponse.success(
                data=result,
                message="路径规划成功"
            )
        else:
            return APIResponse.error(
                message="路径规划失败",
                error_code='route_planning_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'origin': origin,
                    'destination': destination,
                    'type': route_type,
                    'city': city,
                    'cityd': cityd
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"路径规划服务异常: {str(e)}")

@APIExceptionHandler.handle_exception
@permission_classes([AllowAny])
@cached_api(cache_type='weather_query', timeout=1800)  # 30分钟缓存，天气信息相对稳定
def get_weather(request):
    """
    天气查询API - 获取城市天气信息
    """
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    # 验证查询参数
    city = request.GET.get('city', '')
    
    if not city:
        return APIResponse.validation_error("城市参数不能为空")
    
    # 验证城市参数长度
    if len(city) < 1:
        return APIResponse.validation_error("城市参数不能为空")
    
    if len(city) > 20:
        return APIResponse.validation_error("城市参数过长，最多20个字符")
    
    try:
        # 调用腾讯地图天气查询API
        result = tencent_map_client.get_weather(city=city)
        
        if result.get('status') == '1' and result.get('lives'):
            return APIResponse.success(
                data=result,
                message="天气查询成功"
            )
        else:
            return APIResponse.error(
                message="天气查询失败",
                error_code='weather_query_failed',
                details={
                    'error_info': result.get('info', '未知错误'),
                    'city': city
                }
            )
    except Exception as e:
        return APIResponse.server_error(f"天气查询服务异常: {str(e)}")
