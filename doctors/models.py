from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


class Doctor(models.Model):
    """医生信息模型"""
    
    # 医生职称选项
    TITLE_CHOICES = [
        ('主任医师', '主任医师'),
        ('副主任医师', '副主任医师'),
        ('主治医师', '主治医师'),
        ('住院医师', '住院医师'),
        ('助理医师', '助理医师'),
        ('实习医师', '实习医师'),
    ]
    
    # 医生性别选项
    GENDER_CHOICES = [
        ('男', '男'),
        ('女', '女'),
        ('其他', '其他'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 基本信息
    name = models.CharField(max_length=100, verbose_name='医生姓名')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, verbose_name='性别')
    birth_date = models.DateField(verbose_name='出生日期', null=True, blank=True)
    title = models.CharField(max_length=20, choices=TITLE_CHOICES, verbose_name='职称')
    
    # 所属医院和科室
    hospital = models.ForeignKey('hospitals.Hospital', on_delete=models.CASCADE, verbose_name='所属医院')
    department = models.ForeignKey('hospitals.Department', on_delete=models.CASCADE, verbose_name='所属科室')
    
    # 专业信息
    specialty = models.CharField(max_length=200, verbose_name='专业方向')
    expertise = models.TextField(verbose_name='擅长领域', blank=True)
    education = models.TextField(verbose_name='教育背景', blank=True)
    experience = models.TextField(verbose_name='工作经历', blank=True)
    
    # 联系信息
    phone = models.CharField(max_length=50, verbose_name='联系电话', blank=True)
    email = models.EmailField(verbose_name='邮箱', blank=True)
    
    # 图片信息
    avatar = models.ImageField(upload_to='doctors/avatars/', verbose_name='头像', blank=True)
    avatar_url = models.URLField(max_length=500, verbose_name='头像URL', blank=True, null=True)
    certificate_image = models.ImageField(upload_to='doctors/certificates/', verbose_name='执业证书', blank=True)
    
    # 工作安排
    work_schedule = models.JSONField(verbose_name='工作排班', default=dict, blank=True)
    appointment_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='挂号费')
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='咨询费')
    
    # 统计信息
    average_rating = models.FloatField(
        default=0.0, 
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)],
        verbose_name='平均评分'
    )
    review_count = models.IntegerField(default=0, verbose_name='评价数量')
    appointment_count = models.IntegerField(default=0, verbose_name='预约次数')
    success_rate = models.FloatField(
        default=0.0, 
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='预约成功率'
    )
    
    # 运营状态
    is_active = models.BooleanField(default=True, verbose_name='是否在职')
    is_verified = models.BooleanField(default=False, verbose_name='是否认证')
    is_available = models.BooleanField(default=True, verbose_name='是否可预约')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '医生信息'
        verbose_name_plural = '医生信息'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hospital', 'department']),
            models.Index(fields=['title']),
            models.Index(fields=['specialty']),
            models.Index(fields=['average_rating']),
            models.Index(fields=['is_available']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.title} - {self.hospital.name}"
    
    @property
    def age(self):
        """计算医生年龄"""
        if self.birth_date:
            today = timezone.now().date()
            return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        return None
    
    def update_statistics(self):
        """更新医生统计信息"""
        from appointments.models import Appointment
        
        # 更新预约统计
        total_appointments = Appointment.objects.filter(doctor=self).count()
        successful_appointments = Appointment.objects.filter(
            doctor=self, 
            status='completed'
        ).count()
        
        self.appointment_count = total_appointments
        if total_appointments > 0:
            self.success_rate = round((successful_appointments / total_appointments) * 100, 2)
        
        # 更新评价统计
        from .models import DoctorReview
        approved_reviews = DoctorReview.objects.filter(
            doctor=self, 
            is_approved=True
        )
        
        if approved_reviews.exists():
            self.review_count = approved_reviews.count()
            avg_rating = approved_reviews.aggregate(models.Avg('rating'))['rating__avg']
            self.average_rating = round(avg_rating, 1)
        
        self.save()


