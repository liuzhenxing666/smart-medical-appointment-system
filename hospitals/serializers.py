"""
医院信息管理API序列化器
"""
from rest_framework import serializers
from .models import Hospital, Department, HospitalImage, HospitalReview


class HospitalImageSerializer(serializers.ModelSerializer):
    """医院图片序列化器"""
    
    class Meta:
        model = HospitalImage
        fields = ['id', 'image', 'image_type', 'description', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']


class HospitalReviewSerializer(serializers.ModelSerializer):
    """医院评价序列化器"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = HospitalReview
        fields = ['id', 'user', 'user_name', 'rating', 'title', 'content', 'service_rating', 'environment_rating', 'medical_rating', 'is_anonymous', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class DepartmentSerializer(serializers.ModelSerializer):
    """医院科室序列化器"""
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'department_type', 'description', 
            'floor', 'room_number', 'is_active', 'appointment_hours',
            'total_doctors', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HospitalListSerializer(serializers.ModelSerializer):
    """医院列表序列化器"""
    
    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'level', 'hospital_type', 'address', 'city', 'district',
            'phone', 'latitude', 'longitude', 'average_rating', 'review_count', 
            'total_doctors', 'is_verified', 'image_url', 'specialties'
        ]


class HospitalDetailSerializer(serializers.ModelSerializer):
    """医院详情序列化器"""
    departments = DepartmentSerializer(many=True, read_only=True)
    images = HospitalImageSerializer(many=True, read_only=True)
    reviews = HospitalReviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'level', 'hospital_type', 'address', 'city', 'district',
            'latitude', 'longitude', 'phone', 'emergency_phone', 'email', 'website',
            'description', 'specialties', 'facilities', 'total_doctors', 'total_beds',
            'average_rating', 'review_count', 'is_active', 'is_verified',
            'departments', 'images', 'reviews', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HospitalCreateUpdateSerializer(serializers.ModelSerializer):
    """医院创建和更新序列化器"""
    
    class Meta:
        model = Hospital
        fields = [
            'name', 'level', 'hospital_type', 'address', 'city', 'district',
            'latitude', 'longitude', 'phone', 'emergency_phone', 'email', 'website',
            'description', 'specialties', 'facilities', 'total_beds', 'is_active'
        ]


class HospitalSearchSerializer(serializers.Serializer):
    """医院搜索序列化器"""
    name = serializers.CharField(required=False)
    city = serializers.CharField(required=False)
    district = serializers.CharField(required=False)
    level = serializers.CharField(required=False)
    hospital_type = serializers.CharField(required=False)
    
    def validate_level(self, value):
        """验证医院等级"""
        valid_levels = [choice[0] for choice in Hospital.HOSPITAL_LEVEL_CHOICES]
        if value and value not in valid_levels:
            raise serializers.ValidationError(f"医院等级必须是以下值之一: {', '.join(valid_levels)}")
        return value
    
    def validate_hospital_type(self, value):
        """验证医院类型"""
        valid_types = [choice[0] for choice in Hospital.HOSPITAL_TYPE_CHOICES]
        if value and value not in valid_types:
            raise serializers.ValidationError(f"医院类型必须是以下值之一: {', '.join(valid_types)}")
        return value


class NearbyHospitalSearchSerializer(serializers.Serializer):
    """附近医院搜索序列化器"""
    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)
    radius = serializers.FloatField(required=False, default=100, min_value=0.1, max_value=1000)