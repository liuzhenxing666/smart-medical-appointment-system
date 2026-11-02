#!/usr/bin/env python
"""
修复医院坐标的脚本
为重复的医院名称添加不同的坐标
"""

import os
import sys
import django
import random
from django.conf import settings

# 添加项目路径到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_doctor.settings')
django.setup()

from hospitals.models import Hospital

def fix_duplicate_hospital_coordinates():
    """为重复的医院名称添加不同的坐标"""
    
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
        '西安': (108.940174, 34.341568),
        '贵阳': (106.630153, 26.647661)
    }
    
    hospitals = Hospital.objects.all()
    hospital_names = {}
    
    # 统计每个医院名称出现的次数
    for hospital in hospitals:
        if hospital.name not in hospital_names:
            hospital_names[hospital.name] = []
        hospital_names[hospital.name].append(hospital)
    
    updated_count = 0
    
    for name, hospital_list in hospital_names.items():
        if len(hospital_list) > 1:
            print(f"处理重复医院: {name} (共{len(hospital_list)}个)")
            
            for i, hospital in enumerate(hospital_list):
                # 根据医院所在城市设置基础坐标
                if hospital.city in city_coordinates:
                    base_lng, base_lat = city_coordinates[hospital.city]
                else:
                    # 默认使用贵阳坐标
                    base_lng, base_lat = city_coordinates['贵阳']
                
                # 为每个重复的医院添加不同的偏移量
                offset_lng = random.uniform(-0.01, 0.01) * (i + 1)
                offset_lat = random.uniform(-0.01, 0.01) * (i + 1)
                
                new_longitude = base_lng + offset_lng
                new_latitude = base_lat + offset_lat
                
                hospital.longitude = new_longitude
                hospital.latitude = new_latitude
                hospital.save()
                updated_count += 1
                
                print(f"  {hospital.name} - 坐标: {new_longitude:.6f}, {new_latitude:.6f}")
    
    print(f"\n完成! 为 {updated_count} 家医院更新了坐标")

def verify_hospital_coordinates():
    """验证医院坐标"""
    hospitals = Hospital.objects.all()
    
    print("医院坐标验证:")
    for hospital in hospitals:
        print(f"{hospital.name} - {hospital.city} - 经度:{hospital.longitude} 纬度:{hospital.latitude}")
    
    # 检查是否有重复坐标
    coordinates_set = set()
    duplicate_count = 0
    
    for hospital in hospitals:
        if hospital.longitude and hospital.latitude:
            coord = (hospital.longitude, hospital.latitude)
            if coord in coordinates_set:
                duplicate_count += 1
                print(f"警告: 重复坐标 - {hospital.name}")
            coordinates_set.add(coord)
    
    print(f"\n坐标统计: 总医院数: {hospitals.count()}, 重复坐标数: {duplicate_count}")

if __name__ == "__main__":
    print("医院坐标修复脚本")
    print("1. 修复重复医院坐标")
    print("2. 验证医院坐标")
    
    choice = input("请选择 (1/2): ").strip()
    
    if choice == "1":
        fix_duplicate_hospital_coordinates()
    elif choice == "2":
        verify_hospital_coordinates()
    else:
        print("无效选择")