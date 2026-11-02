"""
数据同步服务模块
负责将web_crawler爬取的数据同步到主数据库
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from .models import HospitalCrawlData
from hospitals.models import Hospital, Department
from doctors.models import Doctor, DoctorSchedule
from web_crawler.services import RealTimeHospitalCrawler, DoctorScheduleCrawler

logger = logging.getLogger(__name__)


class DataSyncService:
    """数据同步服务类"""
    
    def __init__(self):
        self.hospital_crawler = RealTimeHospitalCrawler()
        self.schedule_crawler = DoctorScheduleCrawler()
        self.sync_interval_hours = 24  # 同步间隔时间（小时）
    
    def should_sync_hospital(self, hospital_name):
        """检查医院数据是否需要同步"""
        try:
            # 检查爬虫数据表中是否有该医院的记录
            crawl_data = HospitalCrawlData.objects.filter(
                hospital_name=hospital_name,
                is_active=True
            ).order_by('-crawl_time').first()
            
            if not crawl_data:
                return True  # 没有记录，需要同步
            
            # 检查是否超过同步间隔
            time_diff = timezone.now() - crawl_data.crawl_time
            return time_diff.total_seconds() > (self.sync_interval_hours * 3600)
            
        except Exception as e:
            logger.error(f"检查医院同步状态失败: {hospital_name}, 错误: {e}")
            return True
    
    def sync_hospital_data(self, hospital_name, city="贵阳"):
        """同步医院数据"""
        try:
            with transaction.atomic():
                # 1. 爬取医院基本信息
                hospitals = self.hospital_crawler.crawl_hospital_list(city)
                target_hospital = None
                
                for hospital in hospitals:
                    if hospital["name"] == hospital_name:
                        target_hospital = hospital
                        break
                
                if not target_hospital:
                    logger.warning(f"未找到医院: {hospital_name}")
                    return False
                
                # 2. 爬取科室信息
                departments = self.hospital_crawler.crawl_hospital_departments(hospital_name)
                
                # 3. 爬取医生信息（以第一个科室为例）
                sample_doctors = []
                if departments:
                    first_department = departments[0]["name"]
                    sample_doctors = self.hospital_crawler.crawl_department_doctors(
                        hospital_name, first_department
                    )
                
                # 4. 保存到爬虫数据表
                crawl_data = HospitalCrawlData(
                    hospital_name=hospital_name,
                    hospital_level=target_hospital.get("level", ""),
                    city=city,
                    address=target_hospital.get("address", ""),
                    phone=target_hospital.get("phone", ""),
                    departments=departments,
                    doctors=sample_doctors,
                    source_url=target_hospital.get("url", ""),
                    is_active=True
                )
                crawl_data.save()
                
                # 5. 同步到主数据库
                self._sync_to_main_database(hospital_name, target_hospital, departments)
                
                logger.info(f"成功同步医院数据: {hospital_name}")
                return True
                
        except Exception as e:
            logger.error(f"同步医院数据失败: {hospital_name}, 错误: {e}")
            return False
    
    def _sync_to_main_database(self, hospital_name, hospital_data, departments):
        """将数据同步到主数据库"""
        try:
            # 1. 同步医院信息
            hospital, created = Hospital.objects.update_or_create(
                name=hospital_name,
                defaults={
                    'level': hospital_data.get('level', ''),
                    'hospital_type': hospital_data.get('type', '综合医院'),
                    'address': hospital_data.get('address', ''),
                    'city': hospital_data.get('city', '贵阳'),
                    'phone': hospital_data.get('phone', ''),
                    'description': hospital_data.get('description', ''),
                }
            )
            
            # 2. 同步科室信息
            for dept_data in departments:
                department, created = Department.objects.update_or_create(
                    hospital=hospital,
                    name=dept_data['name'],
                    defaults={
                        'description': dept_data.get('description', ''),
                        'specialties': dept_data.get('specialties', ''),
                        'phone': dept_data.get('phone', ''),
                        'location': dept_data.get('location', ''),
                    }
                )
                
                # 3. 同步医生信息（如果有医生数据）
                if 'doctors' in dept_data:
                    for doctor_data in dept_data['doctors']:
                        doctor, created = Doctor.objects.update_or_create(
                            hospital=hospital,
                            department=department,
                            name=doctor_data['name'],
                            defaults={
                                'gender': doctor_data.get('gender', '男'),
                                'title': doctor_data.get('title', '主治医师'),
                                'specialty': doctor_data.get('specialty', ''),
                                'expertise': doctor_data.get('expertise', ''),
                                'experience_years': doctor_data.get('experience_years', 0),
                                'rating': doctor_data.get('rating', 0.0),
                                'consultation_fee': doctor_data.get('fee', 0.0),
                            }
                        )
            
            logger.info(f"成功同步主数据库: {hospital_name}")
            
        except Exception as e:
            logger.error(f"同步主数据库失败: {hospital_name}, 错误: {e}")
            raise
    
    def sync_doctor_schedules(self, hospital_name, department_name=None, doctor_name=None):
        """同步医生排班数据"""
        try:
            # 获取排班数据
            schedules = self.schedule_crawler.crawl_doctor_schedules(
                hospital_name, department_name, doctor_name
            )
            
            if not schedules:
                logger.warning(f"未找到排班数据: {hospital_name}")
                return False
            
            # 同步排班数据到主数据库
            for schedule_data in schedules:
                self._sync_schedule_to_database(schedule_data)
            
            logger.info(f"成功同步排班数据: {hospital_name}, 数量: {len(schedules)}")
            return True
            
        except Exception as e:
            logger.error(f"同步排班数据失败: {hospital_name}, 错误: {e}")
            return False
    
    def _sync_schedule_to_database(self, schedule_data):
        """将排班数据同步到主数据库"""
        try:
            # 查找对应的医生
            doctor = Doctor.objects.filter(
                name=schedule_data['doctor_name'],
                hospital__name=schedule_data['hospital']
            ).first()
            
            if not doctor:
                logger.warning(f"未找到医生: {schedule_data['doctor_name']}")
                return
            
            # 将日期转换为星期
            schedule_date = datetime.strptime(schedule_data['schedule_date'], '%Y-%m-%d').date()
            weekday = schedule_date.weekday()  # 0=周一, 6=周日
            
            # 将时间段映射到模型选项
            time_slot_mapping = {
                '08:00-12:00': 'morning',
                '14:00-18:00': 'afternoon',
                '18:00-22:00': 'evening',
                '08:00-18:00': 'full_day'
            }
            
            for time_slot_data in schedule_data.get('time_slots', []):
                # 映射时间段
                time_slot_key = time_slot_mapping.get(
                    f"{time_slot_data['start_time']}-{time_slot_data['end_time']}",
                    'morning'  # 默认值
                )
                
                # 同步排班信息
                DoctorSchedule.objects.update_or_create(
                    doctor=doctor,
                    weekday=weekday,
                    time_slot=time_slot_key,
                    defaults={
                        'start_time': time_slot_data['start_time'],
                        'end_time': time_slot_data['end_time'],
                        'max_appointments': time_slot_data.get('appointment_count', 10),
                        'current_appointments': time_slot_data.get('booked_count', 0),
                        'is_available': time_slot_data.get('available', True),
                    }
                )
                
        except Exception as e:
            logger.error(f"同步排班到数据库失败: {e}")
            raise
    
    def sync_all_hospitals(self, city="贵阳"):
        """同步所有医院数据"""
        try:
            # 获取城市所有医院
            hospitals = self.hospital_crawler.crawl_hospital_list(city)
            
            success_count = 0
            total_count = len(hospitals)
            
            for hospital in hospitals:
                hospital_name = hospital["name"]
                
                if self.should_sync_hospital(hospital_name):
                    if self.sync_hospital_data(hospital_name, city):
                        success_count += 1
                    
                    # 同步排班数据
                    self.sync_doctor_schedules(hospital_name)
            
            logger.info(f"医院数据同步完成: {success_count}/{total_count} 成功")
            return success_count, total_count
            
        except Exception as e:
            logger.error(f"同步所有医院数据失败: {e}")
            return 0, 0
    
    def cleanup_old_data(self, days=30):
        """清理过期数据"""
        try:
            cutoff_date = timezone.now() - timedelta(days=days)
            
            # 标记过期的爬虫数据为无效
            old_data = HospitalCrawlData.objects.filter(
                crawl_time__lt=cutoff_date,
                is_active=True
            )
            
            updated_count = old_data.update(is_active=False)
            logger.info(f"清理过期数据: {updated_count} 条记录")
            
            return updated_count
            
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")
            return 0


    def get_doctor_by_name(self, doctor_name):
        """根据医生姓名获取医生数据"""
        try:
            doctors = Doctor.objects.filter(name__icontains=doctor_name)
            return [{
                'name': doctor.name,
                'specialty': doctor.specialty,
                'hospital': doctor.hospital.name,
                'department': doctor.department.name if doctor.department else ''
            } for doctor in doctors]
        except Exception as e:
            logger.error(f"获取医生数据失败: {e}")
            return []
    
    def get_all_doctors(self):
        """获取所有医生数据"""
        try:
            doctors = Doctor.objects.all()
            return [{
                'name': doctor.name,
                'specialty': doctor.specialty,
                'hospital': doctor.hospital.name,
                'department': doctor.department.name if doctor.department else ''
            } for doctor in doctors]
        except Exception as e:
            logger.error(f"获取所有医生数据失败: {e}")
            return []
    
    def get_hospital_by_name(self, hospital_name):
        """根据医院名称获取医院数据"""
        try:
            hospitals = Hospital.objects.filter(name__icontains=hospital_name)
            return [{
                'name': hospital.name,
                'city': hospital.city,
                'level': hospital.level
            } for hospital in hospitals]
        except Exception as e:
            logger.error(f"获取医院数据失败: {e}")
            return []
    
    def get_all_hospitals(self):
        """获取所有医院数据"""
        try:
            hospitals = Hospital.objects.all()
            return [{
                'name': hospital.name,
                'city': hospital.city,
                'level': hospital.level
            } for hospital in hospitals]
        except Exception as e:
            logger.error(f"获取所有医院数据失败: {e}")
            return []
    
    def update_doctor_avatar(self, doctor_name, avatar_path):
        """更新医生头像"""
        try:
            doctor = Doctor.objects.filter(name=doctor_name).first()
            if doctor:
                doctor.avatar = avatar_path
                doctor.save()
                logger.info(f"更新医生头像成功: {doctor_name}")
                return True
            else:
                logger.warning(f"未找到医生: {doctor_name}")
                return False
        except Exception as e:
            logger.error(f"更新医生头像失败: {doctor_name}, 错误: {e}")
            return False
    
    def update_hospital_image(self, hospital_name, image_path):
        """更新医院图片"""
        try:
            hospital = Hospital.objects.filter(name=hospital_name).first()
            if hospital:
                # 这里需要根据实际的医院图片模型来更新
                # 假设有HospitalImage模型，需要创建或更新主图片
                from hospitals.models import HospitalImage
                
                # 查找或创建主图片
                primary_image, created = HospitalImage.objects.get_or_create(
                    hospital=hospital,
                    is_primary=True,
                    defaults={'image': image_path}
                )
                
                if not created:
                    primary_image.image = image_path
                    primary_image.save()
                
                logger.info(f"更新医院图片成功: {hospital_name}")
                return True
            else:
                logger.warning(f"未找到医院: {hospital_name}")
                return False
        except Exception as e:
            logger.error(f"更新医院图片失败: {hospital_name}, 错误: {e}")
            return False


# 全局同步服务实例
data_sync_service = DataSyncService()