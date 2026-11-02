"""
智能推荐引擎
实现基于机器学习的个性化推荐算法
"""

import numpy as np
import pandas as pd
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import timedelta
import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

from .models import (
    UserPreference, UserBehavior, RecommendationRule, 
    RecommendationResult, PopularItem, SimilarityMatrix
)
from users.models import User
from hospitals.models import Hospital
from doctors.models import Doctor


class AIRecommendationEngine:
    """智能推荐引擎类"""
    
    def __init__(self):
        self.user_profiles = {}
        self.item_features = {}
        self.similarity_cache = {}
        
    def build_user_profile(self, user_id: str) -> Dict[str, Any]:
        """构建用户画像"""
        
        # 获取用户基本信息
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return {}
        
        # 获取用户偏好
        preferences = UserPreference.objects.filter(user=user)
        preference_profile = {}
        for pref in preferences:
            preference_profile[pref.preference_type] = {
                'value': pref.preference_value,
                'weight': pref.weight
            }
        
        # 分析用户行为模式
        behaviors = list(UserBehavior.objects.filter(user=user).order_by('-created_at')[:1000])
        
        # 行为统计
        behavior_stats = self._analyze_user_behavior(behaviors)
        
        # 兴趣标签提取
        interest_tags = self._extract_interest_tags(behaviors)
        
        # 构建完整用户画像
        user_profile = {
            'basic_info': {
                'age': user.age if hasattr(user, 'age') else None,
                'gender': user.gender if hasattr(user, 'gender') else None,
                'location': user.location if hasattr(user, 'location') else None
            },
            'preferences': preference_profile,
            'behavior_stats': behavior_stats,
            'interest_tags': interest_tags,
            'last_updated': timezone.now()
        }
        
        self.user_profiles[user_id] = user_profile
        return user_profile
    
    def _analyze_user_behavior(self, behaviors) -> Dict[str, Any]:
        """分析用户行为模式"""
        
        if not behaviors:
            return {}
        
        # 按行为类型统计
        behavior_counts = defaultdict(int)
        for behavior in behaviors:
            behavior_counts[behavior.behavior_type] += 1
        
        # 时间模式分析 - 手动过滤最近30天的行为
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_behaviors = [
            behavior for behavior in behaviors 
            if behavior.created_at >= thirty_days_ago
        ]
        
        # 活跃度分析
        activity_level = len(recent_behaviors) / 30  # 日均活跃度
        
        return {
            'total_behaviors': len(behaviors),
            'recent_behaviors': len(recent_behaviors),
            'activity_level': activity_level,
            'behavior_counts': dict(behavior_counts),
            'preferred_time_slots': self._analyze_time_patterns(behaviors)
        }
    
    def _extract_interest_tags(self, behaviors) -> List[Dict[str, Any]]:
        """从行为中提取兴趣标签"""
        
        interest_tags = []
        
        # 分析医院偏好
        hospital_views = [behavior for behavior in behaviors if behavior.behavior_type == 'view_hospital']
        if hospital_views:
            hospital_tags = self._analyze_hospital_preferences(hospital_views)
            interest_tags.extend(hospital_tags)
        
        # 分析医生偏好
        doctor_views = [behavior for behavior in behaviors if behavior.behavior_type == 'view_doctor']
        if doctor_views:
            doctor_tags = self._analyze_doctor_preferences(doctor_views)
            interest_tags.extend(doctor_tags)
        
        # 分析专科偏好
        specialty_tags = self._analyze_specialty_preferences(behaviors)
        interest_tags.extend(specialty_tags)
        
        return interest_tags
    
    def _analyze_hospital_preferences(self, hospital_views):
        """分析医院偏好"""
        tags = []
        hospital_ids = [bv.target_id for bv in hospital_views]
        
        # 获取医院信息
        hospitals = Hospital.objects.filter(id__in=hospital_ids)
        
        # 分析医院类型偏好
        type_counts = defaultdict(int)
        for hospital in hospitals:
            if hospital.specialties:
                specialties = hospital.specialties.split(',')
                for specialty in specialties:
                    type_counts[specialty.strip()] += 1
        
        for specialty, count in type_counts.items():
            if count >= 2:  # 至少查看过2次该专科的医院
                tags.append({
                    'type': 'hospital_specialty',
                    'value': specialty,
                    'confidence': min(count / len(hospital_views), 1.0),
                    'source': 'behavior_analysis'
                })
        
        return tags
    
    def _analyze_doctor_preferences(self, doctor_views):
        """分析医生偏好"""
        tags = []
        doctor_ids = [bv.target_id for bv in doctor_views]
        
        # 获取医生信息
        doctors = Doctor.objects.filter(id__in=doctor_ids)
        
        # 分析专科偏好
        specialty_counts = defaultdict(int)
        for doctor in doctors:
            if doctor.specialty:
                specialty_counts[doctor.specialty] += 1
        
        for specialty, count in specialty_counts.items():
            if count >= 2:
                tags.append({
                    'type': 'doctor_specialty',
                    'value': specialty,
                    'confidence': min(count / len(doctor_views), 1.0),
                    'source': 'behavior_analysis'
                })
        
        return tags
    
    def _analyze_specialty_preferences(self, behaviors):
        """分析专科偏好"""
        # 从搜索行为中提取专科偏好
        search_behaviors = [
            behavior for behavior in behaviors 
            if behavior.behavior_type in ['search_hospital', 'search_doctor']
        ]
        
        tags = []
        specialty_keywords = ['内科', '外科', '儿科', '妇产科', '眼科', '牙科', '皮肤科', '心理科']
        
        for behavior in search_behaviors:
            search_data = behavior.behavior_data
            if 'keywords' in search_data:
                keywords = search_data['keywords']
                for specialty in specialty_keywords:
                    if specialty in keywords:
                        tags.append({
                            'type': 'search_specialty',
                            'value': specialty,
                            'confidence': 0.8,
                            'source': 'search_analysis'
                        })
        
        return tags
    
    def _analyze_time_patterns(self, behaviors):
        """分析时间模式"""
        time_slots = defaultdict(int)
        
        for behavior in behaviors:
            hour = behavior.created_at.hour
            time_slot = self._get_time_slot(hour)
            time_slots[time_slot] += 1
        
        return dict(time_slots)
    
    def _get_time_slot(self, hour):
        """将小时转换为时间段"""
        if 6 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 18:
            return 'afternoon'
        elif 18 <= hour < 22:
            return 'evening'
        else:
            return 'night'
    
    def calculate_personalized_score(self, user_id: str, item: Dict[str, Any], 
                                   item_type: str) -> float:
        """计算个性化推荐分数"""
        
        # 构建用户画像（如果不存在）
        if user_id not in self.user_profiles:
            self.build_user_profile(user_id)
        
        user_profile = self.user_profiles.get(user_id, {})
        
        # 基础分数
        base_score = self._calculate_base_score(item, item_type)
        
        # 个性化分数
        personalization_score = self._calculate_personalization_score(user_profile, item, item_type)
        
        # 实时行为分数
        realtime_score = self._calculate_realtime_score(user_id, item, item_type)
        
        # 综合分数
        final_score = (
            base_score * 0.3 +
            personalization_score * 0.5 +
            realtime_score * 0.2
        )
        
        return min(1.0, max(0.0, final_score))
    
    def _calculate_base_score(self, item: Dict[str, Any], item_type: str) -> float:
        """计算基础分数"""
        
        if item_type == 'hospital':
            # 医院基础分数：基于评分、评价数、距离等
            rating = item.get('average_rating', 0) / 5.0
            review_count = min(item.get('review_count', 0) / 100, 1.0)  # 归一化
            distance_score = 1.0 - min(item.get('distance', 0) / 20, 1.0)  # 距离越近分数越高
            
            return (rating * 0.5 + review_count * 0.3 + distance_score * 0.2)
        
        elif item_type == 'doctor':
            # 医生基础分数：基于评分、经验、可预约性等
            rating = item.get('average_rating', 0) / 5.0
            experience = min(item.get('experience_years', 0) / 30, 1.0)  # 经验归一化
            availability = 1.0 if item.get('is_available', False) else 0.5
            
            return (rating * 0.4 + experience * 0.4 + availability * 0.2)
        
        return 0.5  # 默认分数
    
    def _calculate_personalization_score(self, user_profile: Dict[str, Any], 
                                        item: Dict[str, Any], item_type: str) -> float:
        """计算个性化分数"""
        
        if not user_profile:
            return 0.5  # 默认分数
        
        score = 0.0
        weight_sum = 0.0
        
        # 专科匹配分数
        if 'interest_tags' in user_profile:
            for tag in user_profile['interest_tags']:
                if tag['type'] in ['hospital_specialty', 'doctor_specialty', 'search_specialty']:
                    if item_type == 'hospital' and 'specialties' in item:
                        specialties = item['specialties'].split(',')
                        if tag['value'] in specialties:
                            score += tag['confidence'] * 0.8
                            weight_sum += 0.8
                    elif item_type == 'doctor' and 'specialty' in item:
                        if tag['value'] == item['specialty']:
                            score += tag['confidence'] * 0.8
                            weight_sum += 0.8
        
        # 位置偏好匹配
        if 'preferences' in user_profile and 'distance_preference' in user_profile['preferences']:
            pref = user_profile['preferences']['distance_preference']
            max_distance = pref['value'].get('max_distance', 100)
            distance = item.get('distance', 0)
            if distance <= max_distance:
                distance_score = 1.0 - (distance / max_distance)
                score += distance_score * pref['weight'] * 0.6
                weight_sum += 0.6
        
        # 评分偏好匹配
        if 'preferences' in user_profile and 'rating_preference' in user_profile['preferences']:
            pref = user_profile['preferences']['rating_preference']
            min_rating = pref['value'].get('min_rating', 3.0)
            rating = item.get('average_rating', 0)
            if rating >= min_rating:
                rating_score = (rating - min_rating) / (5.0 - min_rating)
                score += rating_score * pref['weight'] * 0.4
                weight_sum += 0.4
        
        return score / weight_sum if weight_sum > 0 else 0.5
    
    def _calculate_realtime_score(self, user_id: str, item: Dict[str, Any], 
                                 item_type: str) -> float:
        """计算实时行为分数"""
        
        # 获取最近行为
        recent_behaviors = UserBehavior.objects.filter(
            user_id=user_id,
            created_at__gte=timezone.now() - timedelta(hours=24)
        )
        
        score = 0.0
        
        # 分析相似项目的行为
        similar_items = self._find_similar_items(item, item_type)
        for similar_item in similar_items:
            similar_behaviors = recent_behaviors.filter(
                target_id=similar_item['id'],
                target_type=item_type
            )
            if similar_behaviors.exists():
                score += 0.3 * similar_item['similarity']
        
        return min(score, 1.0)
    
    def _find_similar_items(self, item: Dict[str, Any], item_type: str) -> List[Dict[str, Any]]:
        """查找相似项目"""
        
        # 简化的相似度计算（实际项目中可以使用更复杂的算法）
        similar_items = []
        
        if item_type == 'hospital':
            # 基于专科相似度
            if 'specialties' in item:
                specialties = set(item['specialties'].split(','))
                
                # 查找具有相似专科的医院
                similar_hospitals = Hospital.objects.filter(
                    specialties__icontains=item['specialties'].split(',')[0] if item['specialties'] else ''
                ).exclude(id=item.get('id'))[:5]
                
                for hospital in similar_hospitals:
                    hospital_specialties = set(hospital.specialties.split(','))
                    similarity = len(specialties.intersection(hospital_specialties)) / len(specialties.union(hospital_specialties))
                    
                    similar_items.append({
                        'id': hospital.id,
                        'similarity': similarity,
                        'type': 'hospital'
                    })
        
        return similar_items
    
    def generate_recommendation_reason(self, user_id: str, item: Dict[str, Any], 
                                     item_type: str, score: float) -> str:
        """生成推荐理由"""
        
        reasons = []
        
        # 基础理由
        if item_type == 'hospital':
            if item.get('average_rating', 0) >= 4.5:
                reasons.append("高评分医院")
            if item.get('distance', 0) <= 5:
                reasons.append("距离较近")
            if 'specialties' in item:
                reasons.append(f"专科优势: {item['specialties'][:20]}")
        
        elif item_type == 'doctor':
            if item.get('average_rating', 0) >= 4.7:
                reasons.append("患者评价优秀")
            if item.get('experience_years', 0) >= 10:
                reasons.append("经验丰富")
            if item.get('is_available', False):
                reasons.append("可立即预约")
        
        # 个性化理由
        if user_id in self.user_profiles:
            user_profile = self.user_profiles[user_id]
            
            # 检查专科匹配
            if 'interest_tags' in user_profile:
                for tag in user_profile['interest_tags']:
                    if tag['confidence'] > 0.7:
                        if item_type == 'hospital' and 'specialties' in item:
                            if tag['value'] in item['specialties']:
                                reasons.append(f"符合您的{tag['value']}偏好")
                        elif item_type == 'doctor' and 'specialty' in item:
                            if tag['value'] == item['specialty']:
                                reasons.append(f"符合您的{tag['value']}专科偏好")
        
        if not reasons:
            reasons.append("基于综合评估推荐")
        
        return "，".join(reasons[:3])  # 最多显示3个理由


# 全局推荐引擎实例
recommendation_engine = AIRecommendationEngine()