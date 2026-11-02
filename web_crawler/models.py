from django.db import models


class HospitalCrawlData(models.Model):
    """医院爬虫数据模型"""
    hospital_name = models.CharField(max_length=200, verbose_name="医院名称")
    hospital_level = models.CharField(max_length=50, verbose_name="医院等级", null=True, blank=True)
    city = models.CharField(max_length=50, verbose_name="所在城市", null=True, blank=True)
    address = models.TextField(verbose_name="医院地址", null=True, blank=True)
    phone = models.CharField(max_length=50, verbose_name="联系电话", null=True, blank=True)
    
    # 科室信息
    departments = models.JSONField(default=list, verbose_name="科室列表")
    
    # 医生信息
    doctors = models.JSONField(default=list, verbose_name="医生列表")
    
    # 爬虫相关字段
    source_url = models.URLField(max_length=500, verbose_name="数据来源URL")
    crawl_time = models.DateTimeField(auto_now_add=True, verbose_name="爬取时间")
    is_active = models.BooleanField(default=True, verbose_name="是否有效")
    
    class Meta:
        db_table = 'hospital_crawl_data'
        verbose_name = '医院爬虫数据'
        verbose_name_plural = '医院爬虫数据'
        
    def __str__(self):
        return f"{self.hospital_name} - {self.crawl_time.strftime('%Y-%m-%d %H:%M')}"


class DoctorCrawlData(models.Model):
    """医生爬虫数据模型"""
    name = models.CharField(max_length=100, verbose_name="医生姓名")
    title = models.CharField(max_length=100, verbose_name="职称", null=True, blank=True)
    department = models.CharField(max_length=100, verbose_name="所属科室")
    hospital = models.CharField(max_length=200, verbose_name="所属医院")
    specialty = models.TextField(verbose_name="擅长领域", null=True, blank=True)
    experience = models.CharField(max_length=100, verbose_name="从业经验", null=True, blank=True)
    
    # 爬虫相关字段
    source_url = models.URLField(max_length=500, verbose_name="数据来源URL")
    crawl_time = models.DateTimeField(auto_now_add=True, verbose_name="爬取时间")
    is_active = models.BooleanField(default=True, verbose_name="是否有效")
    
    class Meta:
        db_table = 'doctor_crawl_data'
        verbose_name = '医生爬虫数据'
        verbose_name_plural = '医生爬虫数据'
        
    def __str__(self):
        return f"{self.name} - {self.department} - {self.hospital}"


class CrawlLog(models.Model):
    """爬虫日志模型"""
    LOG_LEVEL_CHOICES = [
        ('INFO', '信息'),
        ('WARNING', '警告'),
        ('ERROR', '错误'),
        ('DEBUG', '调试'),
    ]
    
    LOG_TYPE_CHOICES = [
        ('HOSPITAL', '医院数据'),
        ('DOCTOR', '医生数据'),
        ('SCHEDULE', '排班数据'),
        ('SYNC', '数据同步'),
        ('CLEANUP', '数据清理'),
    ]
    
    log_type = models.CharField(max_length=20, choices=LOG_TYPE_CHOICES, verbose_name="日志类型")
    level = models.CharField(max_length=10, choices=LOG_LEVEL_CHOICES, verbose_name="日志级别")
    message = models.TextField(verbose_name="日志消息")
    hospital_name = models.CharField(max_length=200, verbose_name="医院名称", null=True, blank=True)
    doctor_name = models.CharField(max_length=100, verbose_name="医生姓名", null=True, blank=True)
    
    # 执行信息
    execution_time = models.FloatField(verbose_name="执行时间(秒)", null=True, blank=True)
    records_processed = models.IntegerField(verbose_name="处理记录数", default=0)
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    
    class Meta:
        db_table = 'crawl_log'
        verbose_name = '爬虫日志'
        verbose_name_plural = '爬虫日志'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_log_type_display()} - {self.get_level_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"