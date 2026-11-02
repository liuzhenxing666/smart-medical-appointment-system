#!/usr/bin/env python
"""
为医院数据添加经纬度坐标的脚本
使用高德地图地理编码API获取医院地址的经纬度
"""

import os
import sys
import django
import requests
import time
from django.conf import settings

# 添加项目路径到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_doctor.settings')
django.setup()

from hospitals.models import Hospital

def get_coordinates_from_amap(address, city=None):
    """
    使用高德地图API获取地址的经纬度
    """
    # 这里需要配置高德地图API密钥
    # 实际使用时需要申请并配置高德地图API密钥
    api_key = "您的高德地图API密钥"  # 需要替换为实际的API密钥
    
    if api_key == "您的高德地图API密钥":
        print(f"警告: 未配置高德地图API密钥，使用模拟坐标")
        # 返回模拟坐标（广州中心坐标）
        return 113.264385, 23.129112
    
    base_url = "https://restapi.amap.com/v3/geocode/geo"
    params = {
        'key': api_key,
        'address': address,
        'city': city or '',
        'output': 'json'
    }
    
    try:
        response = requests.get(base_url, params=params, timeout=10)
        data = response.json()
        
        if data['status'] == '1' and data['geocodes']:
            location = data['geocodes'][0]['location']
            lng, lat = map(float, location.split(','))
            return lng, lat
        else:
            print(f"地理编码失败: {data.get('info', '未知错误')}")
            return None, None
            
    except Exception as e:
        print(f"请求高德地图API失败: {e}")
        return None, None

def add_coordinates_to_hospitals():
    """为所有医院添加经纬度坐标"""
    hospitals = Hospital.objects.all()
    
    print(f"开始为 {hospitals.count()} 家医院添加坐标...")
    
    updated_count = 0
    for hospital in hospitals:
        # 如果已经有坐标，跳过
        if hospital.longitude and hospital.latitude:
            print(f"跳过 {hospital.name} - 已有坐标")
            continue
        
        print(f"处理 {hospital.name}...")
        
        # 构建完整的地址
        full_address = f"{hospital.city}{hospital.district}{hospital.address}"
        
        # 获取经纬度
        longitude, latitude = get_coordinates_from_amap(full_address, hospital.city)
        
        if longitude and latitude:
            hospital.longitude = longitude
            hospital.latitude = latitude
            hospital.save()
            updated_count += 1
            print(f"  ✓ 添加坐标: {longitude}, {latitude}")
        else:
            print(f"  ✗ 获取坐标失败")
        
        # 避免请求过于频繁
        time.sleep(0.5)
    
    print(f"\n完成! 成功为 {updated_count} 家医院添加了坐标")

def add_sample_coordinates():
    """为医院添加示例坐标（用于演示）"""
    # 主要城市的坐标（示例数据）
    city_coordinates = {
        '北京': (116.407394, 39.904211),
        '上海': (121.473701, 31.230416),
        '广州': (113.264385, 23.129112),
        '深圳': (114.057868, 22.543099),
        '杭州': (120.155070, 30.274084),
        '南京': (118.796877, 32.060255),
        '武汉': (114.305392, 30.593099),
        '成都': (104.066541, 30.572269),
        '重庆': (106.551643, 29.562849),
        '西安': (108.940174, 34.341568)
    }
    
    hospitals = Hospital.objects.all()
    updated_count = 0
    
    for hospital in hospitals:
        if not hospital.longitude or not hospital.latitude:
            # 根据城市添加示例坐标
            if hospital.city in city_coordinates:
                base_lng, base_lat = city_coordinates[hospital.city]
                # 在基础坐标上添加小的偏移量，使每个医院位置不同
                import random
                offset_lng = random.uniform(-0.02, 0.02)
                offset_lat = random.uniform(-0.02, 0.02)
                
                hospital.longitude = base_lng + offset_lng
                hospital.latitude = base_lat + offset_lat
                hospital.save()
                updated_count += 1
                print(f"为 {hospital.name} 添加示例坐标: {hospital.longitude:.6f}, {hospital.latitude:.6f}")
    
    print(f"\n完成! 为 {updated_count} 家医院添加了示例坐标")

if __name__ == "__main__":
    print("医院坐标添加脚本")
    print("1. 使用高德地图API添加真实坐标（需要配置API密钥）")
    print("2. 添加示例坐标（用于演示）")
    
    choice = input("请选择 (1/2): ").strip()
    
    if choice == "1":
        add_coordinates_to_hospitals()
    elif choice == "2":
        add_sample_coordinates()
    else:
        print("无效选择")