"""
医生信息管理API序列化器
"""
from rest_framework import serializers
from .models import Doctor, DoctorSchedule, DoctorReview
from hospitals.models import Hospital, Department


class DoctorScheduleSerializer(serializers.ModelSerializer):
    """医生排班序列化器"""
    
    class Meta:
        model = DoctorSchedule
        fields = ['id', 'doctor', 'weekday', 'time_slot', 'start_time', 'end_time', 
                 'max_appointments', 'current_appointments', 'is_available', 
                 'is_recurring', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DoctorReviewSerializer(serializers.ModelSerializer):
    """医生评价序列化器"""
    
    patient_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = DoctorReview
        fields = ['id', 'doctor', 'user', 'patient_name', 'rating', 
                 'title', 'content', 'attitude_rating', 'professional_rating', 'efficiency_rating', 'is_anonymous', 'created_at', 'updated_at']
        read_only_fields = ['id', 'doctor', 'user', 'created_at', 'updated_at']


class DoctorListSerializer(serializers.ModelSerializer):
    """医生列表序列化器"""
    
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Doctor
        fields = ['id', 'name', 'title', 'specialty', 'hospital', 'hospital_name',
                 'department', 'department_name', 'avatar', 'avatar_url', 'average_rating', 
                 'review_count', 'consultation_fee', 'is_available', 'created_at']


class DoctorDetailSerializer(serializers.ModelSerializer):
    """医生详情序列化器"""

    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    hospital_obj = serializers.SerializerMethodField()
    department_obj = serializers.SerializerMethodField()
    schedules = DoctorScheduleSerializer(many=True, read_only=True)
    reviews = DoctorReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Doctor
        fields = ['id', 'name', 'title', 'specialty', 'hospital', 'hospital_name',
                 'hospital_obj', 'department', 'department_name', 'department_obj',
                 'avatar', 'avatar_url', 'gender', 'birth_date',
                 'phone', 'email', 'consultation_fee', 'expertise',
                 'education', 'experience', 'average_rating',
                 'review_count', 'appointment_count', 'is_available',
                 'schedules', 'reviews', 'created_at', 'updated_at']

    def get_hospital_obj(self, obj):
        """嵌套医院简要信息（供预约页展示）"""
        h = obj.hospital
        if not h:
            return None
        return {
            'id': str(h.id), 'name': h.name, 'level': h.level,
            'address': h.address, 'phone': h.phone,
            'latitude': h.latitude, 'longitude': h.longitude,
        }

    def get_department_obj(self, obj):
        """嵌套科室简要信息"""
        d = obj.department
        if not d:
            return None
        return {'id': str(d.id), 'name': d.name}


class DoctorCreateUpdateSerializer(serializers.ModelSerializer):
    """医生创建和更新序列化器"""
    
    class Meta:
        model = Doctor
        fields = ['name', 'title', 'specialty', 'hospital', 'department', 
                 'avatar', 'gender', 'birth_date', 'phone', 'email', 
                 'consultation_fee', 'expertise', 'education', 
                 'experience', 'is_available']


class DoctorSearchSerializer(serializers.Serializer):
    """医生搜索序列化器"""
    
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    specialty = serializers.CharField(read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    avatar = serializers.ImageField(read_only=True)
    avatar_url = serializers.URLField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_available = serializers.BooleanField(read_only=True)


class ScheduleCreateUpdateSerializer(serializers.ModelSerializer):
    """排班创建和更新序列化器"""
    
    class Meta:
        model = DoctorSchedule
        fields = ['doctor', 'weekday', 'time_slot', 'start_time', 'end_time', 
                 'max_appointments', 'is_available', 'is_recurring']


class ReviewCreateSerializer(serializers.ModelSerializer):
    """评价创建序列化器"""
    
    class Meta:
        model = DoctorReview
        fields = ['doctor', 'rating', 'title', 'content', 'attitude_rating', 'professional_rating', 'efficiency_rating', 'is_anonymous']
        read_only_fields = ['doctor']