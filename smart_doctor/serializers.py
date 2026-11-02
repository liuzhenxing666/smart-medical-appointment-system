"""
自定义序列化器基类 - 增强数据验证和错误处理
"""

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
import uuid
import re


class EnhancedModelSerializer(serializers.ModelSerializer):
    """增强的模型序列化器基类"""
    
    def validate(self, attrs):
        """增强的数据验证"""
        attrs = super().validate(attrs)
        
        # 自动验证UUID字段
        for field_name, field_value in attrs.items():
            if isinstance(field_value, str) and field_name.endswith('_id'):
                try:
                    uuid.UUID(field_value)
                except ValueError:
                    raise ValidationError({field_name: '无效的UUID格式'})
        
        return attrs
    
    def create(self, validated_data):
        """增强的创建方法"""
        try:
            return super().create(validated_data)
        except Exception as e:
            raise ValidationError(f"创建记录失败: {str(e)}")
    
    def update(self, instance, validated_data):
        """增强的更新方法"""
        try:
            return super().update(instance, validated_data)
        except Exception as e:
            raise ValidationError(f"更新记录失败: {str(e)}")


class StrictCharField(serializers.CharField):
    """严格的字符串字段验证"""
    
    def __init__(self, **kwargs):
        self.max_length = kwargs.pop('max_length', 255)
        self.min_length = kwargs.pop('min_length', 0)
        self.pattern = kwargs.pop('pattern', None)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        
        # 长度验证
        if self.max_length is not None and len(data) > self.max_length:
            raise ValidationError(f"字段长度不能超过{self.max_length}个字符")
        
        if self.min_length is not None and len(data) < self.min_length:
            raise ValidationError(f"字段长度不能少于{self.min_length}个字符")
        
        # 正则表达式验证
        if self.pattern and not re.match(self.pattern, data):
            raise ValidationError(f"字段格式不符合要求")
        
        return data


class StrictIntegerField(serializers.IntegerField):
    """严格的整数字段验证"""
    
    def __init__(self, **kwargs):
        self.min_value = kwargs.pop('min_value', None)
        self.max_value = kwargs.pop('max_value', None)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        
        # 最小值验证
        if self.min_value is not None and data < self.min_value:
            raise ValidationError(f"值不能小于{self.min_value}")
        
        # 最大值验证
        if self.max_value is not None and data > self.max_value:
            raise ValidationError(f"值不能大于{self.max_value}")
        
        return data


class UUIDField(serializers.CharField):
    """UUID字段验证 - 支持UUID格式和整数格式"""
    
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        
        # 首先尝试解析为UUID
        try:
            uuid.UUID(data)
            return data
        except ValueError:
            # 如果不是UUID格式，尝试解析为整数（兼容现有用户ID）
            try:
                int(data)
                return data
            except ValueError:
                raise ValidationError("无效的用户ID格式，应为UUID或整数格式")
        
        return data


class EmailField(serializers.EmailField):
    """增强的邮箱字段验证"""
    
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        
        # 邮箱格式验证
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data):
            raise ValidationError("无效的邮箱格式")
        
        return data


class PhoneField(serializers.CharField):
    """手机号字段验证"""
    
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        
        # 手机号格式验证（中国手机号）
        if not re.match(r'^1[3-9]\d{9}$', data):
            raise ValidationError("无效的手机号格式")
        
        return data


class CoordinateField(serializers.CharField):
    """坐标字段验证"""
    
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        
        # 坐标格式验证（经度,纬度）
        if not re.match(r'^-?\d+\.\d+,-?\d+\.\d+$', data):
            raise ValidationError("无效的坐标格式，应为'经度,纬度'格式")
        
        # 验证坐标范围
        try:
            lon, lat = map(float, data.split(','))
            if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
                raise ValidationError("坐标范围无效")
        except ValueError:
            raise ValidationError("坐标格式解析失败")
        
        return data