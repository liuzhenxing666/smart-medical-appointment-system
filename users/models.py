from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """自定义用户模型，支持微信登录"""
    
    # 收藏统计字段
    favorite_count = models.PositiveIntegerField(_('收藏数量'), default=0)
    last_favorited_at = models.DateTimeField(_('最后收藏时间'), null=True, blank=True)
    
    # 评价统计字段
    review_count = models.PositiveIntegerField(_('评价数量'), default=0)
    average_rating = models.FloatField(_('平均评分'), default=0.0)
    last_reviewed_at = models.DateTimeField(_('最后评价时间'), null=True, blank=True)
    
    # 微信相关字段
    wechat_openid = models.CharField(
        _('微信OpenID'), 
        max_length=128, 
        unique=True, 
        null=True, 
        blank=True
    )
    wechat_unionid = models.CharField(
        _('微信UnionID'), 
        max_length=128, 
        null=True, 
        blank=True
    )
    
    # 用户基本信息
    phone = models.CharField(_('手机号'), max_length=20, unique=True, null=True, blank=True)
    avatar = models.ImageField(_('头像'), upload_to='avatars/', null=True, blank=True)
    
    # 扩展字段
    name = models.CharField(_('姓名'), max_length=50, null=True, blank=True)
    age = models.PositiveIntegerField(_('年龄'), null=True, blank=True)
    gender = models.CharField(
        _('性别'), 
        max_length=10, 
        null=True, 
        blank=True,
        choices=[
            ('male', '男'),
            ('female', '女'),
        ]
    )
    
    # 位置信息
    latitude = models.FloatField(_('纬度'), null=True, blank=True)
    longitude = models.FloatField(_('经度'), null=True, blank=True)
    location_updated_at = models.DateTimeField(_('位置更新时间'), null=True, blank=True)
    
    # 偏好设置
    preferred_hospital_type = models.CharField(
        _('偏好医院类型'), 
        max_length=50, 
        null=True, 
        blank=True,
        choices=[
            ('public', '公立医院'),
            ('private', '私立医院'),
            ('specialized', '专科医院'),
        ]
    )
    
    # 统计信息
    appointment_count = models.PositiveIntegerField(_('预约次数'), default=0)
    last_appointment_at = models.DateTimeField(_('最后预约时间'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('用户')
        verbose_name_plural = _('用户')
    
    def __str__(self):
        return self.username or self.wechat_openid or str(self.id)
