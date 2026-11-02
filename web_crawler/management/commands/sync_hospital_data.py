"""
Django管理命令：同步医院数据
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from web_crawler.sync_services import data_sync_service


class Command(BaseCommand):
    help = '同步医院、医生和排班数据'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--city',
            type=str,
            default='贵阳',
            help='要同步的城市名称（默认：贵阳）'
        )
        parser.add_argument(
            '--hospital',
            type=str,
            help='指定要同步的医院名称'
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='清理过期数据'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='清理多少天前的数据（默认：30）'
        )
    
    def handle(self, *args, **options):
        city = options['city']
        hospital_name = options['hospital']
        cleanup = options['cleanup']
        days = options['days']
        
        self.stdout.write(f"开始数据同步任务 - 时间: {timezone.now()}")
        
        # 清理过期数据
        if cleanup:
            self.stdout.write(f"清理 {days} 天前的过期数据...")
            cleaned_count = data_sync_service.cleanup_old_data(days)
            self.stdout.write(f"清理完成: {cleaned_count} 条记录")
        
        # 同步指定医院数据
        if hospital_name:
            self.stdout.write(f"同步指定医院数据: {hospital_name}")
            
            # 同步医院基本信息
            if data_sync_service.sync_hospital_data(hospital_name, city):
                self.stdout.write(
                    self.style.SUCCESS(f"成功同步医院数据: {hospital_name}")
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"同步医院数据失败: {hospital_name}")
                )
            
            # 同步排班数据
            if data_sync_service.sync_doctor_schedules(hospital_name):
                self.stdout.write(
                    self.style.SUCCESS(f"成功同步排班数据: {hospital_name}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"同步排班数据失败或无数据: {hospital_name}")
                )
        
        # 同步所有医院数据
        else:
            self.stdout.write(f"同步 {city} 所有医院数据...")
            success_count, total_count = data_sync_service.sync_all_hospitals(city)
            
            if success_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"医院数据同步完成: {success_count}/{total_count} 成功"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"医院数据同步完成: {success_count}/{total_count} 成功"
                    )
                )
        
        self.stdout.write(f"数据同步任务完成 - 时间: {timezone.now()}")