from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class ReviewStatsView(APIView):
    """用户评价统计接口"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """获取用户评价统计信息（从用户模型冗余统计字段读取真实数据）"""
        user = request.user

        stats_data = {
            'total': user.review_count,
            'average_rating': round(user.average_rating, 1),
            'last_reviewed_at': user.last_reviewed_at,
        }

        return Response({
            'success': True,
            'message': '获取评价统计成功',
            'data': stats_data
        }, status=status.HTTP_200_OK)
