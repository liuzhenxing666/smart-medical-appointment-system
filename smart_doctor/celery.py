"""
Celery配置
"""

import os
from celery import Celery
from celery.schedules import crontab

# 设置Django默认设置模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_doctor.settings')

app = Celery('smart_doctor')

# 使用Django的设置
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动发现任务
app.autodiscover_tasks()

# 定时任务配置
app.conf.beat_schedule = {
    # 每天凌晨2点同步医院数据
    'sync-hospital-data-daily': {
        'task': 'web_crawler.tasks.sync_hospital_data_task',
        'schedule': crontab(hour=2, minute=0),  # 每天2:00
        'args': ('贵阳', None),  # 同步贵阳所有医院
    },
    
    # 每小时同步医生排班数据
    'sync-doctor-schedules-hourly': {
        'task': 'web_crawler.tasks.sync_doctor_schedules_task',
        'schedule': crontab(minute=0),  # 每小时
        'args': (None,),  # 同步所有医院排班
    },
    
    # 每周日凌晨3点清理过期数据
    'cleanup-old-data-weekly': {
        'task': 'web_crawler.tasks.cleanup_old_data_task',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # 周日3:00
        'args': (30,),  # 清理30天前的数据
    },
}

# 时区配置
app.conf.timezone = 'Asia/Shanghai'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')