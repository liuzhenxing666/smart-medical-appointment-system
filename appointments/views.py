"""
预约管理API视图
提供预约的CRUD操作、状态管理、搜索和统计功能
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.models import AnonymousUser
from smart_doctor.api_utils import APIResponse
from smart_doctor.cache_utils import cached_api

from .models import Appointment, AppointmentReminder, AppointmentFeedback, AppointmentStatistics
from .serializers import (
    AppointmentListSerializer, AppointmentDetailSerializer, 
    AppointmentCreateUpdateSerializer, AppointmentSearchSerializer,
    AppointmentReminderSerializer, AppointmentFeedbackSerializer,
    AppointmentStatisticsSerializer, FeedbackCreateSerializer, ReminderCreateSerializer
)
from users.models import User
from doctors.models import Doctor
from hospitals.models import Hospital, Department
from .weather_utils import weather_service


class AppointmentPagination(PageNumberPagination):
    """预约分页类"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AppointmentViewSet(viewsets.ModelViewSet):
    """预约视图集（pk 限定为 UUID，避免与 upcoming/statistics 等列表级 action 路径冲突）"""
    lookup_value_regex = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

    queryset = Appointment.objects.all().select_related(
        'user', 'doctor', 'hospital', 'department'
    ).prefetch_related('reminders', 'feedbacks')
    
    pagination_class = AppointmentPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'appointment_type', 'hospital', 'doctor', 'department']
    search_fields = ['appointment_number', 'user__username', 'doctor__name', 'symptoms']
    ordering_fields = ['appointment_date', 'appointment_time', 'created_at', 'total_fee']
    ordering = ['-appointment_date', '-appointment_time', '-created_at', 'id']  # 添加更多排序字段确保唯一性
    
    def get_serializer_class(self):
        """根据请求类型返回不同的序列化器"""
        if self.action == 'list':
            return AppointmentListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AppointmentCreateUpdateSerializer
        else:
            return AppointmentDetailSerializer
    
    def get_permissions(self):
        """根据操作设置权限"""
        if self.action in ['create', 'list', 'retrieve', 'cancel']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy', 'complete']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """创建预约时强制绑定当前登录用户（兼容 JSON 和表单请求）"""
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """创建预约并返回完整详情（含预约ID，由后端绑定当前用户）"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(user=request.user)
        output = AppointmentDetailSerializer(instance, context=self.get_serializer_context()).data
        return APIResponse.success(output, '预约创建成功', status_code=201)

    def _get_owned_appointment(self, request, pk):
        """获取预约并校验所有权（本人或管理员）"""
        try:
            appointment = Appointment.objects.select_related(
                'user', 'doctor', 'hospital', 'department'
            ).get(pk=pk)
        except Appointment.DoesNotExist:
            return None
        if appointment.user != request.user and not request.user.is_staff:
            return None
        return appointment

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """确认预约（本人或管理员）"""
        appointment = self._get_owned_appointment(request, pk)
        if appointment is None:
            return APIResponse.not_found('预约不存在或无权操作')
        if appointment.status != 'pending':
            return APIResponse.bad_request(f"当前状态为 {appointment.status}，无法确认")
        appointment.confirm_appointment(
            approved_by=request.user if request.user.is_staff else None
        )
        return APIResponse.success('预约确认成功')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """取消预约（本人或管理员），复用模型的取消逻辑以联动排班计数"""
        appointment = self._get_owned_appointment(request, pk)
        if appointment is None:
            return APIResponse.not_found('预约不存在或无权操作')
        if appointment.status in ['completed', 'cancelled']:
            return APIResponse.bad_request(f"当前状态为 {appointment.status}，无法取消")
        appointment.cancel_appointment(
            reason=request.data.get('reason', '用户主动取消'),
            cancelled_by=request.user
        )
        return APIResponse.success('预约取消成功')

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """完成预约（仅管理员）"""
        appointment = self.get_object()
        if appointment.status not in ['confirmed', 'pending']:
            return APIResponse.bad_request(f"当前状态为 {appointment.status}，无法完成")
        appointment.complete_appointment(
            diagnosis=request.data.get('diagnosis', ''),
            medical_notes=request.data.get('medical_notes', '')
        )
        return APIResponse.success('预约已完成')

    @action(detail=False, methods=['post'])
    def search(self, request):
        """预约搜索（支持按状态、日期范围、医院、医生等条件过滤）"""
        serializer = AppointmentSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.validation_error('搜索参数验证失败', serializer.errors)

        queryset = self.get_queryset()
        filters = serializer.validated_data

        def filter_by_ref(qs, id_field, name_field, value):
            """优先按 ID 精确匹配，非法 UUID 时回退到名称模糊匹配"""
            import uuid as uuid_lib
            try:
                uuid_lib.UUID(str(value))
                return qs.filter(Q(**{f"{id_field}": value}) | Q(**{f"{name_field}__icontains": value}))
            except (ValueError, TypeError):
                return qs.filter(**{f"{name_field}__icontains": value})

        if filters.get('status'):
            queryset = queryset.filter(status=filters['status'])
        if filters.get('payment_status'):
            queryset = queryset.filter(payment_status=filters['payment_status'])
        if filters.get('appointment_date_from'):
            queryset = queryset.filter(appointment_date__gte=filters['appointment_date_from'])
        if filters.get('appointment_date_to'):
            queryset = queryset.filter(appointment_date__lte=filters['appointment_date_to'])
        if filters.get('hospital'):
            queryset = filter_by_ref(queryset, 'hospital__id', 'hospital__name', filters['hospital'])
        if filters.get('doctor'):
            queryset = filter_by_ref(queryset, 'doctor__id', 'doctor__name', filters['doctor'])
        if filters.get('user'):
            queryset = filter_by_ref(queryset, 'user__id', 'user__username', filters['user'])
        if filters.get('department'):
            queryset = filter_by_ref(queryset, 'department__id', 'department__name', filters['department'])

        page = self.paginate_queryset(queryset)
        if page is not None:
            result_serializer = self.get_serializer(page, many=True)
            return APIResponse.success({
                'count': self.paginator.page.paginator.count,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
                'results': result_serializer.data
            }, '预约搜索成功')
        result_serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(result_serializer.data, '预约搜索成功')

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """获取当前用户的预约统计信息"""
        queryset = self.get_queryset()
        total = queryset.count()
        status_counts = queryset.values('status').annotate(count=Count('id'))
        status_stats = {item['status']: item['count'] for item in status_counts}
        total_fee = queryset.filter(status='completed').aggregate(total=Sum('total_fee'))['total'] or 0
        return APIResponse.success({
            'total': total,
            'status_breakdown': status_stats,
            'pending': status_stats.get('pending', 0),
            'confirmed': status_stats.get('confirmed', 0),
            'completed': status_stats.get('completed', 0),
            'cancelled': status_stats.get('cancelled', 0),
            'completed_total_fee': total_fee
        }, '获取预约统计成功')
    
    def get_queryset(self):
        """根据用户权限过滤查询集"""
        queryset = super().get_queryset()
        
        # 普通用户只能看到自己的预约
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """重写list方法，支持多个status值的过滤"""
        # 获取查询参数
        status_param = request.query_params.get('status', '')
        
        # 如果status参数包含逗号分隔的多个值，手动处理过滤
        if status_param and ',' in status_param:
            status_list = [s.strip() for s in status_param.split(',') if s.strip()]
            
            # 创建新的查询集，应用多个状态过滤
            queryset = self.get_queryset()
            queryset = queryset.filter(status__in=status_list)
            
            # 应用分页
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                # 统一返回APIResponse格式，确保前端能正确解析
                return APIResponse.success('获取预约列表成功', {
                    'count': self.paginator.page.paginator.count,
                    'next': self.paginator.get_next_link(),
                    'previous': self.paginator.get_previous_link(),
                    'results': serializer.data
                })
            
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse.success('获取预约列表成功', serializer.data)
        
        # 如果status参数是单个值或为空，使用默认的过滤器
        # 统一返回APIResponse格式，确保前端能正确解析
        response = super().list(request, *args, **kwargs)
        
        # 如果是分页响应，包装为APIResponse格式
        if hasattr(response, 'data'):
            return APIResponse.success(response.data, '获取预约列表成功')
        
        return response
    
    @action(detail=False, methods=['get'])
    @cached_api(cache_type='appointment_upcoming', timeout=300)  # 5分钟缓存
    def upcoming(self, request):
        """获取即将到来的预约"""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(
            appointment_date__gte=today,
            status__in=['pending', 'confirmed']
        ).order_by('appointment_date', 'appointment_time')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # 统一返回APIResponse格式，确保前端能正确解析
            return APIResponse.success({
                'count': self.paginator.page.paginator.count,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
                'results': serializer.data
            }, '获取预约列表成功')
        
        serializer = self.get_serializer(queryset, many=True)
        # 统一返回APIResponse格式，确保前端能正确解析
        return APIResponse.success({
            'count': queryset.count(),
            'next': None,
            'previous': None,
            'results': serializer.data
        }, '获取预约列表成功')
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """获取历史预约"""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(
            Q(appointment_date__lt=today) | Q(status__in=['completed', 'cancelled', 'no_show'])
        ).order_by('-appointment_date', '-appointment_time')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # 统一返回APIResponse格式，确保前端能正确解析
            return APIResponse.success({
                'count': self.paginator.page.paginator.count,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
                'results': serializer.data
            }, '获取历史预约成功')
        
        serializer = self.get_serializer(queryset, many=True)
        # 统一返回APIResponse格式，确保前端能正确解析
        return APIResponse.success({
            'count': queryset.count(),
            'next': None,
            'previous': None,
            'results': serializer.data
        }, '获取历史预约成功')
    
    @action(detail=True, methods=['get'])
    def weather(self, request, pk=None):
        """获取预约日的天气信息"""
        try:
            appointment = self._get_owned_appointment(request, pk)
            if appointment is None:
                return APIResponse.not_found('预约不存在或无权查看该预约的天气信息')

            # 获取天气信息
            weather_info = weather_service.get_appointment_weather(appointment)

            if weather_info['success']:
                return APIResponse.success(weather_info, '获取天气信息成功')
            else:
                return APIResponse.error(f"获取天气信息失败: {weather_info.get('error', '未知错误')}")

        except Exception as e:
            return APIResponse.error(f"获取天气信息异常: {str(e)}")

    @action(detail=False, methods=['get'])
    def upcoming_weather(self, request):
        """获取即将到来的预约的天气信息"""
        try:
            # 获取即将到来的预约
            today = timezone.now().date()
            queryset = self.get_queryset().filter(
                appointment_date__gte=today,
                status__in=['pending', 'confirmed']
            ).order_by('appointment_date', 'appointment_time')

            # 批量获取天气信息
            appointments = list(queryset[:10])  # 限制数量，避免API调用过多
            weather_results = weather_service.batch_get_appointments_weather(appointments)

            return APIResponse.success(weather_results, '获取预约天气信息成功')

        except Exception as e:
            return APIResponse.error(f"获取预约天气信息异常: {str(e)}")

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """获取最近预约记录（个人中心使用）"""
        # 获取最近的5条预约记录
        queryset = self.get_queryset().order_by('-appointment_date', '-appointment_time')[:5]
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data, '获取最近预约记录成功')
    
    @action(detail=False, methods=['get'], authentication_classes=[], permission_classes=[])
    def demo(self, request):
        """演示端点，返回示例数据，无需认证"""
        # 创建示例数据
        demo_data = [
            {
                'id': 1,
                'appointment_number': 'AP20250001',
                'user': {'id': 1, 'username': 'demo_user'},
                'doctor': {'id': 1, 'name': '张医生', 'specialty': '内科'},
                'hospital': {'id': 1, 'name': '贵阳市第一人民医院'},
                'department': {'id': 1, 'name': '内科'},
                'appointment_date': '2025-11-20',
                'appointment_time': '09:00',
                'status': 'confirmed',
                'payment_status': 'paid',
                'total_fee': 50.00,
                'symptoms': '头痛、发热',
                'created_at': '2025-11-19T10:00:00Z'
            },
            {
                'id': 2,
                'appointment_number': 'AP20250002',
                'user': {'id': 1, 'username': 'demo_user'},
                'doctor': {'id': 2, 'name': '李医生', 'specialty': '外科'},
                'hospital': {'id': 2, 'name': '贵阳市第二人民医院'},
                'department': {'id': 2, 'name': '外科'},
                'appointment_date': '2025-11-21',
                'appointment_time': '14:30',
                'status': 'pending',
                'payment_status': 'unpaid',
                'total_fee': 60.00,
                'symptoms': '手臂疼痛',
                'created_at': '2025-11-19T11:00:00Z'
            },
            {
                'id': 3,
                'appointment_number': 'AP20250003',
                'user': {'id': 1, 'username': 'demo_user'},
                'doctor': {'id': 3, 'name': '王医生', 'specialty': '儿科'},
                'hospital': {'id': 3, 'name': '贵阳市儿童医院'},
                'department': {'id': 3, 'name': '儿科'},
                'appointment_date': '2025-11-22',
                'appointment_time': '10:15',
                'status': 'completed',
                'payment_status': 'paid',
                'total_fee': 45.00,
                'symptoms': '儿童感冒',
                'created_at': '2025-11-18T15:00:00Z'
            }
        ]
        
        # 返回APIResponse格式
        return APIResponse.success({
            'count': len(demo_data),
            'next': None,
            'previous': None,
            'results': demo_data
        }, '获取演示数据成功')


class AppointmentDemoView(APIView):
    """预约演示视图，完全绕过认证和权限检查"""
    
    # 完全禁用所有认证和权限检查
    authentication_classes = []
    permission_classes = []
    
    def dispatch(self, request, *args, **kwargs):
        """重写dispatch方法，完全绕过认证中间件"""
        # 手动设置用户为匿名用户，避免认证中间件检查
        request.user = AnonymousUser()
        return super().dispatch(request, *args, **kwargs)
    
    def get(self, request):
        """获取演示预约数据"""
        # 创建示例数据
        demo_data = [
            {
                'id': 1,
                'appointment_number': 'AP20250001',
                'user': {'id': 1, 'username': 'demo_user'},
                'doctor': {'id': 1, 'name': '张医生', 'specialty': '内科'},
                'hospital': {'id': 1, 'name': '贵阳市第一人民医院'},
                'department': {'id': 1, 'name': '内科'},
                'appointment_date': '2025-11-20',
                'appointment_time': '09:00',
                'status': 'confirmed',
                'payment_status': 'paid',
                'total_fee': 50.00,
                'symptoms': '头痛、发热',
                'created_at': '2025-11-19T10:00:00Z'
            },
            {
                'id': 2,
                'appointment_number': 'AP20250002',
                'user': {'id': 1, 'username': 'demo_user'},
                'doctor': {'id': 2, 'name': '李医生', 'specialty': '外科'},
                'hospital': {'id': 2, 'name': '贵阳市第二人民医院'},
                'department': {'id': 2, 'name': '外科'},
                'appointment_date': '2025-11-21',
                'appointment_time': '14:30',
                'status': 'pending',
                'payment_status': 'unpaid',
                'total_fee': 60.00,
                'symptoms': '手臂疼痛',
                'created_at': '2025-11-19T11:00:00Z'
            },
            {
                'id': 3,
                'appointment_number': 'AP20250003',
                'user': {'id': 1, 'username': 'demo_user'},
                'doctor': {'id': 3, 'name': '王医生', 'specialty': '儿科'},
                'hospital': {'id': 3, 'name': '贵阳市儿童医院'},
                'department': {'id': 3, 'name': '儿科'},
                'appointment_date': '2025-11-22',
                'appointment_time': '10:15',
                'status': 'completed',
                'payment_status': 'paid',
                'total_fee': 45.00,
                'symptoms': '儿童感冒',
                'created_at': '2025-11-18T15:00:00Z'
            }
        ]
        
        # 返回APIResponse格式
        return APIResponse.success({
            'count': len(demo_data),
            'next': None,
            'previous': None,
            'results': demo_data
        }, '获取演示数据成功')


class AppointmentReminderViewSet(viewsets.ModelViewSet):
    """预约提醒视图集"""
    
    queryset = AppointmentReminder.objects.all().select_related('appointment')
    serializer_class = AppointmentReminderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """根据用户权限过滤查询集"""
        queryset = super().get_queryset()
        
        # 普通用户只能看到自己预约的提醒
        if not self.request.user.is_staff:
            queryset = queryset.filter(appointment__user=self.request.user)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def create_reminder(self, request):
        """创建预约提醒"""
        serializer = ReminderCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # 检查用户是否有权限创建该预约的提醒
            appointment = serializer.validated_data['appointment']
            if appointment.user != request.user and not request.user.is_staff:
                return APIResponse.forbidden('没有权限为该预约创建提醒')
            
            reminder = serializer.save()
            return APIResponse.success('提醒创建成功', AppointmentReminderSerializer(reminder).data)
        
        return APIResponse.validation_error('创建提醒参数验证失败', serializer.errors)


class AppointmentFeedbackViewSet(viewsets.ModelViewSet):
    """预约反馈视图集"""
    
    queryset = AppointmentFeedback.objects.all().select_related('appointment', 'user')
    serializer_class = AppointmentFeedbackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """根据请求类型返回不同的序列化器"""
        if self.action == 'create':
            return FeedbackCreateSerializer
        return super().get_serializer_class()
    
    def get_queryset(self):
        """根据用户权限过滤查询集"""
        queryset = super().get_queryset()
        
        # 普通用户只能看到自己提交的反馈
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """处理反馈"""
        if not request.user.is_staff:
            return APIResponse.forbidden('只有管理员才能处理反馈')
        
        feedback = self.get_object()
        feedback.is_processed = True
        feedback.processed_at = timezone.now()
        feedback.save()
        
        return APIResponse.success('反馈提交成功', AppointmentFeedbackSerializer(feedback).data)


class AppointmentStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    """预约统计视图集"""
    
    queryset = AppointmentStatistics.objects.all().select_related('hospital', 'doctor', 'department')
    serializer_class = AppointmentStatisticsSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def generate_today(self, request):
        """生成今日统计"""
        today = timezone.now().date()
        
        # 检查是否已生成今日统计
        existing_stat = AppointmentStatistics.objects.filter(statistic_date=today).first()
        if existing_stat:
            return APIResponse.validation_error('今日统计已生成')
        
        # 生成统计
        AppointmentStatistics.generate_statistics(today)
        
        return APIResponse.success('今日统计生成成功')
    
    @action(detail=False, methods=['get'])
    def hospital_ranking(self, request):
        """医院预约量排名"""
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        queryset = self.get_queryset()
        
        if from_date:
            queryset = queryset.filter(statistic_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(statistic_date__lte=to_date)
        
        # 按医院分组统计
        hospital_stats = queryset.values('hospital__name').annotate(
            total_appointments=Sum('total_appointments'),
            completed_appointments=Sum('completed_appointments'),
            success_rate=Avg('success_rate')
        ).order_by('-total_appointments')
        
        return APIResponse.success('获取医院统计成功', hospital_stats)
    
    @action(detail=False, methods=['get'])
    def doctor_ranking(self, request):
        """医生预约量排名"""
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        queryset = self.get_queryset()
        
        if from_date:
            queryset = queryset.filter(statistic_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(statistic_date__lte=to_date)
        
        # 按医生分组统计
        doctor_stats = queryset.values('doctor__name', 'department__name').annotate(
            total_appointments=Sum('total_appointments'),
            completed_appointments=Sum('completed_appointments'),
            success_rate=Avg('success_rate')
        ).order_by('-total_appointments')
        
        return APIResponse.success('获取医生统计成功', doctor_stats)


def appointment_dashboard(request):
    """预约管理仪表板"""
    # 这里可以返回预约管理的仪表板数据
    # 实际实现可能需要前端配合
    return APIResponse.success('预约管理仪表板API')
