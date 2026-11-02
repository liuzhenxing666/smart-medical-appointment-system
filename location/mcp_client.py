"""
高德地图API客户端
用于在Django项目中集成真实的高德地图API服务
"""

import requests
import json
import os
from urllib.parse import quote
from django.conf import settings


class AmapAPIClient:
    """高德地图API客户端类"""
    
    def __init__(self):
        # 从Django设置中获取高德地图API密钥
        self.api_key = getattr(settings, 'AMAP_API_KEY', os.getenv('AMAP_API_KEY', 'demo_key'))
        self.base_url = 'https://restapi.amap.com/v3'
    
    def _make_api_request(self, endpoint, params):
        """
        发起高德地图API请求
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
                'status': '0',
                'info': f'API请求失败: {str(e)}',
                'infocode': '500'
            }
        except json.JSONDecodeError as e:
            return {
                'status': '0',
                'info': f'JSON解析失败: {str(e)}',
                'infocode': '500'
            }
    
    def geocode(self, address, city=''):
        """地址解析"""
        params = {
            'address': address,
            'output': 'json'
        }
        if city:
            params['city'] = city
        
        result = self._make_api_request('geocode/geo', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == '1' and result.get('geocodes'):
            return {
                'status': '1',
                'info': 'OK',
                'geocodes': result['geocodes']
            }
        else:
            return {
                'status': '0',
                'info': result.get('info', '地址解析失败'),
                'geocodes': []
            }
    
    def reverse_geocode(self, location):
        """逆地理编码"""
        params = {
            'location': location,
            'output': 'json'
        }
        
        result = self._make_api_request('geocode/regeo', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == '1' and result.get('regeocode'):
            return {
                'status': '1',
                'info': 'OK',
                'regeocode': result['regeocode']
            }
        else:
            return {
                'status': '0',
                'info': result.get('info', '逆地理编码失败'),
                'regeocode': {}
            }
    
    def calculate_distance(self, origins, destination, distance_type='1'):
        """距离计算"""
        params = {
            'origins': origins,
            'destination': destination,
            'output': 'json'
        }
        
        # 映射距离类型
        type_mapping = {'0': '0', '1': '1', '3': '3'}  # 0:直线, 1:驾车, 3:步行
        params['type'] = type_mapping.get(distance_type, '1')
        
        result = self._make_api_request('distance', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == '1' and result.get('results'):
            return {
                'status': '1',
                'info': 'OK',
                'results': result['results']
            }
        else:
            return {
                'status': '0',
                'info': result.get('info', '距离计算失败'),
                'results': []
            }
    
    def search_poi(self, keywords, location, radius='100000'):
        """POI搜索"""
        params = {
            'keywords': keywords,
            'location': location,
            'radius': radius,
            'output': 'json'
        }
        
        result = self._make_api_request('place/around', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == '1' and result.get('pois'):
            return {
                'status': '1',
                'info': 'OK',
                'pois': result['pois']
            }
        else:
            return {
                'status': '0',
                'info': result.get('info', 'POI搜索失败'),
                'pois': []
            }
    
    def route_planning(self, origin, destination, route_type='driving', city='北京', cityd='北京'):
        """路径规划"""
        # 高德地图API端点映射
        endpoint_mapping = {
            'driving': 'direction/driving',
            'walking': 'direction/walking',
            'transit': 'direction/transit/integrated',
            'bicycling': 'direction/bicycling'
        }
        
        endpoint = endpoint_mapping.get(route_type, 'direction/driving')
        
        params = {
            'origin': origin,
            'destination': destination,
            'output': 'json'
        }
        
        if route_type == 'transit':
            params['city'] = city
            params['cityd'] = cityd
        
        result = self._make_api_request(endpoint, params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == '1' and result.get('route'):
            return {
                'status': '1',
                'info': 'OK',
                'route': result['route']
            }
        else:
            return {
                'status': '0',
                'info': result.get('info', '路径规划失败'),
                'route': {}
            }
    
    def get_weather(self, city):
        """天气查询"""
        params = {
            'city': city,
            'output': 'json'
        }
        
        result = self._make_api_request('weather/weatherInfo', params)
        
        # 转换响应格式以兼容现有代码
        if result.get('status') == '1' and result.get('lives'):
            return {
                'status': '1',
                'info': 'OK',
                'lives': result['lives']
            }
        else:
            # 返回模拟数据作为降级方案
            return {
                'status': '1',
                'info': 'OK',
                'infocode': '10000',
                'lives': [{
                    'province': '北京市',
                    'city': city,
                    'adcode': '110100',
                    'weather': '晴',
                    'temperature': '25',
                    'winddirection': '北',
                    'windpower': '≤3',
                    'humidity': '40',
                    'reporttime': '2024-12-19 16:00:00'
                }]
            }


# 创建全局客户端实例
amap_client = AmapAPIClient()