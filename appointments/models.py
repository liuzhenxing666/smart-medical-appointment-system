from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


class Appointment(models.Model):
    """预约信息模型"""
    
    # 预约状态选项
    STATUS_CHOICES = [
        ('pending', '待确认'),
        ('confirmed', '已确认'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
        ('no_show', '未到诊'),
        ('rescheduled', '已改期'),
    ]
    
    # 预约类型选项
    TYPE_CHOICES = [
        ('regular', '普通门诊'),
        ('emergency', '急诊'),
        ('follow_up', '复诊'),
        ('consultation', '咨询'),
        ('surgery', '手术'),
        ('examination', '检查'),
    ]
    
    # 支付状态选项
    PAYMENT_STATUS_CHOICES = [
        ('pending', '待支付'),
        ('paid', '已支付'),
        ('refunded', '已退款'),
        ('failed', '支付失败'),
        ('cancelled', '已取消'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 预约基本信息
    appointment_number = models.CharField(max_length=50, unique=True, verbose_name='预约编号')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='预约用户')
    doctor = models.ForeignKey('doctors.Doctor', on_delete=models.CASCADE, verbose_name='预约医生')
    hospital = models.ForeignKey('hospitals.Hospital', on_delete=models.CASCADE, verbose_name='预约医院')
    department = models.ForeignKey('hospitals.Department', on_delete=models.CASCADE, verbose_name='预约科室')
    
    # 预约时间信息
    appointment_date = models.DateField(verbose_name='预约日期')
    appointment_time = models.TimeField(verbose_name='预约时间')
    time_slot = models.CharField(max_length=20, verbose_name='时间段')
    
    # 预约详情
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='regular', verbose_name='预约类型')
    symptoms = models.TextField(verbose_name='症状描述', blank=True)
    medical_history = models.TextField(verbose_name='病史信息', blank=True)
    special_requirements = models.TextField(verbose_name='特殊要求', blank=True)
    
    # 费用信息
    appointment_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='挂号费')
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='咨询费')
    total_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='总费用')
    
    # 状态信息
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='预约状态')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending', verbose_name='支付状态')
    
    # 审核信息
    is_approved = models.BooleanField(default=False, verbose_name='是否审核通过')
    approval_notes = models.TextField(verbose_name='审核备注', blank=True)
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_appointments', verbose_name='审核人')
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='审核时间')
    
    # 取消/改期信息
    cancellation_reason = models.TextField(verbose_name='取消原因', blank=True)
    cancelled_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_appointments', verbose_name='取消人')
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name='取消时间')
    
    # 完成信息
    diagnosis = models.TextField(verbose_name='诊断结果', blank=True)
    prescription = models.TextField(verbose_name='处方信息', blank=True)
    medical_notes = models.TextField(verbose_name='医疗记录', blank=True)
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')
    
    # 提醒信息
    reminder_sent = models.BooleanField(default=False, verbose_name='是否发送提醒')
    reminder_sent_at = models.DateTimeField(null=True, blank=True, verbose_name='提醒发送时间')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '预约信息'
        verbose_name_plural = '预约信息'
        ordering = ['-appointment_date', '-appointment_time']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['doctor', 'appointment_date']),
            models.Index(fields=['hospital', 'appointment_date']),
            models.Index(fields=['status', 'appointment_date']),
            models.Index(fields=['payment_status']),
        ]
    
    def __str__(self):
        return f"{self.appointment_number} - {self.user.username} - {self.doctor.name}"
    
    def save(self, *args, **kwargs):
        """保存时自动生成预约编号并更新排班数据"""
        is_new = self._state.adding  # 检查是否为新建对象
        
        if not self.appointment_number:
            self.appointment_number = self.generate_appointment_number()
        
        # 自动计算总费用
        self.total_fee = self.appointment_fee + self.consultation_fee
        
        # 调用父类保存方法
        super().save(*args, **kwargs)
        
        # 如果是新建预约，更新对应排班的current_appointments字段
        if is_new:
            self.update_schedule_appointment_count()
    
    def update_schedule_appointment_count(self):
        """更新对应排班的预约计数"""
        try:
            # 根据预约日期、医生和时间段查找对应的排班
            from doctors.models import DoctorSchedule
            from datetime import datetime
            
            # 将预约日期转换为星期几 (0=周一, 6=周日)
            weekday = self.appointment_date.weekday()
            
            # 查找对应的排班记录
            schedule = DoctorSchedule.objects.filter(
                doctor=self.doctor,
                weekday=weekday,
                time_slot=self.time_slot
            ).first()
            
            if schedule:
                # 更新排班的current_appointments字段
                schedule.current_appointments += 1
                schedule.save()
                print(f"已更新医生 {self.doctor.name} 星期{weekday+1} {self.time_slot} 排班的预约计数")
            else:
                print(f"未找到对应的排班记录: 医生 {self.doctor.name}, 星期{weekday+1}, 时间段 {self.time_slot}")
                
        except Exception as e:
            print(f"更新排班预约计数时出错: {str(e)}")
    
    def generate_appointment_number(self):
        """生成预约编号：AP + 年月日 + 6位随机数"""
        from datetime import datetime
        import random
        
        date_str = datetime.now().strftime('%Y%m%d')
        random_str = str(random.randint(100000, 999999))
        return f"AP{date_str}{random_str}"
    
    @property
    def is_upcoming(self):
        """检查是否为即将到来的预约"""
        from datetime import datetime, time as dt_time
        
        appointment_datetime = datetime.combine(self.appointment_date, self.appointment_time)
        # 将naive datetime转换为aware datetime
        appointment_datetime = timezone.make_aware(appointment_datetime)
        now = timezone.now()
        
        return appointment_datetime > now and self.status in ['confirmed', 'pending']
    
    @property
    def is_past(self):
        """检查是否为过去的预约"""
        from datetime import datetime, time as dt_time
        
        appointment_datetime = datetime.combine(self.appointment_date, self.appointment_time)
        # 将naive datetime转换为aware datetime
        appointment_datetime = timezone.make_aware(appointment_datetime)
        now = timezone.now()
        
        return appointment_datetime <= now
    
    def confirm_appointment(self, approved_by=None):
        """确认预约"""
        self.status = 'confirmed'
        self.is_approved = True
        self.approved_by = approved_by
        self.approved_at = timezone.now()
        self.save()
    
    def complete_appointment(self, diagnosis='', prescription='', medical_notes=''):
        """完成预约"""
        self.status = 'completed'
        self.diagnosis = diagnosis
        self.prescription = prescription
        self.medical_notes = medical_notes
        self.completed_at = timezone.now()
        self.save()
    
    def cancel_appointment(self, reason='', cancelled_by=None):
        """取消预约"""
        # 在取消前记录当前状态，用于后续更新排班计数
        was_confirmed = self.status == 'confirmed'
        
        self.status = 'cancelled'
        self.cancellation_reason = reason
        self.cancelled_by = cancelled_by
        self.cancelled_at = timezone.now()
        self.save()
        
        # 如果预约是已确认状态，取消时需要减少排班的预约计数
        if was_confirmed:
            self.decrease_schedule_appointment_count()
    
    def decrease_schedule_appointment_count(self):
        """减少对应排班的预约计数"""
        try:
            # 根据预约日期、医生和时间段查找对应的排班
            from doctors.models import DoctorSchedule
            
            # 将预约日期转换为星期几 (0=周一, 6=周日)
            weekday = self.appointment_date.weekday()
            
            # 查找对应的排班记录
            schedule = DoctorSchedule.objects.filter(
                doctor=self.doctor,
                weekday=weekday,
                time_slot=self.time_slot
            ).first()
            
            if schedule and schedule.current_appointments > 0:
                # 减少排班的current_appointments字段
                schedule.current_appointments -= 1
                schedule.save()
                print(f"已减少医生 {self.doctor.name} 星期{weekday+1} {self.time_slot} 排班的预约计数")
            else:
                print(f"未找到对应的排班记录或计数已为0: 医生 {self.doctor.name}, 星期{weekday+1}, 时间段 {self.time_slot}")
                
        except Exception as e:
            print(f"减少排班预约计数时出错: {str(e)}")


