#!/usr/bin/env python3
"""
生成导航栏图标脚本
基于现有的doctor图标，创建一套风格一致的导航栏图标
"""

import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def create_icon(text, size=(64, 64), bg_color=(102, 126, 234), text_color=(255, 255, 255)):
    """创建简单的图标"""
    # 创建图像
    img = Image.new('RGB', size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # 添加圆形背景
    draw.ellipse([5, 5, size[0]-5, size[1]-5], fill=bg_color, outline=text_color, width=2)
    
    # 添加文字（简单的图标表示）
    try:
        # 尝试使用系统字体
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        # 如果找不到字体，使用默认字体
        font = ImageFont.load_default()
    
    # 计算文字位置
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    draw.text((x, y), text, fill=text_color, font=font)
    
    return img

def create_active_icon(text, size=(64, 64), bg_color=(255, 255, 255), text_color=(102, 126, 234)):
    """创建激活状态的图标"""
    # 创建图像
    img = Image.new('RGB', size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # 添加圆形背景
    draw.ellipse([5, 5, size[0]-5, size[1]-5], fill=text_color, outline=text_color, width=2)
    
    # 添加文字
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    # 计算文字位置
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    draw.text((x, y), text, fill=bg_color, font=font)
    
    return img

def main():
    """主函数"""
    icons_dir = "miniprogram-frontend/assets/icons"
    
    # 确保目录存在
    os.makedirs(icons_dir, exist_ok=True)
    
    # 图标配置
    icons_config = [
        {"name": "home", "text": "🏠"},
        {"name": "hospital", "text": "🏥"},
        {"name": "doctor", "text": "👨‍⚕️"},
        {"name": "appointment", "text": "📅"},
        {"name": "profile", "text": "👤"}
    ]
    
    print("开始生成导航栏图标...")
    
    for config in icons_config:
        # 生成普通图标
        icon = create_icon(config["text"])
        icon_path = os.path.join(icons_dir, f"{config['name']}.png")
        icon.save(icon_path, "PNG")
        print(f"✅ 生成图标: {icon_path}")
        
        # 生成激活状态图标
        active_icon = create_active_icon(config["text"])
        active_icon_path = os.path.join(icons_dir, f"{config['name']}-active.png")
        active_icon.save(active_icon_path, "PNG")
        print(f"✅ 生成激活图标: {active_icon_path}")
    
    print("🎉 图标生成完成！")

if __name__ == "__main__":
    main()