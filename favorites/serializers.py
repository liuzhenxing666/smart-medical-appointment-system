from rest_framework import serializers
from .models import UserFavorite

class UserFavoriteSerializer(serializers.ModelSerializer):
    """用户收藏序列化器"""
    
    class Meta:
        model = UserFavorite
        fields = ['id', 'favorite_type', 'doctor', 'hospital', 'created_at']
        read_only_fields = ['id', 'created_at']
        
    def validate(self, data):
        """验证收藏数据"""
        favorite_type = data.get('favorite_type')
        doctor = data.get('doctor')
        hospital = data.get('hospital')
        
        # 验证收藏类型与对应对象匹配
        if favorite_type == 'doctor' and not doctor:
            raise serializers.ValidationError("收藏医生类型必须指定医生")
        elif favorite_type == 'hospital' and not hospital:
            raise serializers.ValidationError("收藏医院类型必须指定医院")
        elif favorite_type == 'doctor' and hospital:
            raise serializers.ValidationError("收藏医生类型不能指定医院")
        elif favorite_type == 'hospital' and doctor:
            raise serializers.ValidationError("收藏医院类型不能指定医生")
            
        return data