from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from io import BytesIO
import requests
import random
from PIL import Image
import os
from hospitals.models import Hospital, HospitalImage
from doctors.models import Doctor

class Command(BaseCommand):
    help = '爬取医院和医生图片并更新到数据库'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            choices=['hospital', 'doctor', 'all'],
            default='all',
            help='爬取类型：hospital(医院图片), doctor(医生头像), all(全部)'
        )

    def handle(self, *args, **options):
        crawl_type = options['type']
        
        if crawl_type in ['hospital', 'all']:
            self.stdout.write('开始爬取医院图片...')
            self.crawl_hospital_images()
            
        if crawl_type in ['doctor', 'all']:
            self.stdout.write('开始爬取医生头像...')
            self.crawl_doctor_avatars()
            
        self.stdout.write(self.style.SUCCESS('图片爬取任务完成!'))

    def crawl_hospital_images(self):
        """爬取医院图片"""
        hospitals = Hospital.objects.all()
        
        # 医院图片URL列表 - 使用更稳定的图片服务
        hospital_image_urls = [
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',  # 医院1
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',  # 医院2
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',  # 医院3
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',  # 医院4
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',  # 医院5
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',  # 医院6
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',  # 医院7
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',  # 医院8
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',  # 医院9
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',  # 医院10
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',  # 医院11
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',  # 医院12
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',  # 医院13
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',  # 医院14
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop'   # 医院15
        ]
        
        # 图片类型列表
        image_types = ['外观', '大厅', '科室', '设备', '环境']
        
        for i, hospital in enumerate(hospitals):
            try:
                # 选择图片URL和类型
                image_url = hospital_image_urls[i % len(hospital_image_urls)]
                image_type = image_types[i % len(image_types)]
                
                # 下载图片
                response = requests.get(image_url, timeout=10)
                if response.status_code == 200:
                    # 创建医院图片记录
                    hospital_image = HospitalImage(
                        hospital=hospital,
                        image_type=image_type,
                        description=f"{hospital.name}{image_type}图片",
                        is_primary=(i == 0)  # 第一个图片设为主图
                    )
                    
                    # 保存图片文件
                    image_name = f"hospital_{hospital.id}_{i}.jpg"
                    hospital_image.image.save(image_name, ContentFile(response.content))
                    hospital_image.save()
                    
                    # 更新医院主图片URL
                    if not hospital.image_url:
                        hospital.image_url = image_url
                        hospital.save()
                    
                    self.stdout.write(f"成功添加医院图片: {hospital.name} - {image_type}")
                else:
                    self.stdout.write(f"下载医院图片失败: {hospital.name}")
                    
            except Exception as e:
                self.stdout.write(f"处理医院图片错误 {hospital.name}: {str(e)}")

    def crawl_doctor_avatars(self):
        """爬取医生头像"""
        doctors = Doctor.objects.all()
        
        # 医生头像URL列表（模拟数据） - 使用更稳定的图片服务
        doctor_avatar_urls = [
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',  # 医生1
            'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=200&h=200&fit=crop',  # 医生2
            'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop',  # 医生3
            'https://images.unsplash.com/photo-1551601651-094a8c2d9c3c?w=200&h=200&fit=crop',  # 医生4
            'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=200&h=200&fit=crop',  # 医生5
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',  # 医生6
            'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=200&h=200&fit=crop',  # 医生7
            'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop',  # 医生8
            'https://images.unsplash.com/photo-1551601651-094a8c2d9c3c?w=200&h=200&fit=crop',  # 医生9
            'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=200&h=200&fit=crop',  # 医生10
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',  # 医生11
            'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=200&h=200&fit=crop',  # 医生12
            'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop',  # 医生13
            'https://images.unsplash.com/photo-1551601651-094a8c2d9c3c?w=200&h=200&fit=crop',  # 医生14
            'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=200&h=200&fit=crop',  # 医生15
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',  # 医生16
            'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=200&h=200&fit=crop',  # 医生17
            'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop',  # 医生18
            'https://images.unsplash.com/photo-1551601651-094a8c2d9c3c?w=200&h=200&fit=crop',  # 医生19
            'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=200&h=200&fit=crop'   # 医生20
        ]
        
        for i, doctor in enumerate(doctors):
            try:
                # 选择头像URL
                avatar_url = doctor_avatar_urls[i % len(doctor_avatar_urls)]
                
                # 下载头像
                response = requests.get(avatar_url, timeout=10)
                if response.status_code == 200:
                    # 更新医生头像
                    doctor.avatar_url = avatar_url
                    
                    # 保存头像文件
                    avatar_name = f"doctor_{doctor.id}_avatar.jpg"
                    doctor.avatar.save(avatar_name, ContentFile(response.content))
                    doctor.save()
                    
                    self.stdout.write(f"成功更新医生头像: {doctor.name}")
                else:
                    self.stdout.write(f"下载医生头像失败: {doctor.name}")
                    
            except Exception as e:
                self.stdout.write(f"处理医生头像错误 {doctor.name}: {str(e)}")

    def generate_placeholder_image(self, width, height, text):
        """生成占位图片"""
        img = Image.new('RGB', (width, height), color=(240, 240, 240))
        return img