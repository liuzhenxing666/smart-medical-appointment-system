"""
腾讯地图API客户端
用于在Django项目中集成腾讯地图API服务
"""

import requests
import json
import os
from urllib.parse import quote
from django.conf import settings


class TencentMapAPIClient:
    """腾讯地图API客户端类"""
    
    def __init__(self):
        # 从Django设置中获取腾讯地图API密钥
        self.api_key = getattr(settings, 'TENCENT_MAP_API_KEY', os.getenv('TENCENT_MAP_API_KEY', 'demo_key'))
        self.base_url = 'https://apis.map.qq.com/ws'
    
    def _make_api_request(self, endpoint, params):
        """
        发起腾讯地图API请求
        """
        # 添加API密钥
        params['key'] = self.api_key
        
        # 构建完整URL
        url = f"{self.base_url}/{endpoint}"
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            # 返回错误响应
            return {
                'status': 0,
                'message': f'API请求失败: {str(e)}',
                'info': 'SERVICE_ERROR'
            }
        except json.JSONDecodeError as e:
            return {
                'status': 0,
                'message': f'JSON解析失败: {str(e)}',
                'info': 'PARSE_ERROR'
            }
    
    def geocode(self, address, city=None):
        """
        地址解析 - 将地址转换为经纬度坐标
        """
        params = {
            'address': address,
            'output': 'json'
        }
        
        if city:
            params['region'] = city
            
        result = self._make_api_request('geocoder/v1/', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == 0 and result.get('result') and result['result'].get('location'):
            location = result['result']['location']
            return {
                'status': '1',
                'info': 'OK',
                'geocodes': [{
                    'formatted_address': result['result'].get('formatted_addresses', {}).get('recommend', ''),
                    'location': f"{location['lng']},{location['lat']}",
                    'level': result['result'].get('level', ''),
                    'adcode': result['result'].get('ad_info', {}).get('adcode', ''),
                    'province': result['result'].get('ad_info', {}).get('province', ''),
                    'city': result['result'].get('ad_info', {}).get('city', ''),
                    'district': result['result'].get('ad_info', {}).get('district', '')
                }]
            }
        else:
            return {
                'status': '0',
                'info': result.get('message', '地址解析失败'),
                'geocodes': []
            }
    
    def reverse_geocode(self, location):
        """
        逆地理编码 - 将经纬度坐标转换为地址信息
        """
        params = {
            'location': location,
            'output': 'json',
            'get_poi': 1
        }
        
        result = self._make_api_request('geocoder/v1/', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == 0 and result.get('result'):
            address_component = result['result'].get('address_component', {})
            return {
                'status': '1',
                'info': 'OK',
                'regeocode': {
                    'formatted_address': result['result'].get('address', ''),
                    'addressComponent': {
                        'country': address_component.get('nation', ''),
                        'province': address_component.get('province', ''),
                        'city': address_component.get('city', ''),
                        'district': address_component.get('district', ''),
                        'street': address_component.get('street', ''),
                        'street_number': address_component.get('street_number', '')
                    },
                    'pois': result.get('pois', [])
                }
            }
        else:
            return {
                'status': '0',
                'info': result.get('message', '逆地理编码失败'),
                'regeocode': {}
            }
    
    def calculate_distance(self, origins, destination, type='1'):
        """
        距离计算 - 计算两点之间的距离
        type: 1-驾车距离，3-步行距离
        """
        params = {
            'from': origins,
            'to': destination,
            'type': type,
            'output': 'json'
        }
        
        result = self._make_api_request('distance/v1/', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == 0 and result.get('result'):
            elements = result['result'].get('elements', [])
            if elements:
                element = elements[0]
                distance = element.get('distance', 0)
                duration = element.get('duration', 0)
                
                return {
                    'status': '1',
                    'info': 'OK',
                    'results': [{
                        'distance': distance,
                        'duration': duration,
                        'text': f"{distance/1000:.2f}公里"
                    }]
                }
        
        return {
            'status': '0',
            'info': result.get('message', '距离计算失败'),
            'results': []
        }
    
    def search_poi(self, keywords, location, radius=1000, page_size=20, page_index=1):
        """
        POI搜索 - 搜索周边兴趣点
        """
        params = {
            'keyword': keywords,
            'boundary': f"nearby({location},{radius})",
            'page_size': page_size,
            'page_index': page_index,
            'orderby': '_distance',
            'output': 'json'
        }
        
        result = self._make_api_request('place/v1/search', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == 0 and result.get('data'):
            pois = []
            for poi in result['data']:
                location_info = poi.get('location', {})
                pois.append({
                    'id': poi.get('id', ''),
                    'name': poi.get('title', ''),
                    'type': poi.get('type', ''),
                    'typecode': poi.get('typecode', ''),
                    'address': poi.get('address', ''),
                    'location': f"{location_info.get('lng', '')},{location_info.get('lat', '')}",
                    'tel': poi.get('tel', ''),
                    'distance': poi.get('distance', 0),
                    'ad_info': poi.get('ad_info', {}),
                    'category': poi.get('category', '')
                })
            
            return {
                'status': '1',
                'info': 'OK',
                'pois': pois,
                'count': len(pois)
            }
        else:
            return {
                'status': '0',
                'info': result.get('message', 'POI搜索失败'),
                'pois': [],
                'count': 0
            }
    
    def route_planning(self, from_point, to_point, type='driving', from_city=None, to_city=None):
        """
        路径规划 - 获取出行路线规划
        type: driving(驾车), walking(步行), transit(公交), bicycling(骑行)
        """
        # 根据不同路线类型选择不同的API端点
        if type == 'driving':
            endpoint = 'direction/v1/driving/'
            params = {
                'from': from_point,
                'to': to_point,
                'output': 'json'
            }
        elif type == 'walking':
            endpoint = 'direction/v1/walking/'
            params = {
                'from': from_point,
                'to': to_point,
                'output': 'json'
            }
        elif type == 'transit':
            endpoint = 'direction/v1/transit/'
            params = {
                'from': from_point,
                'to': to_point,
                'output': 'json'
            }
        elif type == 'bicycling':
            endpoint = 'direction/v1/bicycling/'
            params = {
                'from': from_point,
                'to': to_point,
                'output': 'json'
            }
        else:
            return {
                'status': '0',
                'info': '不支持的路线类型',
                'route': {}
            }
        
        # 添加城市参数（如果提供）
        if from_city:
            params['from_city'] = from_city
        if to_city:
            params['to_city'] = to_city
        
        result = self._make_api_request(endpoint, params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == 0 and result.get('result'):
            routes = result['result'].get('routes', [])
            if routes:
                route = routes[0]  # 取第一条路线
                
                # 处理路线数据
                polyline = []
                if 'polyline' in route:
                    # 腾讯地图的polyline是压缩格式，需要解压
                    polyline = route['polyline']
                
                # 计算总距离和时间
                distance = route.get('distance', 0)
                duration = route.get('duration', 0)
                
                # 处理路线步骤
                steps = []
                for step in route.get('steps', []):
                    steps.append({
                        'instruction': step.get('instruction', ''),
                        'distance': step.get('distance', 0),
                        'duration': step.get('duration', 0),
                        'polyline': step.get('polyline', '')
                    })
                
                return {
                    'status': '1',
                    'info': 'OK',
                    'route': {
                        'paths': [{
                            'distance': distance,
                            'duration': duration,
                            'steps': steps,
                            'polyline': polyline
                        }]
                    }
                }
        
        return {
            'status': '0',
            'info': result.get('message', '路径规划失败'),
            'route': {
                'paths': []
            }
        }
    
    def get_weather(self, city):
        """
        天气查询 - 获取城市天气信息
        注意：腾讯地图API不提供天气查询功能，这里返回模拟数据
        """
        # 腾讯地图API不提供天气查询，返回模拟数据
        return {
            'status': '1',
            'info': 'OK',
            'infocode': '10000',
            'lives': [{
                'province': '贵州省',
                'city': city,
                'adcode': '520100',
                'weather': '晴',
                'temperature': '25',
                'winddirection': '北',
                'windpower': '≤3',
                'humidity': '40',
                'reporttime': '2024-12-19 16:00:00'
            }]
        }


# 创建全局客户端实例
tencent_map_client = TencentMapAPIClient()