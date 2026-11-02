from rest_framework import serializers
from .models import Appointment, AppointmentReminder, AppointmentFeedback, AppointmentStatistics
from users.models import User
from doctors.models import Doctor
from hospitals.models import Hospital, Department


class AppointmentReminderSerializer(serializers.ModelSerializer):
    """预约提醒序列化器"""
    
    class Meta:
        model = AppointmentReminder
        fields = [
            'id', 'appointment', 'reminder_type', 'reminder_time', 'message',
            'status', 'sent_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AppointmentFeedbackSerializer(serializers.ModelSerializer):
    """预约反馈序列化器"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AppointmentFeedback
        fields = [
            'id', 'appointment', 'user', 'user_name', 'feedback_type',
            'satisfaction_rating', 'comment', 'is_processed',
            'processed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AppointmentStatisticsSerializer(serializers.ModelSerializer):
    """预约统计序列化器"""
    
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    
    class Meta:
        model = AppointmentStatistics
        fields = [
            'id', 'hospital', 'hospital_name', 'doctor', 'doctor_name',
            'department', 'statistic_date', 'total_appointments',
            'confirmed_appointments', 'completed_appointments',
            'cancelled_appointments', 'no_show_appointments',
            'success_rate', 'cancellation_rate', 'total_revenue',
            'average_revenue_per_appointment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AppointmentListSerializer(serializers.ModelSerializer):
    """预约列表序列化器"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_number', 'user', 'user_name', 'doctor', 'doctor_name',
            'hospital', 'hospital_name', 'department', 'department_name',
            'appointment_date', 'appointment_time', 'time_slot', 'appointment_type',
            'status', 'payment_status', 'total_fee', 'is_upcoming', 'is_past',
            'created_at'
        ]
        read_only_fields = ['id', 'appointment_number', 'created_at']


class AppointmentDetailSerializer(serializers.ModelSerializer):
    """预约详情序列化器"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    cancelled_by_name = serializers.CharField(source='cancelled_by.username', read_only=True)
    
    # 关联数据
    reminders = AppointmentReminderSerializer(many=True, read_only=True)
    feedbacks = AppointmentFeedbackSerializer(many=True, read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_number', 'user', 'user_name', 'doctor', 'doctor_name',
            'hospital', 'hospital_name', 'department', 'department_name',
            'appointment_date', 'appointment_time', 'time_slot', 'appointment_type',
            'symptoms', 'medical_history', 'special_requirements',
            'appointment_fee', 'consultation_fee', 'total_fee',
            'status', 'payment_status', 'is_approved', 'approval_notes',
            'approved_by', 'approved_by_name', 'approved_at',
            'cancellation_reason', 'cancelled_by', 'cancelled_by_name', 'cancelled_at',
            'diagnosis', 'prescription', 'medical_notes', 'completed_at',
            'reminder_sent', 'reminder_sent_at', 'is_upcoming', 'is_past',
            'reminders', 'feedbacks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'appointment_number', 'created_at', 'updated_at']


class AppointmentCreateUpdateSerializer(serializers.ModelSerializer):
    """预约创建/更新序列化器"""
    
    class Meta:
        model = Appointment
        fields = [
            'user', 'doctor', 'hospital', 'department',
            'appointment_date', 'appointment_time', 'time_slot', 'appointment_type',
            'symptoms', 'medical_history', 'special_requirements',
            'appointment_fee', 'consultation_fee'
        ]
        # user 由后端自动绑定为当前登录用户，禁止客户端指定
        read_only_fields = ['user']

    def validate(self, data):
        """验证预约数据"""
        from datetime import datetime
        from django.utils import timezone

        # 检查预约时间是否在将来（使用时区感知的比较）
        appointment_date = data.get('appointment_date')
        appointment_time = data.get('appointment_time')

        if appointment_date and appointment_time:
            appointment_datetime = datetime.combine(appointment_date, appointment_time)
            appointment_datetime = timezone.make_aware(
                appointment_datetime, timezone.get_current_timezone()
            )
            if appointment_datetime <= timezone.now():
                raise serializers.ValidationError("预约时间必须在将来")

            # 检查同一医生同一时间是否已有有效预约
            doctor = data.get('doctor')
            if doctor:
                conflict_qs = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time,
                    status__in=['pending', 'confirmed']
                )
                instance = self.instance
                if instance:
                    conflict_qs = conflict_qs.exclude(pk=instance.pk)
                if conflict_qs.exists():
                    raise serializers.ValidationError("该医生在此时间段已有预约，请选择其他时间")

        return data
    
    def create(self, validated_data):
        """创建预约时自动设置默认值"""
        # 自动生成预约编号和计算总费用
        appointment = Appointment(**validated_data)
        appointment.save()
        return appointment


class AppointmentSearchSerializer(serializers.Serializer):
    """预约搜索序列化器"""
    
    user = serializers.CharField(required=False, help_text='用户ID或用户名')
    doctor = serializers.CharField(required=False, help_text='医生ID或姓名')
    hospital = serializers.CharField(required=False, help_text='医院ID或名称')
    department = serializers.CharField(required=False, help_text='科室ID或名称')
    status = serializers.CharField(required=False, help_text='预约状态')
    payment_status = serializers.CharField(required=False, help_text='支付状态')
    appointment_date_from = serializers.DateField(required=False, help_text='预约日期开始')
    appointment_date_to = serializers.DateField(required=False, help_text='预约日期结束')
    
    def validate(self, data):
        """验证搜索参数"""
        appointment_date_from = data.get('appointment_date_from')
        appointment_date_to = data.get('appointment_date_to')
        
        if appointment_date_from and appointment_date_to:
            if appointment_date_from > appointment_date_to:
                raise serializers.ValidationError("开始日期不能晚于结束日期")
        
        return data


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """反馈创建序列化器"""
    
    class Meta:
        model = AppointmentFeedback
        fields = ['appointment', 'user', 'feedback_type', 'satisfaction_rating', 'comment']
    
    def validate_satisfaction_rating(self, value):
        """验证满意度评分"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("满意度评分必须在1-5之间")
        return value


class ReminderCreateSerializer(serializers.ModelSerializer):
    """提醒创建序列化器"""
    
    class Meta:
        model = AppointmentReminder
        fields = ['appointment', 'reminder_type', 'reminder_time', 'message']
    
    def validate_reminder_time(self, value):
        """验证提醒时间"""
        from datetime import datetime
        
        if value <= datetime.now():
            raise serializers.ValidationError("提醒时间必须在将来")
        
        return value