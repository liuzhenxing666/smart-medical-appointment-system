from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


class Hospital(models.Model):
    """医院信息模型"""
    
    # 医院等级选项
    HOSPITAL_LEVEL_CHOICES = [
        ('三级甲等', '三级甲等'),
        ('三级乙等', '三级乙等'),
        ('二级甲等', '二级甲等'),
        ('二级乙等', '二级乙等'),
        ('一级甲等', '一级甲等'),
        ('一级乙等', '一级乙等'),
        ('社区医院', '社区医院'),
        ('私立医院', '私立医院'),
        ('专科医院', '专科医院'),
    ]
    
    # 医院类型选项
    HOSPITAL_TYPE_CHOICES = [
        ('综合医院', '综合医院'),
        ('专科医院', '专科医院'),
        ('中医医院', '中医医院'),
        ('妇幼保健院', '妇幼保健院'),
        ('社区卫生服务中心', '社区卫生服务中心'),
        ('私立医院', '私立医院'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name='医院名称')
    level = models.CharField(max_length=20, choices=HOSPITAL_LEVEL_CHOICES, verbose_name='医院等级')
    hospital_type = models.CharField(max_length=20, choices=HOSPITAL_TYPE_CHOICES, verbose_name='医院类型')
    
    # 位置信息
    address = models.CharField(max_length=500, verbose_name='详细地址')
    city = models.CharField(max_length=50, verbose_name='所在城市')
    district = models.CharField(max_length=50, verbose_name='所在区域')
    latitude = models.FloatField(verbose_name='纬度', null=True, blank=True)
    longitude = models.FloatField(verbose_name='经度', null=True, blank=True)
    
    # 联系信息
    phone = models.CharField(max_length=50, verbose_name='联系电话', blank=True)
    emergency_phone = models.CharField(max_length=50, verbose_name='急诊电话', blank=True)
    email = models.EmailField(verbose_name='邮箱', blank=True)
    website = models.URLField(verbose_name='官方网站', blank=True)
    
    # 医院描述
    description = models.TextField(verbose_name='医院简介', blank=True)
    specialties = models.TextField(verbose_name='特色专科', blank=True)
    facilities = models.TextField(verbose_name='医疗设施', blank=True)
    image_url = models.URLField(verbose_name='医院图片URL', blank=True, null=True)
    
    # 统计信息
    total_doctors = models.IntegerField(default=0, verbose_name='医生总数')
    total_beds = models.IntegerField(default=0, verbose_name='床位总数')
    average_rating = models.FloatField(
        default=0.0, 
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)],
        verbose_name='平均评分'
    )
    review_count = models.IntegerField(default=0, verbose_name='评价数量')
    
    # 运营状态
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    is_verified = models.BooleanField(default=False, verbose_name='是否认证')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '医院信息'
        verbose_name_plural = '医院信息'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['city', 'district']),
            models.Index(fields=['level']),
            models.Index(fields=['hospital_type']),
            models.Index(fields=['average_rating']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.level})"
    
    def update_statistics(self):
        """更新医院统计信息"""
        from doctors.models import Doctor
        self.total_doctors = Doctor.objects.filter(hospital=self, is_active=True).count()
        self.save()


class Department(models.Model):
    """医院科室模型"""
    
    # 科室类型选项
    DEPARTMENT_TYPE_CHOICES = [
        ('内科', '内科'),
        ('外科', '外科'),
        ('妇产科', '妇产科'),
        ('儿科', '儿科'),
        ('五官科', '五官科'),
        ('皮肤科', '皮肤科'),
        ('中医科', '中医科'),
        ('急诊科', '急诊科'),
        ('检验科', '检验科'),
        ('影像科', '影像科'),
        ('其他', '其他'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='departments', verbose_name='所属医院')
    name = models.CharField(max_length=100, verbose_name='科室名称')
    department_type = models.CharField(max_length=20, choices=DEPARTMENT_TYPE_CHOICES, verbose_name='科室类型')
    description = models.TextField(verbose_name='科室介绍', blank=True)
    
    # 位置信息
    floor = models.CharField(max_length=50, verbose_name='所在楼层', blank=True)
    room_number = models.CharField(max_length=50, verbose_name='房间号', blank=True)
    
    # 运营信息
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    appointment_hours = models.CharField(max_length=200, verbose_name='预约时间', blank=True)
    
    # 统计信息
    total_doctors = models.IntegerField(default=0, verbose_name='医生数量')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '医院科室'
        verbose_name_plural = '医院科室'
        ordering = ['hospital', 'name']
        unique_together = ['hospital', 'name']
    
    def __str__(self):
        return f"{self.hospital.name} - {self.name}"
    
    def update_doctor_count(self):
        """更新科室医生数量"""
        from doctors.models import Doctor
        self.total_doctors = Doctor.objects.filter(department=self, is_active=True).count()
        self.save()


class HospitalImage(models.Model):
    """医院图片模型"""
    
    IMAGE_TYPE_CHOICES = [
        ('外观', '外观'),
        ('大厅', '大厅'),
        ('科室', '科室'),
        ('设备', '设备'),
        ('环境', '环境'),
        ('其他', '其他'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='images', verbose_name='所属医院')
    image = models.ImageField(upload_to='hospitals/images/', verbose_name='图片')
    image_type = models.CharField(max_length=20, choices=IMAGE_TYPE_CHOICES, verbose_name='图片类型')
    description = models.CharField(max_length=200, verbose_name='图片描述', blank=True)
    is_primary = models.BooleanField(default=False, verbose_name='是否为主图')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '医院图片'
        verbose_name_plural = '医院图片'
        ordering = ['-is_primary', 'created_at']
    
    def __str__(self):
        return f"{self.hospital.name} - {self.image_type}"


class HospitalReview(models.Model):
    """医院评价模型"""
    
    RATING_CHOICES = [
        (1, '★'),
        (2, '★★'),
        (3, '★★★'),
        (4, '★★★★'),
        (5, '★★★★★'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='reviews', verbose_name='所属医院')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='评价用户')
    
    # 评价内容
    rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='评分')
    title = models.CharField(max_length=200, verbose_name='评价标题', blank=True)
    content = models.TextField(verbose_name='评价内容', blank=True)
    
    # 评价维度
    service_rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='服务态度评分')
    environment_rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='环境设施评分')
    medical_rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='医疗水平评分')
    
    # 匿名设置
    is_anonymous = models.BooleanField(default=False, verbose_name='是否匿名')
    
    # 审核状态
    is_approved = models.BooleanField(default=False, verbose_name='是否审核通过')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '医院评价'
        verbose_name_plural = '医院评价'
        ordering = ['-created_at']
        unique_together = ['hospital', 'user']
    
    def __str__(self):
        return f"{self.user.username}对{self.hospital.name}的评价"
    
    def save(self, *args, **kwargs):
        """保存评价时更新医院平均评分"""
        super().save(*args, **kwargs)
        self.update_hospital_rating()
    
    def update_hospital_rating(self):
        """更新医院平均评分"""
        approved_reviews = HospitalReview.objects.filter(
            hospital=self.hospital, 
            is_approved=True
        )
        
        if approved_reviews.exists():
            total_reviews = approved_reviews.count()
            avg_rating = approved_reviews.aggregate(models.Avg('rating'))['rating__avg']
            self.hospital.average_rating = round(avg_rating, 1)
            self.hospital.review_count = total_reviews
            self.hospital.save()