class AppointmentReminder(models.Model):
    """预约提醒模型"""
    
    # 提醒类型选项
    REMINDER_TYPE_CHOICES = [
        ('sms', '短信提醒'),
        ('wechat', '微信提醒'),
        ('email', '邮件提醒'),
        ('push', '推送提醒'),
    ]
    
    # 提醒状态选项
    REMINDER_STATUS_CHOICES = [
        ('pending', '待发送'),
        ('sent', '已发送'),
        ('failed', '发送失败'),
        ('cancelled', '已取消'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='reminders', verbose_name='相关预约')
    
    # 提醒信息
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES, verbose_name='提醒类型')
    reminder_time = models.DateTimeField(verbose_name='提醒时间')
    message = models.TextField(verbose_name='提醒内容')
    
    # 状态信息
    status = models.CharField(max_length=20, choices=REMINDER_STATUS_CHOICES, default='pending', verbose_name='提醒状态')
    
    # 发送信息
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name='发送时间')
    error_message = models.TextField(verbose_name='错误信息', blank=True)
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '预约提醒'
        verbose_name_plural = '预约提醒'
        ordering = ['-reminder_time']
        indexes = [
            models.Index(fields=['appointment', 'status']),
            models.Index(fields=['reminder_time', 'status']),
        ]
    
    def __str__(self):
        return f"{self.appointment.appointment_number} - {self.get_reminder_type_display()}"
    
    def send_reminder(self):
        """发送提醒"""
        # 这里实现具体的提醒发送逻辑
        # 可以根据reminder_type调用不同的发送服务
        try:
            # 模拟发送逻辑
            self.status = 'sent'
            self.sent_at = timezone.now()
            self.save()
            return True
        except Exception as e:
            self.status = 'failed'
            self.error_message = str(e)
            self.save()
            return False


