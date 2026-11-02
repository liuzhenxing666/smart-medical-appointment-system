"""
Web Crawler 统计和监控API
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Avg, Max, Min, Q, Case, When
from django.utils import timezone
from datetime import timedelta
from .models import HospitalCrawlData, CrawlLog


@api_view(['GET'])
def crawl_stats(request):
    """爬虫统计信息"""
    
    # 时间范围：最近30天
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    # 医院数据统计
    hospital_stats = HospitalCrawlData.objects.aggregate(
        total_hospitals=Count('id'),
        active_hospitals=Count('id', filter=models.Q(data_status='active')),
        inactive_hospitals=Count('id', filter=models.Q(data_status='inactive')),
        avg_doctor_count=Avg('doctor_count'),
        avg_schedule_count=Avg('schedule_count'),
    )
    
    # 爬虫日志统计
    crawl_log_stats = CrawlLog.objects.filter(
        start_time__gte=thirty_days_ago
    ).aggregate(
        total_crawls=Count('id'),
        successful_crawls=Count('id', filter=models.Q(status='success')),
        failed_crawls=Count('id', filter=models.Q(status='error')),
        avg_duration=Avg('duration'),
        max_duration=Max('duration'),
        min_duration=Min('duration'),
    )
    
    # 最近爬虫活动
    recent_crawls = CrawlLog.objects.filter(
        start_time__gte=thirty_days_ago
    ).order_by('-start_time')[:10]
    
    recent_crawls_data = [
        {
            'hospital_name': crawl.hospital_name,
            'crawl_type': crawl.crawl_type,
            'status': crawl.status,
            'start_time': crawl.start_time,
            'duration': crawl.duration,
            'error_message': crawl.error_message,
        }
        for crawl in recent_crawls
    ]
    
    # 城市分布统计
    city_distribution = HospitalCrawlData.objects.values('city').annotate(
        count=Count('id'),
        avg_doctors=Avg('doctor_count'),
        avg_schedules=Avg('schedule_count'),
    ).order_by('-count')
    
    stats = {
        'hospital_stats': hospital_stats,
        'crawl_log_stats': crawl_log_stats,
        'recent_crawls': recent_crawls_data,
        'city_distribution': list(city_distribution),
        'time_range': {
            'start': thirty_days_ago,
            'end': timezone.now(),
        }
    }
    
    return Response(stats)


@api_view(['GET'])
def hospital_detail_stats(request, hospital_name):
    """指定医院的详细统计信息"""
    
    try:
        hospital_data = HospitalCrawlData.objects.get(hospital_name=hospital_name)
    except HospitalCrawlData.DoesNotExist:
        return Response(
            {'error': '医院不存在'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # 该医院的爬虫历史
    crawl_history = CrawlLog.objects.filter(
        hospital_name=hospital_name
    ).order_by('-start_time')[:20]
    
    crawl_history_data = [
        {
            'crawl_type': crawl.crawl_type,
            'status': crawl.status,
            'start_time': crawl.start_time,
            'duration': crawl.duration,
            'error_message': crawl.error_message,
        }
        for crawl in crawl_history
    ]
    
    # 成功率统计
    success_rate = CrawlLog.objects.filter(
        hospital_name=hospital_name
    ).aggregate(
        total=Count('id'),
        success=Count('id', filter=models.Q(status='success')),
        success_rate=Avg(models.Case(
            models.When(status='success', then=1),
            default=0,
            output_field=models.FloatField()
        ))
    )
    
    # 平均爬虫时间
    avg_duration = CrawlLog.objects.filter(
        hospital_name=hospital_name,
        status='success'
    ).aggregate(avg_duration=Avg('duration'))
    
    stats = {
        'hospital_info': {
            'name': hospital_data.hospital_name,
            'city': hospital_data.city,
            'data_status': hospital_data.data_status,
            'last_crawled': hospital_data.last_crawled,
            'doctor_count': hospital_data.doctor_count,
            'schedule_count': hospital_data.schedule_count,
        },
        'crawl_stats': {
            'success_rate': success_rate['success_rate'] * 100 if success_rate['success_rate'] else 0,
            'total_crawls': success_rate['total'],
            'successful_crawls': success_rate['success'],
            'avg_duration': avg_duration['avg_duration'],
        },
        'crawl_history': crawl_history_data,
    }
    
    return Response(stats)


@api_view(['GET'])
def sync_status(request):
    """数据同步状态"""
    
    from .sync_services import data_sync_service
    
    # 获取同步统计
    sync_stats = {
        'last_sync_time': None,
        'total_hospitals_synced': 0,
        'successful_syncs': 0,
        'failed_syncs': 0,
    }
    
    # 最近同步记录
    recent_syncs = CrawlLog.objects.filter(
        crawl_type='sync'
    ).order_by('-start_time')[:10]
    
    recent_syncs_data = [
        {
            'hospital_name': sync.hospital_name,
            'status': sync.status,
            'start_time': sync.start_time,
            'duration': sync.duration,
            'error_message': sync.error_message,
        }
        for sync in recent_syncs
    ]
    
    # 同步成功率
    sync_success_rate = CrawlLog.objects.filter(
        crawl_type='sync'
    ).aggregate(
        total=Count('id'),
        success=Count('id', filter=models.Q(status='success')),
        success_rate=Avg(models.Case(
            models.When(status='success', then=1),
            default=0,
            output_field=models.FloatField()
        ))
    )
    
    stats = {
        'sync_stats': sync_stats,
        'recent_syncs': recent_syncs_data,
        'sync_success_rate': sync_success_rate['success_rate'] * 100 if sync_success_rate['success_rate'] else 0,
        'total_syncs': sync_success_rate['total'],
        'successful_syncs': sync_success_rate['success'],
    }
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def trigger_sync(request):
    """手动触发数据同步（仅管理员）"""
    
    hospital_name = request.data.get('hospital_name')
    city = request.data.get('city', '贵阳')
    
    from .sync_services import data_sync_service
    
    try:
        if hospital_name:
            # 同步指定医院
            result = data_sync_service.sync_hospital_data(hospital_name, city)
            if result:
                return Response({
                    'status': 'success',
                    'message': f'成功同步医院数据: {hospital_name}',
                    'hospital': hospital_name
                })
            else:
                return Response({
                    'status': 'error',
                    'message': f'同步医院数据失败: {hospital_name}'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # 同步所有医院
            success_count, total_count = data_sync_service.sync_all_hospitals(city)
            return Response({
                'status': 'success',
                'message': f'同步完成: {success_count}/{total_count} 成功',
                'success_count': success_count,
                'total_count': total_count
            })
    
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'同步失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)