class DoctorSchedule(models.Model):
    """医生排班模型"""
    
    # 星期选项
    WEEKDAY_CHOICES = [
        (0, '星期一'),
        (1, '星期二'),
        (2, '星期三'),
        (3, '星期四'),
        (4, '星期五'),
        (5, '星期六'),
        (6, '星期日'),
    ]
    
    # 时间段选项
    TIME_SLOT_CHOICES = [
        ('morning', '上午 (08:00-12:00)'),
        ('afternoon', '下午 (14:00-18:00)'),
        ('evening', '晚上 (18:00-22:00)'),
        ('full_day', '全天 (08:00-18:00)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules', verbose_name='医生')
    
    # 排班信息
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES, verbose_name='星期')
    time_slot = models.CharField(max_length=20, choices=TIME_SLOT_CHOICES, verbose_name='时间段')
    start_time = models.TimeField(verbose_name='开始时间')
    end_time = models.TimeField(verbose_name='结束时间')
    
    # 预约限制
    max_appointments = models.IntegerField(default=10, verbose_name='最大预约数')
    current_appointments = models.IntegerField(default=0, verbose_name='当前预约数')
    
    # 状态信息
    is_available = models.BooleanField(default=True, verbose_name='是否可预约')
    is_recurring = models.BooleanField(default=True, verbose_name='是否循环排班')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '医生排班'
        verbose_name_plural = '医生排班'
        ordering = ['doctor', 'weekday', 'start_time']
        unique_together = ['doctor', 'weekday', 'time_slot']
    
    def __str__(self):
        return f"{self.doctor.name} - {self.get_weekday_display()} {self.get_time_slot_display()}"
    
    @property
    def available_slots(self):
        """计算剩余可预约数"""
        return max(0, self.max_appointments - self.current_appointments)
    
    def is_full(self):
        """检查是否已满"""
        return self.current_appointments >= self.max_appointments


class DoctorReview(models.Model):
    """医生评价模型"""
    
    RATING_CHOICES = [
        (1, '★'),
        (2, '★★'),
        (3, '★★★'),
        (4, '★★★★'),
        (5, '★★★★★'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='reviews', verbose_name='医生')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='评价用户')
    appointment = models.ForeignKey('appointments.Appointment', on_delete=models.CASCADE, verbose_name='相关预约', null=True, blank=True)
    
    # 评价内容
    rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='总体评分')
    title = models.CharField(max_length=200, verbose_name='评价标题', blank=True)
    content = models.TextField(verbose_name='评价内容', blank=True)
    
    # 评价维度
    attitude_rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='服务态度评分')
    professional_rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='专业水平评分')
    efficiency_rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='诊疗效率评分')
    
    # 匿名设置
    is_anonymous = models.BooleanField(default=False, verbose_name='是否匿名')
    
    # 审核状态
    is_approved = models.BooleanField(default=False, verbose_name='是否审核通过')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '医生评价'
        verbose_name_plural = '医生评价'
        ordering = ['-created_at']
        unique_together = ['doctor', 'user']
    
    def __str__(self):
        return f"{self.user.username}对{self.doctor.name}的评价"
    
    def save(self, *args, **kwargs):
        """保存评价时更新医生平均评分"""
        super().save(*args, **kwargs)
        self.update_doctor_rating()
    
    def update_doctor_rating(self):
        """更新医生平均评分"""
        approved_reviews = DoctorReview.objects.filter(
            doctor=self.doctor, 
            is_approved=True
        )
        
        if approved_reviews.exists():
            total_reviews = approved_reviews.count()
            avg_rating = approved_reviews.aggregate(models.Avg('rating'))['rating__avg']
            self.doctor.average_rating = round(avg_rating, 1)
            self.doctor.review_count = total_reviews
            self.doctor.save()


class DoctorSpecialization(models.Model):
    """医生专业特长模型"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='specializations', verbose_name='医生')
    
    # 专业信息
    specialization_name = models.CharField(max_length=100, verbose_name='专业名称')
    description = models.TextField(verbose_name='专业描述', blank=True)
    years_of_experience = models.IntegerField(default=0, verbose_name='从业年限')
    
    # 认证信息
    is_certified = models.BooleanField(default=False, verbose_name='是否认证')
    certification_date = models.DateField(verbose_name='认证日期', null=True, blank=True)
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '医生专业特长'
        verbose_name_plural = '医生专业特长'
        ordering = ['doctor', 'specialization_name']
    
    def __str__(self):
        return f"{self.doctor.name} - {self.specialization_name}"
