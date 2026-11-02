#!/usr/bin/env python3
"""
生成现代化导航图标脚本
创建统一的线性和填充风格图标
"""

import os
from PIL import Image, ImageDraw

def create_icon(size=64, bg_color=(255, 255, 255, 0), icon_color=(142, 142, 147), is_filled=False):
    """创建基础图标模板"""
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # 如果是填充图标，使用蓝色主题色
    if is_filled:
        icon_color = (0, 122, 255)
    
    return img, draw, icon_color

def create_home_icon(size=64, is_filled=False):
    """创建首页图标"""
    img, draw, color = create_icon(size, is_filled=is_filled)
    
    # 绘制房屋轮廓
    if is_filled:
        # 填充房屋
        draw.polygon([(size//2, size//4), (size//4, size//2), (size*3//4, size//2)], fill=color)
        draw.rectangle([size//4, size//2, size*3//4, size*3//4], fill=color)
    else:
        # 线框房屋
        draw.polygon([(size//2, size//4), (size//4, size//2), (size*3//4, size//2)], outline=color, width=3)
        draw.rectangle([size//4, size//2, size*3//4, size*3//4], outline=color, width=3)
    
    return img

def create_hospital_icon(size=64, is_filled=False):
    """创建医院图标"""
    img, draw, color = create_icon(size, is_filled=is_filled)
    
    # 绘制医院十字标志
    if is_filled:
        # 填充十字
        draw.rectangle([size//4, size//4, size*3//4, size*3//4], fill=color)
        draw.rectangle([size//2-3, size//4, size//2+3, size*3//4], fill=(255,255,255))
        draw.rectangle([size//4, size//2-3, size*3//4, size//2+3], fill=(255,255,255))
    else:
        # 线框十字
        draw.rectangle([size//4, size//4, size*3//4, size*3//4], outline=color, width=3)
        draw.line([size//2, size//4, size//2, size*3//4], fill=color, width=3)
        draw.line([size//4, size//2, size*3//4, size//2], fill=color, width=3)
    
    return img

def create_doctor_icon(size=64, is_filled=False):
    """创建医生图标"""
    img, draw, color = create_icon(size, is_filled=is_filled)
    
    # 绘制听诊器图标
    if is_filled:
        # 填充听诊器
        draw.ellipse([size//4, size//4, size*3//4, size*3//4], fill=color)
        draw.ellipse([size//3, size//3, size*2//3, size*2//3], fill=(255,255,255))
    else:
        # 线框听诊器
        draw.ellipse([size//4, size//4, size*3//4, size*3//4], outline=color, width=3)
        draw.ellipse([size//3, size//3, size*2//3, size*2//3], outline=color, width=2)
    
    return img

def create_calendar_icon(size=64, is_filled=False):
    """创建日历图标"""
    img, draw, color = create_icon(size, is_filled=is_filled)
    
    # 绘制日历
    if is_filled:
        # 填充日历
        draw.rectangle([size//4, size//4, size*3//4, size*3//4], fill=color)
        draw.rectangle([size//4, size//4, size*3//4, size//3], fill=(255,255,255))
        # 日期标记
        for i in range(3):
            draw.rectangle([size//3+i*10, size//2, size//3+i*10+5, size//2+5], fill=(255,255,255))
    else:
        # 线框日历
        draw.rectangle([size//4, size//4, size*3//4, size*3//4], outline=color, width=3)
        draw.rectangle([size//4, size//4, size*3//4, size//3], outline=color, width=3)
        # 日期标记
        for i in range(3):
            draw.rectangle([size//3+i*10, size//2, size//3+i*10+5, size//2+5], fill=color)
    
    return img

def create_profile_icon(size=64, is_filled=False):
    """创建个人资料图标"""
    img, draw, color = create_icon(size, is_filled=is_filled)
    
    # 绘制用户头像
    if is_filled:
        # 填充头像
        draw.ellipse([size//4, size//4, size*3//4, size*3//4], fill=color)
        draw.ellipse([size//3, size//3, size*2//3, size*2//3], fill=(255,255,255))
    else:
        # 线框头像
        draw.ellipse([size//4, size//4, size*3//4, size*3//4], outline=color, width=3)
        draw.ellipse([size//3, size//3, size*2//3, size*2//3], outline=color, width=2)
    
    return img

def generate_all_icons():
    """生成所有图标"""
    icons_dir = "miniprogram-frontend/assets/icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    # 图标生成配置
    icons_config = [
        ("home-outline", create_home_icon, False),
        ("home-filled", create_home_icon, True),
        ("hospital-outline", create_hospital_icon, False),
        ("hospital-filled", create_hospital_icon, True),
        ("doctor-outline", create_doctor_icon, False),
        ("doctor-filled", create_doctor_icon, True),
        ("calendar-outline", create_calendar_icon, False),
        ("calendar-filled", create_calendar_icon, True),
        ("profile-outline", create_profile_icon, False),
        ("profile-filled", create_profile_icon, True),
    ]
    
    print("开始生成现代化导航图标...")
    
    for icon_name, icon_func, is_filled in icons_config:
        # 生成64x64图标
        icon = icon_func(64, is_filled)
        icon_path = os.path.join(icons_dir, f"{icon_name}.png")
        icon.save(icon_path)
        print(f"✅ 生成图标: {icon_name}.png")
    
    print("🎉 所有图标生成完成！")

if __name__ == "__main__":
    generate_all_icons()