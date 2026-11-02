from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count
from .models import UserFavorite
from .serializers import UserFavoriteSerializer
from users.models import User
from smart_doctor.api_utils import APIResponse

class UserFavoriteViewSet(viewsets.ModelViewSet):
    """用户收藏视图集"""
    
    permission_classes = [IsAuthenticated]
    queryset = UserFavorite.objects.all()
    serializer_class = UserFavoriteSerializer
    
    def get_queryset(self):
        """用户只能查看自己的收藏"""
        return UserFavorite.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """获取用户收藏统计信息"""
        if not request.user.is_authenticated:
            return Response(
                {'success': False, 'error': '请先登录'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # 统计用户收藏总数
            total_favorites = UserFavorite.objects.filter(user=request.user).count()
            
            # 按类型统计
            doctor_favorites = UserFavorite.objects.filter(
                user=request.user, 
                favorite_type='doctor'
            ).count()
            
            hospital_favorites = UserFavorite.objects.filter(
                user=request.user, 
                favorite_type='hospital'
            ).count()
            
            stats_data = {
                'total': total_favorites,
                'doctor_count': doctor_favorites,
                'hospital_count': hospital_favorites,
                'last_updated': request.user.last_favorited_at.isoformat() if request.user.last_favorited_at else None
            }
            
            return Response(
                {'success': True, 'message': '获取收藏统计成功', 'data': stats_data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'获取收藏统计失败: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def check_collection(self, request):
        """检查用户是否收藏了特定医生"""
        if not request.user.is_authenticated:
            return APIResponse.unauthorized("请先登录")
        
        doctor_id = request.query_params.get('doctor_id')
        if not doctor_id:
            return APIResponse.bad_request("缺少医生ID参数")
        
        try:
            # 检查用户是否收藏了该医生
            is_collected = UserFavorite.objects.filter(
                user=request.user,
                favorite_type='doctor',
                doctor_id=doctor_id
            ).exists()
            
            return APIResponse.success(
                message="检查收藏状态成功",
                data={
                    'is_collected': is_collected,
                    'doctor_id': doctor_id
                }
            )
            
        except Exception as e:
            return APIResponse.server_error(f"检查收藏状态失败: {str(e)}")
    
    @action(detail=False, methods=['post'])
    def toggle_collection(self, request):
        """切换收藏状态（添加/删除收藏）"""
        if not request.user.is_authenticated:
            return APIResponse.unauthorized("请先登录")
        
        doctor_id = request.data.get('doctor_id')
        action_type = request.data.get('action', 'add')  # add 或 delete
        
        if not doctor_id:
            return APIResponse.bad_request("缺少医生ID参数")
        
        try:
            if action_type == 'add':
                # 检查是否已收藏
                existing_favorite = UserFavorite.objects.filter(
                    user=request.user,
                    favorite_type='doctor',
                    doctor_id=doctor_id
                ).first()
                
                if existing_favorite:
                    return APIResponse.success(
                        message="已收藏该医生", 
                        data={'is_collected': True}
                    )
                
                # 创建新收藏
                favorite = UserFavorite.objects.create(
                    user=request.user,
                    favorite_type='doctor',
                    doctor_id=doctor_id
                )

                # 更新用户统计（事务保护，避免并发计数错乱）
                user = request.user
                with transaction.atomic():
                    user.favorite_count = UserFavorite.objects.filter(user=user).count()
                    user.last_favorited_at = favorite.created_at
                    user.save()
                
                return APIResponse.success(
                    message="收藏成功", 
                    data={'is_collected': True}
                    )
                
            elif action_type == 'delete':
                # 删除收藏
                deleted_count, _ = UserFavorite.objects.filter(
                    user=request.user,
                    favorite_type='doctor',
                    doctor_id=doctor_id
                ).delete()
                
                if deleted_count > 0:
                    # 更新用户统计
                    user = request.user
                    user.favorite_count = UserFavorite.objects.filter(user=user).count()
                    user.save()
                    return APIResponse.success(
                        message="取消收藏成功", 
                        data={'is_collected': False}
                        )
                else:
                    return APIResponse.success(
                        message="未收藏该医生", 
                        data={'is_collected': False}
                        )
            else:
                return APIResponse.bad_request("无效的操作类型，支持 add 或 delete")
                
        except Exception as e:
            return APIResponse.server_error(f"操作收藏失败: {str(e)}")
    
    def perform_create(self, serializer):
        """创建收藏时更新用户统计信息"""
        favorite = serializer.save(user=self.request.user)
        
        # 更新用户收藏统计
        user = self.request.user
        user.favorite_count = UserFavorite.objects.filter(user=user).count()
        user.last_favorited_at = favorite.created_at
        user.save()
    
    def perform_destroy(self, instance):
        """删除收藏时更新用户统计信息"""
        user = self.request.user
        instance.delete()
        
        # 更新用户收藏统计
        user.favorite_count = UserFavorite.objects.filter(user=user).count()
        user.save()
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """获取用户最近收藏的医生"""
        if not request.user.is_authenticated:
            return Response(
                {'success': False, 'error': '请先登录'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # 获取最近5条收藏记录
            recent_favorites = UserFavorite.objects.filter(
                user=request.user,
                favorite_type='doctor'
            ).select_related('doctor', 'doctor__hospital').order_by('-created_at')[:5]
            
            # 格式化数据
            favorites_data = []
            for favorite in recent_favorites:
                if favorite.doctor:
                    favorites_data.append({
                        'id': favorite.id,
                        'doctor_id': favorite.doctor.id,
                        'doctor_name': favorite.doctor.name,
                        'doctor_title': favorite.doctor.title,
                        'doctor_avatar': favorite.doctor.avatar.url if favorite.doctor.avatar else None,
                        'hospital_name': favorite.doctor.hospital.name if favorite.doctor.hospital else None,
                        'favorite_time': favorite.created_at.isoformat()
                    })
            
            return Response(
                {'success': True, 'message': '获取最近收藏成功', 'results': favorites_data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'获取最近收藏失败: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