class AppointmentFeedback(models.Model):
    """预约反馈模型"""
    
    # 反馈类型选项
    FEEDBACK_TYPE_CHOICES = [
        ('satisfaction', '满意度调查'),
        ('complaint', '投诉建议'),
        ('improvement', '改进建议'),
        ('other', '其他反馈'),
    ]
    
    # 满意度选项
    SATISFACTION_CHOICES = [
        (1, '非常不满意'),
        (2, '不满意'),
        (3, '一般'),
        (4, '满意'),
        (5, '非常满意'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='feedbacks', verbose_name='相关预约')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='反馈用户')
    
    # 反馈信息
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPE_CHOICES, verbose_name='反馈类型')
    satisfaction_rating = models.IntegerField(choices=SATISFACTION_CHOICES, verbose_name='满意度评分')
    title = models.CharField(max_length=200, verbose_name='反馈标题', blank=True)
    content = models.TextField(verbose_name='反馈内容')
    
    # 处理信息
    is_processed = models.BooleanField(default=False, verbose_name='是否已处理')
    processed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_feedbacks', verbose_name='处理人')
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name='处理时间')
    process_notes = models.TextField(verbose_name='处理备注', blank=True)
    
    # 匿名设置
    is_anonymous = models.BooleanField(default=False, verbose_name='是否匿名')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '预约反馈'
        verbose_name_plural = '预约反馈'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['appointment']),
            models.Index(fields=['user', 'feedback_type']),
            models.Index(fields=['is_processed']),
        ]
    
    def __str__(self):
        return f"{self.appointment.appointment_number} - {self.get_feedback_type_display()}"
    
    def process_feedback(self, processed_by=None, notes=''):
        """处理反馈"""
        self.is_processed = True
        self.processed_by = processed_by
        self.processed_at = timezone.now()
        self.process_notes = notes
        self.save()


class AppointmentStatistics(models.Model):
    """预约统计模型"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 统计维度
    hospital = models.ForeignKey('hospitals.Hospital', on_delete=models.CASCADE, verbose_name='医院')
    department = models.ForeignKey('hospitals.Department', on_delete=models.CASCADE, verbose_name='科室', null=True, blank=True)
    doctor = models.ForeignKey('doctors.Doctor', on_delete=models.CASCADE, verbose_name='医生', null=True, blank=True)
    
    # 时间维度
    statistic_date = models.DateField(verbose_name='统计日期')
    statistic_period = models.CharField(max_length=20, verbose_name='统计周期')  # daily, weekly, monthly
    
    # 预约统计
    total_appointments = models.IntegerField(default=0, verbose_name='总预约数')
    confirmed_appointments = models.IntegerField(default=0, verbose_name='已确认预约数')
    completed_appointments = models.IntegerField(default=0, verbose_name='已完成预约数')
    cancelled_appointments = models.IntegerField(default=0, verbose_name='已取消预约数')
    no_show_appointments = models.IntegerField(default=0, verbose_name='未到诊数')
    
    # 成功率统计
    success_rate = models.FloatField(default=0.0, verbose_name='成功率')
    cancellation_rate = models.FloatField(default=0.0, verbose_name='取消率')
    
    # 收入统计
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name='总收入')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '预约统计'
        verbose_name_plural = '预约统计'
        ordering = ['-statistic_date']
        unique_together = ['hospital', 'department', 'doctor', 'statistic_date', 'statistic_period']
        indexes = [
            models.Index(fields=['hospital', 'statistic_date']),
            models.Index(fields=['doctor', 'statistic_date']),
        ]
    
    def __str__(self):
        return f"{self.hospital.name} - {self.statistic_date} - {self.statistic_period}"
    
    def calculate_statistics(self):
        """计算统计信息"""
        from datetime import datetime, timedelta
        
        # 根据统计周期确定时间范围
        if self.statistic_period == 'daily':
            start_date = self.statistic_date
            end_date = self.statistic_date
        elif self.statistic_period == 'weekly':
            start_date = self.statistic_date - timedelta(days=self.statistic_date.weekday())
            end_date = start_date + timedelta(days=6)
        elif self.statistic_period == 'monthly':
            start_date = self.statistic_date.replace(day=1)
            next_month = self.statistic_date.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
        
        # 查询相关预约数据
        appointments = Appointment.objects.filter(
            hospital=self.hospital,
            appointment_date__range=[start_date, end_date]
        )
        
        if self.department:
            appointments = appointments.filter(department=self.department)
        if self.doctor:
            appointments = appointments.filter(doctor=self.doctor)
        
        # 计算统计值
        self.total_appointments = appointments.count()
        self.confirmed_appointments = appointments.filter(status='confirmed').count()
        self.completed_appointments = appointments.filter(status='completed').count()
        self.cancelled_appointments = appointments.filter(status='cancelled').count()
        self.no_show_appointments = appointments.filter(status='no_show').count()
        
        # 计算成功率
        if self.total_appointments > 0:
            self.success_rate = (self.completed_appointments / self.total_appointments) * 100
            self.cancellation_rate = (self.cancelled_appointments / self.total_appointments) * 100
        
        # 计算收入
        self.total_revenue = sum([app.total_fee for app in appointments.filter(status='completed')])
        
        self.save()
