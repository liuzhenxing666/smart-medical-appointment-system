"""医生API参数验证序列化器"""
from rest_framework import serializers


class DoctorSearchParamSerializer(serializers.Serializer):
    """医生搜索参数验证"""
    q = serializers.CharField(required=False, default='', allow_blank=True)
    specialty = serializers.CharField(required=False, default='', allow_blank=True)
    hospital_id = serializers.UUIDField(required=False, allow_null=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    hospital_level = serializers.CharField(required=False, default='', allow_blank=True)
    doctor_title = serializers.CharField(required=False, default='', allow_blank=True)
    min_rating = serializers.FloatField(required=False, min_value=0, max_value=5)
    max_fee = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    city = serializers.CharField(required=False, default='', allow_blank=True)
    district = serializers.CharField(required=False, default='', allow_blank=True)
    sort_by = serializers.CharField(required=False, default='rating', allow_blank=True)
    sort_order = serializers.CharField(required=False, default='desc', allow_blank=True)


class NearbyDoctorsParamSerializer(serializers.Serializer):
    """附近医生查询参数验证"""
    lat = serializers.FloatField(required=True, min_value=-90, max_value=90)
    lng = serializers.FloatField(required=True, min_value=-180, max_value=180)
    radius = serializers.FloatField(required=False, default=10, min_value=1, max_value=100)


class TopDoctorsParamSerializer(serializers.Serializer):
    """热门医生推荐参数验证"""
    limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=50)