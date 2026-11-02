"""
高德地图API客户端
用于提供基于高德地图的地理位置服务
"""

import requests
import logging
import os
from django.conf import settings
from typing import Dict, List, Optional, Any
from decouple import config

logger = logging.getLogger(__name__)

class AmapClient:
    """高德地图API客户端"""
    
    def __init__(self):
        # 直接从环境变量读取API密钥
        self.api_key = config('AMAP_API_KEY', default='')
        self.base_url = config('AMAP_API_URL', default='https://restapi.amap.com')
        
        if not self.api_key:
            logger.warning("高德地图API密钥未配置，请在.env文件中添加AMAP_API_KEY")
    
    def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        发起API请求
        
        Args:
            endpoint: API端点
            params: 请求参数
            
        Returns:
            API响应数据
        """
        # 添加API密钥到参数
        params['key'] = self.api_key
        
        try:
            response = requests.get(f"{self.base_url}{endpoint}", params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"高德地图API请求失败: {str(e)}")
            return {
                'status': '0',
                'info': f'网络请求失败: {str(e)}',
                'infoCode': 'NETWORK_ERROR'
            }
    
    def geocode(self, address: str, city: str = '') -> Dict[str, Any]:
        """
        地理编码 - 将地址转换为经纬度坐标
        
        Args:
            address: 地址
            city: 城市（可选）
            
        Returns:
            地理编码结果
        """
        params = {
            'address': address,
            'city': city,
            'output': 'json'
        }
        
        return self._make_request('/v3/geocode/geo', params)
    
    def reverse_geocode(self, location: str) -> Dict[str, Any]:
        """
        逆地理编码 - 将经纬度坐标转换为地址信息
        
        Args:
            location: 经纬度坐标，格式为"经度,纬度"
            
        Returns:
            逆地理编码结果
        """
        params = {
            'location': location,
            'output': 'json'
        }
        
        return self._make_request('/v3/geocode/regeo', params)
    
    def calculate_distance(self, origins: str, destination: str, type: str = '1') -> Dict[str, Any]:
        """
        距离测量 - 计算两点之间的距离
        
        Args:
            origins: 起点坐标，格式为"经度,纬度"
            destination: 终点坐标，格式为"经度,纬度"
            type: 距离测量类型，1代表驾车距离测量，3代表步行距离测量
            
        Returns:
            距离测量结果
        """
        params = {
            'origins': origins,
            'destination': destination,
            'type': type,
            'output': 'json'
        }
        
        return self._make_request('/v3/distance', params)
    
    def search_poi(self, keywords: str, location: str, radius: str = '1000') -> Dict[str, Any]:
        """
        周边搜索 - 搜索周边兴趣点
        
        Args:
            keywords: 搜索关键词
            location: 中心点坐标，格式为"经度,纬度"
            radius: 搜索半径，单位米，默认1000米
            
        Returns:
            POI搜索结果
        """
        params = {
            'keywords': keywords,
            'location': location,
            'radius': radius,
            'output': 'json',
            'extensions': 'all'
        }
        
        return self._make_request('/v5/place/around', params)
    
    def route_planning(self, origin: str, destination: str, route_type: str = 'driving', 
                     city: str = '', cityd: str = '') -> Dict[str, Any]:
        """
        路径规划 - 获取出行路线规划
        
        Args:
            origin: 起点坐标，格式为"经度,纬度"
            destination: 终点坐标，格式为"经度,纬度"
            route_type: 路径类型，driving(驾车)、walking(步行)、transit(公交)、bicycling(骑行)
            city: 起点城市
            cityd: 终点城市
            
        Returns:
            路径规划结果
        """
        # 根据路径类型选择不同的API端点
        if route_type == 'driving':
            endpoint = '/v3/direction/driving'
        elif route_type == 'walking':
            endpoint = '/v3/direction/walking'
        elif route_type == 'bicycling':
            endpoint = '/v4/direction/bicycling'
        elif route_type == 'transit':
            endpoint = '/v3/direction/transit/integrated'
        else:
            endpoint = '/v3/direction/driving'  # 默认驾车
        
        params = {
            'origin': origin,
            'destination': destination,
            'output': 'json',
            'extensions': 'all'
        }
        
        # 公交路径规划需要城市参数
        if route_type == 'transit':
            if city:
                params['city'] = city
            if cityd:
                params['cityd'] = cityd
        
        return self._make_request(endpoint, params)
    
    def get_weather(self, city: str) -> Dict[str, Any]:
        """
        天气查询 - 获取城市天气信息
        
        Args:
            city: 城市名称
            
        Returns:
            天气查询结果
        """
        params = {
            'city': city,
            'extensions': 'base',
            'output': 'json'
        }
        
        return self._make_request('/v3/weather/weatherInfo', params)

# 创建全局高德地图客户端实例
amap_client = AmapClient()