"""
定时任务配置
"""

from celery import shared_task
from django.utils import timezone
from .sync_services import data_sync_service


@shared_task
def sync_hospital_data_task(city="贵阳", hospital_name=None):
    """同步医院数据定时任务"""
    try:
        if hospital_name:
            # 同步指定医院
            result = data_sync_service.sync_hospital_data(hospital_name, city)
            if result:
                print(f"定时任务成功同步医院数据: {hospital_name}")
            else:
                print(f"定时任务同步医院数据失败: {hospital_name}")
        else:
            # 同步所有医院
            success_count, total_count = data_sync_service.sync_all_hospitals(city)
            print(f"定时任务同步完成: {success_count}/{total_count} 成功")
            
        return {
            'status': 'success',
            'timestamp': timezone.now().isoformat(),
            'city': city,
            'hospital': hospital_name
        }
    except Exception as e:
        print(f"定时任务执行失败: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def cleanup_old_data_task(days=30):
    """清理过期数据定时任务"""
    try:
        cleaned_count = data_sync_service.cleanup_old_data(days)
        print(f"定时任务清理过期数据: {cleaned_count} 条记录")
        
        return {
            'status': 'success',
            'cleaned_count': cleaned_count,
            'timestamp': timezone.now().isoformat()
        }
    except Exception as e:
        print(f"清理任务执行失败: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def sync_doctor_schedules_task(hospital_name=None):
    """同步医生排班数据定时任务"""
    try:
        if hospital_name:
            # 同步指定医院排班
            result = data_sync_service.sync_doctor_schedules(hospital_name)
            if result:
                print(f"定时任务成功同步排班数据: {hospital_name}")
            else:
                print(f"定时任务同步排班数据失败或无数据: {hospital_name}")
        else:
            # 同步所有医院排班（需要先获取医院列表）
            hospitals = data_sync_service.hospital_crawler.crawl_hospital_list("贵阳")
            success_count = 0
            
            for hospital in hospitals:
                hospital_name = hospital["name"]
                if data_sync_service.sync_doctor_schedules(hospital_name):
                    success_count += 1
            
            print(f"定时任务排班同步完成: {success_count}/{len(hospitals)} 成功")
        
        return {
            'status': 'success',
            'timestamp': timezone.now().isoformat(),
            'hospital': hospital_name
        }
    except Exception as e:
        print(f"排班同步任务执行失败: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }