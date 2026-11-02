from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


class UserPreference(models.Model):
    """用户偏好模型"""
    
    # 偏好类型选项
    PREFERENCE_TYPE_CHOICES = [
        ('hospital_type', '医院类型偏好'),
        ('doctor_specialty', '医生专业偏好'),
        ('distance_preference', '距离偏好'),
        ('price_preference', '价格偏好'),
        ('rating_preference', '评分偏好'),
        ('time_preference', '时间偏好'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 用户信息
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='用户')
    
    # 偏好信息
    preference_type = models.CharField(max_length=30, choices=PREFERENCE_TYPE_CHOICES, verbose_name='偏好类型')
    preference_value = models.JSONField(default=dict, verbose_name='偏好值')
    
    # 权重信息
    weight = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)], verbose_name='权重')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '用户偏好'
        verbose_name_plural = '用户偏好'
        unique_together = ['user', 'preference_type']
        ordering = ['user', 'preference_type']
        indexes = [
            models.Index(fields=['user', 'preference_type']),
            models.Index(fields=['preference_type']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_preference_type_display()}"


class UserBehavior(models.Model):
    """用户行为模型"""
    
    # 行为类型选项
    BEHAVIOR_TYPE_CHOICES = [
        ('view_hospital', '浏览医院'),
        ('view_doctor', '浏览医生'),
        ('search_hospital', '搜索医院'),
        ('search_doctor', '搜索医生'),
        ('make_appointment', '预约医生'),
        ('cancel_appointment', '取消预约'),
        ('give_feedback', '给予反馈'),
        ('share_appointment', '分享预约'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 用户信息
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='用户')
    
    # 行为信息
    behavior_type = models.CharField(max_length=30, choices=BEHAVIOR_TYPE_CHOICES, verbose_name='行为类型')
    target_id = models.UUIDField(verbose_name='目标ID')
    target_type = models.CharField(max_length=50, verbose_name='目标类型')
    
    # 行为详情
    behavior_data = models.JSONField(default=dict, verbose_name='行为数据')
    duration = models.FloatField(null=True, blank=True, verbose_name='行为时长（秒）')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='行为时间')
    
    class Meta:
        verbose_name = '用户行为'
        verbose_name_plural = '用户行为'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'behavior_type']),
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_behavior_type_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class RecommendationRule(models.Model):
    """推荐规则模型"""
    
    # 规则类型选项
    RULE_TYPE_CHOICES = [
        ('content_based', '基于内容'),
        ('collaborative', '协同过滤'),
        ('hybrid', '混合推荐'),
        ('popularity', '热门推荐'),
        ('similar_users', '相似用户'),
    ]
    
    # 规则状态选项
    STATUS_CHOICES = [
        ('active', '活跃'),
        ('inactive', '未激活'),
        ('testing', '测试中'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 规则基本信息
    name = models.CharField(max_length=100, verbose_name='规则名称')
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES, verbose_name='规则类型')
    description = models.TextField(verbose_name='规则描述', blank=True)
    
    # 规则配置
    rule_config = models.JSONField(default=dict, verbose_name='规则配置')
    weight = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)], verbose_name='权重')
    
    # 状态信息
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name='状态')
    is_default = models.BooleanField(default=False, verbose_name='是否默认规则')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '推荐规则'
        verbose_name_plural = '推荐规则'
        ordering = ['weight', 'name']
        indexes = [
            models.Index(fields=['rule_type', 'status']),
            models.Index(fields=['is_default']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_rule_type_display()})"


class RecommendationResult(models.Model):
    """推荐结果模型"""
    
    # 推荐类型选项
    RECOMMENDATION_TYPE_CHOICES = [
        ('hospital', '医院推荐'),
        ('doctor', '医生推荐'),
        ('department', '科室推荐'),
        ('time_slot', '时间段推荐'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 用户信息
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='用户')
    
    # 推荐信息
    recommendation_type = models.CharField(max_length=20, choices=RECOMMENDATION_TYPE_CHOICES, verbose_name='推荐类型')
    target_id = models.UUIDField(verbose_name='目标ID')
    target_type = models.CharField(max_length=50, verbose_name='目标类型')
    
    # 推荐详情
    score = models.FloatField(validators=[MinValueValidator(0.0), MaxValueValidator(1.0)], verbose_name='推荐分数')
    reason = models.TextField(verbose_name='推荐理由', blank=True)
    recommendation_data = models.JSONField(default=dict, verbose_name='推荐数据')
    
    # 规则信息
    rule = models.ForeignKey(RecommendationRule, on_delete=models.CASCADE, verbose_name='推荐规则')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='推荐时间')
    
    class Meta:
        verbose_name = '推荐结果'
        verbose_name_plural = '推荐结果'
        ordering = ['-score', '-created_at']
        indexes = [
            models.Index(fields=['user', 'recommendation_type']),
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['score']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_recommendation_type_display()} - {self.score:.3f}"


