"""
Django管理命令：同步医疗图片数据
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from web_crawler.services import MedicalImageCrawler
from web_crawler.sync_services import data_sync_service


class Command(BaseCommand):
    help = '同步医生头像和医院图片数据'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            choices=['doctor', 'hospital', 'all'],
            default='all',
            help='同步类型：doctor(医生头像), hospital(医院图片), all(全部)'
        )
        parser.add_argument(
            '--hospital',
            type=str,
            help='指定要同步图片的医院名称'
        )
        parser.add_argument(
            '--doctor',
            type=str,
            help='指定要同步头像的医生名称'
        )
        parser.add_argument(
            '--download',
            action='store_true',
            help='下载图片到本地媒体目录'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=10,
            help='最大处理数量限制（默认：10）'
        )
    
    def handle(self, *args, **options):
        sync_type = options['type']
        hospital_name = options['hospital']
        doctor_name = options['doctor']
        download = options['download']
        limit = options['limit']
        
        self.stdout.write(f"开始医疗图片同步任务 - 时间: {timezone.now()}")
        
        # 初始化图片爬虫
        image_crawler = MedicalImageCrawler()
        
        # 同步医生头像
        if sync_type in ['doctor', 'all']:
            self.sync_doctor_avatars(image_crawler, doctor_name, download, limit)
        
        # 同步医院图片
        if sync_type in ['hospital', 'all']:
            self.sync_hospital_images(image_crawler, hospital_name, download, limit)
        
        self.stdout.write(f"医疗图片同步任务完成 - 时间: {timezone.now()}")
    
    def sync_doctor_avatars(self, image_crawler, doctor_name=None, download=False, limit=10):
        """同步医生头像"""
        self.stdout.write("开始同步医生头像...")
        
        # 获取医生数据
        if doctor_name:
            # 获取指定医生的数据
            doctors_data = data_sync_service.get_doctor_by_name(doctor_name)
            if not doctors_data:
                self.stdout.write(self.style.WARNING(f"未找到医生: {doctor_name}"))
                return
        else:
            # 获取所有医生数据
            doctors_data = data_sync_service.get_all_doctors()[:limit]
        
        if not doctors_data:
            self.stdout.write(self.style.WARNING("没有找到医生数据"))
            return
        
        self.stdout.write(f"处理 {len(doctors_data)} 位医生的头像...")
        
        # 下载或获取图片URL
        if download:
            results = image_crawler.batch_download_doctor_avatars(doctors_data)
            
            # 更新数据库中的头像路径
            for doctor_name, avatar_path in results.items():
                if avatar_path:
                    success = data_sync_service.update_doctor_avatar(doctor_name, avatar_path)
                    if success:
                        self.stdout.write(self.style.SUCCESS(f"更新医生头像: {doctor_name}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"更新医生头像失败: {doctor_name}"))
        else:
            # 只获取图片URL，不下载
            for doctor in doctors_data:
                doctor_name = doctor.get('name', 'unknown')
                specialty = doctor.get('specialty', '')
                
                avatar_urls = image_crawler.crawl_doctor_avatars(doctor_name, specialty)
                
                if avatar_urls:
                    self.stdout.write(f"医生 {doctor_name} 的头像URL: {avatar_urls[0]}")
                else:
                    self.stdout.write(self.style.WARNING(f"未找到医生 {doctor_name} 的头像"))
        
        self.stdout.write("医生头像同步完成")
    
    def sync_hospital_images(self, image_crawler, hospital_name=None, download=False, limit=10):
        """同步医院图片"""
        self.stdout.write("开始同步医院图片...")
        
        # 获取医院数据
        if hospital_name:
            # 获取指定医院的数据
            hospitals_data = data_sync_service.get_hospital_by_name(hospital_name)
            if not hospitals_data:
                self.stdout.write(self.style.WARNING(f"未找到医院: {hospital_name}"))
                return
        else:
            # 获取所有医院数据
            hospitals_data = data_sync_service.get_all_hospitals()[:limit]
        
        if not hospitals_data:
            self.stdout.write(self.style.WARNING("没有找到医院数据"))
            return
        
        self.stdout.write(f"处理 {len(hospitals_data)} 家医院的图片...")
        
        # 下载或获取图片URL
        if download:
            results = image_crawler.batch_download_hospital_images(hospitals_data)
            
            # 更新数据库中的图片路径
            for hospital_name, image_path in results.items():
                if image_path:
                    success = data_sync_service.update_hospital_image(hospital_name, image_path)
                    if success:
                        self.stdout.write(self.style.SUCCESS(f"更新医院图片: {hospital_name}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"更新医院图片失败: {hospital_name}"))
        else:
            # 只获取图片URL，不下载
            for hospital in hospitals_data:
                hospital_name = hospital.get('name', 'unknown')
                
                hospital_images = image_crawler.crawl_hospital_images(hospital_name)
                
                if hospital_images:
                    self.stdout.write(f"医院 {hospital_name} 的图片URL: {hospital_images[0]}")
                else:
                    self.stdout.write(self.style.WARNING(f"未找到医院 {hospital_name} 的图片"))
        
        self.stdout.write("医院图片同步完成")