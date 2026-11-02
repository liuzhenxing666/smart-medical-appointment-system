from rest_framework import serializers
from smart_doctor.serializers import EnhancedModelSerializer, StrictCharField, StrictIntegerField, UUIDField
from django.contrib.auth import get_user_model
from .models import (
    UserPreference, UserBehavior, RecommendationRule, 
    RecommendationResult, RecommendationFeedback, PopularItem
)

User = get_user_model()


class UserPreferenceSerializer(EnhancedModelSerializer):
    """用户偏好序列化器"""
    
    preference_type = StrictCharField(max_length=50, min_length=1)
    preference_value = StrictCharField(max_length=200)
    weight = StrictIntegerField(min_value=0, max_value=100)
    
    class Meta:
        model = UserPreference
        fields = [
            'id', 'user', 'preference_type', 'preference_value', 
            'weight', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserBehaviorSerializer(EnhancedModelSerializer):
    """用户行为序列化器"""
    
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=True
    )
    behavior_type = StrictCharField(max_length=50, min_length=1, required=True)
    target_id = UUIDField(required=True)
    target_type = StrictCharField(max_length=50, min_length=1, required=True)
    duration = StrictIntegerField(min_value=0, required=True)
    behavior_data = serializers.DictField(required=False)
    
    class Meta:
        model = UserBehavior
        fields = [
            'id', 'user', 'behavior_type', 'target_id', 'target_type',
            'behavior_data', 'duration', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class RecommendationRuleSerializer(EnhancedModelSerializer):
    """推荐规则序列化器"""
    
    name = StrictCharField(max_length=100, min_length=1)
    rule_type = StrictCharField(max_length=50, min_length=1)
    description = StrictCharField(max_length=500, required=False, allow_blank=True)
    weight = StrictIntegerField(min_value=0, max_value=100)
    
    class Meta:
        model = RecommendationRule
        fields = [
            'id', 'name', 'rule_type', 'description', 'rule_config',
            'weight', 'status', 'is_default', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RecommendationResultSerializer(EnhancedModelSerializer):
    """推荐结果序列化器"""
    
    recommendation_type = StrictCharField(max_length=50, min_length=1)
    target_type = StrictCharField(max_length=50, min_length=1)
    score = serializers.FloatField(min_value=0, max_value=1)
    reason = StrictCharField(max_length=500)
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    
    class Meta:
        model = RecommendationResult
        fields = [
            'id', 'user', 'recommendation_type', 'target_id', 'target_type',
            'score', 'reason', 'recommendation_data', 'rule', 'rule_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class RecommendationFeedbackSerializer(EnhancedModelSerializer):
    """推荐反馈序列化器"""
    
    recommendation = serializers.PrimaryKeyRelatedField(
        queryset=RecommendationResult.objects.all(),
        required=True
    )
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=True
    )
    feedback_type = StrictCharField(max_length=50, min_length=1, required=True)
    feedback_score = StrictIntegerField(min_value=1, max_value=5, required=True)
    feedback_comment = StrictCharField(max_length=500, required=False, allow_blank=True)
    recommendation_info = serializers.CharField(source='recommendation.__str__', read_only=True)
    
    class Meta:
        model = RecommendationFeedback
        fields = [
            'id', 'recommendation', 'user', 'feedback_type', 'feedback_score',
            'feedback_comment', 'recommendation_info', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PopularItemSerializer(EnhancedModelSerializer):
    """热门项目序列化器"""
    
    item_type = StrictCharField(max_length=50, min_length=1)
    popularity_score = serializers.FloatField(min_value=0)
    view_count = StrictIntegerField(min_value=0)
    appointment_count = StrictIntegerField(min_value=0)
    feedback_count = StrictIntegerField(min_value=0)
    time_period = StrictCharField(max_length=20)
    
    class Meta:
        model = PopularItem
        fields = [
            'id', 'item_type', 'item_id', 'popularity_score', 'view_count',
            'appointment_count', 'feedback_count', 'time_period',
            'period_start', 'period_end', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HospitalRecommendationRequestSerializer(serializers.Serializer):
    """医院推荐请求序列化器"""
    
    user_id = UUIDField(required=True)
    location = StrictCharField(max_length=100, required=False, allow_blank=True)
    specialty = StrictCharField(max_length=50, required=False, allow_blank=True)
    max_distance = StrictIntegerField(min_value=1, max_value=1000, required=False, default=100)
    limit = StrictIntegerField(min_value=1, max_value=50, required=False, default=10)


class DoctorRecommendationRequestSerializer(serializers.Serializer):
    """医生推荐请求序列化器"""
    
    user_id = UUIDField(required=True)
    hospital_id = UUIDField(required=False)
    specialty = StrictCharField(max_length=50, required=False, allow_blank=True)
    location = StrictCharField(max_length=100, required=False, allow_blank=True)
    max_distance = StrictIntegerField(min_value=1, max_value=1000, required=False, default=100)
    limit = StrictIntegerField(min_value=1, max_value=50, required=False, default=10)


class RecommendationResponseSerializer(serializers.Serializer):
    """推荐响应序列化器"""
    
    recommendation_id = serializers.UUIDField()
    target_id = serializers.UUIDField()
    target_type = serializers.CharField()
    score = serializers.FloatField()
    reason = serializers.CharField()
    recommendation_data = serializers.DictField()