class SimilarityMatrix(models.Model):
    """相似度矩阵模型"""
    
    # 相似度类型选项
    SIMILARITY_TYPE_CHOICES = [
        ('user_user', '用户-用户相似度'),
        ('item_item', '项目-项目相似度'),
        ('user_item', '用户-项目相似度'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 相似度信息
    similarity_type = models.CharField(max_length=20, choices=SIMILARITY_TYPE_CHOICES, verbose_name='相似度类型')
    entity_a_id = models.UUIDField(verbose_name='实体A ID')
    entity_a_type = models.CharField(max_length=50, verbose_name='实体A类型')
    entity_b_id = models.UUIDField(verbose_name='实体B ID')
    entity_b_type = models.CharField(max_length=50, verbose_name='实体B类型')
    
    # 相似度值
    similarity_score = models.FloatField(validators=[MinValueValidator(0.0), MaxValueValidator(1.0)], verbose_name='相似度分数')
    
    # 计算信息
    calculation_method = models.CharField(max_length=50, verbose_name='计算方法')
    calculation_data = models.JSONField(default=dict, verbose_name='计算数据')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='计算时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '相似度矩阵'
        verbose_name_plural = '相似度矩阵'
        unique_together = ['similarity_type', 'entity_a_id', 'entity_a_type', 'entity_b_id', 'entity_b_type']
        ordering = ['similarity_type', '-similarity_score']
        indexes = [
            models.Index(fields=['similarity_type', 'entity_a_id', 'entity_a_type']),
            models.Index(fields=['similarity_type', 'entity_b_id', 'entity_b_type']),
            models.Index(fields=['similarity_score']),
        ]
    
    def __str__(self):
        return f"{self.get_similarity_type_display()} - {self.similarity_score:.3f}"


class RecommendationFeedback(models.Model):
    """推荐反馈模型"""
    
    # 反馈类型选项
    FEEDBACK_TYPE_CHOICES = [
        ('click', '点击'),
        ('ignore', '忽略'),
        ('positive', '正面反馈'),
        ('negative', '负面反馈'),
        ('neutral', '中性反馈'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 推荐信息
    recommendation = models.ForeignKey(RecommendationResult, on_delete=models.CASCADE, verbose_name='推荐结果')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, verbose_name='用户')
    
    # 反馈信息
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPE_CHOICES, verbose_name='反馈类型')
    feedback_score = models.IntegerField(validators=[MinValueValidator(-1), MaxValueValidator(1)], verbose_name='反馈分数')
    feedback_comment = models.TextField(verbose_name='反馈评论', blank=True)
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='反馈时间')
    
    class Meta:
        verbose_name = '推荐反馈'
        verbose_name_plural = '推荐反馈'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recommendation', 'feedback_type']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_feedback_type_display()} - {self.recommendation}"


class PopularItem(models.Model):
    """热门项目模型"""
    
    # 项目类型选项
    ITEM_TYPE_CHOICES = [
        ('hospital', '医院'),
        ('doctor', '医生'),
        ('department', '科室'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 项目信息
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, verbose_name='项目类型')
    item_id = models.UUIDField(verbose_name='项目ID')
    
    # 热度信息
    popularity_score = models.FloatField(default=0.0, verbose_name='热度分数')
    view_count = models.IntegerField(default=0, verbose_name='浏览次数')
    appointment_count = models.IntegerField(default=0, verbose_name='预约次数')
    feedback_count = models.IntegerField(default=0, verbose_name='反馈次数')
    
    # 时间维度
    time_period = models.CharField(max_length=20, verbose_name='时间周期')  # daily, weekly, monthly
    period_start = models.DateField(verbose_name='周期开始')
    period_end = models.DateField(verbose_name='周期结束')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '热门项目'
        verbose_name_plural = '热门项目'
        unique_together = ['item_type', 'item_id', 'time_period', 'period_start']
        ordering = ['-popularity_score']
        indexes = [
            models.Index(fields=['item_type', 'time_period', 'popularity_score']),
            models.Index(fields=['period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f"{self.get_item_type_display()} - {self.popularity_score:.3f}"
    
    def calculate_popularity(self):
        """计算热度分数"""
        # 基于浏览、预约、反馈等行为计算热度
        self.popularity_score = (
            self.view_count * 0.3 +
            self.appointment_count * 0.5 +
            self.feedback_count * 0.2
        )
        self.save()


class ColdStartStrategy(models.Model):
    """冷启动策略模型"""
    
    # 策略类型选项
    STRATEGY_TYPE_CHOICES = [
        ('popular_items', '热门项目'),
        ('demographic', '人口统计'),
        ('content_based', '基于内容'),
        ('hybrid', '混合策略'),
    ]
    
    # 策略状态选项
    STATUS_CHOICES = [
        ('active', '活跃'),
        ('inactive', '未激活'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 策略信息
    name = models.CharField(max_length=100, verbose_name='策略名称')
    strategy_type = models.CharField(max_length=20, choices=STRATEGY_TYPE_CHOICES, verbose_name='策略类型')
    description = models.TextField(verbose_name='策略描述', blank=True)
    
    # 策略配置
    strategy_config = models.JSONField(default=dict, verbose_name='策略配置')
    priority = models.IntegerField(default=1, verbose_name='优先级')
    
    # 状态信息
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name='状态')
    
    # 适用条件
    min_user_behavior_count = models.IntegerField(default=0, verbose_name='最小用户行为数')
    max_user_behavior_count = models.IntegerField(default=10, verbose_name='最大用户行为数')
    
    # 时间戳
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '冷启动策略'
        verbose_name_plural = '冷启动策略'
        ordering = ['priority', 'name']
        indexes = [
            models.Index(fields=['strategy_type', 'status']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_strategy_type_display()})"
    
    def is_applicable(self, user_behavior_count):
        """检查策略是否适用于当前用户"""
        return self.min_user_behavior_count <= user_behavior_count <= self.max_user_behavior_count
