from django.contrib import admin
from django.utils.html import format_html
from .models import (
    UserPreference, UserBehavior, RecommendationRule, 
    RecommendationResult, SimilarityMatrix, RecommendationFeedback,
    PopularItem, ColdStartStrategy
)


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    """用户偏好管理界面"""
    
    list_display = ['user', 'preference_type', 'preference_value', 'weight', 'updated_at']
    search_fields = ['user__username', 'user__phone', 'preference_type']
    list_filter = ['preference_type']
    list_editable = ['weight']
    
    fieldsets = [
        ('基本信息', {
            'fields': ['user', 'preference_type', 'preference_value']
        }),
        ('权重设置', {
            'fields': ['weight']
        }),
        ('时间信息', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]
    
    readonly_fields = ['created_at', 'updated_at']
    
    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M')
    updated_at_formatted.short_description = '最后更新'


@admin.register(UserBehavior)
class UserBehaviorAdmin(admin.ModelAdmin):
    """用户行为管理界面"""
    
    list_display = ['user', 'behavior_type', 'target_type', 'target_id', 'duration', 'created_at']
    search_fields = ['user__username', 'behavior_type', 'target_type']
    list_filter = ['behavior_type', 'target_type', 'created_at']
    
    fieldsets = [
        ('基本信息', {
            'fields': ['user', 'behavior_type', 'target_type', 'target_id']
        }),
        ('行为详情', {
            'fields': ['behavior_data', 'duration']
        }),
        ('时间信息', {
            'fields': ['created_at'],
            'classes': ['collapse']
        })
    ]
    
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('user')


@admin.register(RecommendationRule)
class RecommendationRuleAdmin(admin.ModelAdmin):
    """推荐规则管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'name', 'rule_type', 'status', 'is_default', 'weight', 'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['name', 'rule_type', 'description']
    
    # 过滤器
    list_filter = [
        'rule_type', 'status', 'is_default', 'created_at', 'updated_at'
    ]
    
    # 可编辑的字段
    list_editable = ['weight', 'is_default']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['weight', '-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('name', 'rule_type', 'description')
        }),
        ('规则配置', {
            'fields': ('rule_config', 'weight', 'status', 'is_default')
        }),
        ('状态信息', {
            'fields': ('created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request)


@admin.register(RecommendationResult)
class RecommendationResultAdmin(admin.ModelAdmin):
    """推荐结果管理界面"""
    
    list_display = ['user', 'recommendation_type', 'target_type', 'target_id', 'score', 'created_at']
    search_fields = ['user__username', 'recommendation_type', 'target_type']
    list_filter = ['recommendation_type', 'target_type', 'created_at']
    list_editable = ['score']
    ordering = ['-score', '-created_at']
    
    fieldsets = [
        ('基本信息', {
            'fields': ['user', 'recommendation_type', 'target_type', 'target_id']
        }),
        ('推荐详情', {
            'fields': ['score', 'reason', 'recommendation_data', 'rule']
        }),
        ('时间信息', {
            'fields': ['created_at'],
            'classes': ['collapse']
        })
    ]
    
    readonly_fields = ['created_at']


@admin.register(SimilarityMatrix)
class SimilarityMatrixAdmin(admin.ModelAdmin):
    """相似度矩阵管理界面"""
    
    list_display = ['similarity_type', 'entity_a_type', 'entity_a_id', 'entity_b_type', 'entity_b_id', 'similarity_score', 'updated_at']
    search_fields = ['similarity_type', 'entity_a_type', 'entity_b_type']
    list_filter = ['similarity_type']
    list_editable = ['similarity_score']
    
    fieldsets = [
        ('基本信息', {
            'fields': ['similarity_type', 'entity_a_type', 'entity_a_id', 'entity_b_type', 'entity_b_id']
        }),
        ('相似度信息', {
            'fields': ['similarity_score', 'calculation_method', 'calculation_data']
        }),
        ('时间信息', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]
    
    readonly_fields = ['created_at', 'updated_at']
    
    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M')
    updated_at_formatted.short_description = '最后更新'


@admin.register(RecommendationFeedback)
class RecommendationFeedbackAdmin(admin.ModelAdmin):
    """推荐反馈管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'user', 'recommendation', 'feedback_type', 'feedback_score', 
        'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['user__username', 'recommendation__target_type', 'feedback_type']
    
    # 过滤器
    list_filter = [
        'feedback_type', 'created_at'
    ]
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('基本信息', {
            'fields': ('user', 'recommendation', 'feedback_type')
        }),
        ('反馈详情', {
            'fields': ('feedback_score', 'feedback_comment')
        }),
        ('状态信息', {
            'fields': ('created_at',)
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related('user', 'recommendation')


@admin.register(PopularItem)
class PopularItemAdmin(admin.ModelAdmin):
    """热门项目管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'item_type', 'item_id', 'popularity_score', 'view_count', 
        'appointment_count', 'time_period', 'created_at'
    ]
    
    # 可搜索的字段
    search_fields = ['item_type']
    
    # 过滤器
    list_filter = [
        'item_type', 'time_period', 'created_at'
    ]
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['-popularity_score']
    
    # 字段分组显示
    fieldsets = [
        ('项目信息', {
            'fields': ('item_type', 'item_id')
        }),
        ('热度信息', {
            'fields': ('popularity_score', 'view_count', 'appointment_count', 'feedback_count')
        }),
        ('时间信息', {
            'fields': ('time_period', 'period_start', 'period_end'),
            'classes': ['collapse']
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request)


@admin.register(ColdStartStrategy)
class ColdStartStrategyAdmin(admin.ModelAdmin):
    """冷启动策略管理界面"""
    
    # 列表页显示的字段
    list_display = [
        'id', 'name', 'strategy_type', 'status', 'priority', 'created_at', 'updated_at'
    ]
    
    # 可搜索的字段
    search_fields = ['name', 'strategy_type', 'description']
    
    # 过滤器
    list_filter = [
        'strategy_type', 'status', 'priority', 'created_at'
    ]
    
    # 可编辑的字段
    list_editable = ['priority', 'status']
    
    # 每页显示的数量
    list_per_page = 20
    
    # 排序
    ordering = ['priority', '-created_at']
    
    # 字段分组显示
    fieldsets = [
        ('策略信息', {
            'fields': ('name', 'strategy_type', 'description')
        }),
        ('策略配置', {
            'fields': ('strategy_config', 'priority', 'status')
        }),
        ('适用条件', {
            'fields': ('min_user_behavior_count', 'max_user_behavior_count')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    ]
    
    # 只读字段
    readonly_fields = ['created_at', 'updated_at']
    
    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M:%S') if obj.updated_at else 'N/A'
    updated_at_formatted.short_description = '更新时间'
