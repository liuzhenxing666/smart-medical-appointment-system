from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from .models import User
from .serializers import (
    WechatLoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    LocationUpdateSerializer,
    LoginSerializer,
    RefreshTokenSerializer
)
from smart_doctor.api_utils import APIResponse, APIExceptionHandler, RequestValidator
from smart_doctor.cache_utils import cached_api


@api_view(['POST'])
@csrf_exempt  # CSRF豁免
@APIExceptionHandler.handle_exception
@permission_classes([permissions.AllowAny])
def login(request):
    """用户登录接口"""
    
    if request.method != 'POST':
        return APIResponse.method_not_allowed("只支持POST请求")
    
    # 解析请求数据，支持JSON格式
    try:
        # 更灵活的内容类型判断，支持带字符集的application/json
        content_type = request.content_type or ''
        if 'application/json' in content_type:
            import json
            request_data = json.loads(request.body)
        else:
            request_data = request.data
    except Exception as e:
        return APIResponse.bad_request(f"请求数据解析失败: {str(e)}")
    
    # 验证请求数据
    try:
        validated_data = RequestValidator.validate_request_data(LoginSerializer, request_data)
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    serializer = LoginSerializer(data=validated_data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # 生成JWT token
        refresh = RefreshToken.for_user(user)
        
        # 更新用户最后登录时间
        user.last_login = timezone.now()
        user.save()
        
        response_data = {
            'user': UserProfileSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh)
        }
        
        return APIResponse.success(
            data=response_data,
            message="登录成功"
        )
    
    return APIResponse.validation_error(
        message="登录参数验证失败",
        data=serializer.errors
    )


@api_view(['POST'])
@csrf_exempt  # CSRF豁免
@APIExceptionHandler.handle_exception
@permission_classes([permissions.AllowAny])
def wechat_login(request):
    """微信小程序登录接口"""
    from django.conf import settings
    
    if request.method != 'POST':
        return APIResponse.method_not_allowed("只支持POST请求")
    
    # 开发环境临时解决方案：如果微信配置为空，使用测试用户（仅限 DEBUG 模式）
    if settings.DEBUG and (not settings.WECHAT_APP_ID or not settings.WECHAT_APP_SECRET):
        # 创建或获取测试用户
        try:
            user = User.objects.get(username='test_user')
        except User.DoesNotExist:
            user = User.objects.create_user(
                username='test_user',
                phone='13800138000',
                password='test123456'
            )
        
        # 生成JWT token
        refresh = RefreshToken.for_user(user)
        
        # 更新用户最后登录时间
        user.last_login = timezone.now()
        user.save()
        
        response_data = {
            'user': UserProfileSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'created': False
        }
        
        return APIResponse.success(
            data=response_data,
            message="开发环境测试登录成功"
        )
    
    # 验证请求数据
    try:
        validated_data = RequestValidator.validate_request_data(WechatLoginSerializer, request.data)
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    serializer = WechatLoginSerializer(data=validated_data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        openid = serializer.validated_data['openid']
        created = serializer.validated_data['created']
        
        # 生成JWT token
        refresh = RefreshToken.for_user(user)
        
        # 更新用户最后登录时间
        user.last_login = timezone.now()
        user.save()
        
        response_data = {
            'user': UserProfileSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'created': created
        }
        
        return APIResponse.success(
            data=response_data,
            message="登录成功"
        )
    
    return APIResponse.validation_error(
        message="登录参数验证失败",
        data=serializer.errors
    )


@api_view(['POST'])
@csrf_exempt  # CSRF豁免
@APIExceptionHandler.handle_exception
@permission_classes([permissions.AllowAny])
def refresh_token(request):
    """刷新JWT token"""
    
    if request.method != 'POST':
        return APIResponse.method_not_allowed("只支持POST请求")
    
    # 验证请求数据
    try:
        validated_data = RequestValidator.validate_request_data(RefreshTokenSerializer, request.data)
    except ValueError as e:
        return APIResponse.validation_error(str(e))
    
    refresh_token = validated_data['refresh_token']
    
    try:
        refresh = RefreshToken(refresh_token)
        access_token = str(refresh.access_token)
        
        return APIResponse.success(
            data={
                'access_token': access_token,
                'refresh_token': str(refresh)
            },
            message="Token刷新成功"
        )
        
    except Exception as e:
        return APIResponse.bad_request(
            message="无效的refresh_token",
            data={'error': str(e)}
        )


class UserProfileViewSet(ModelViewSet):
    """用户资料管理视图集"""
    
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """只允许用户访问自己的资料"""
        return User.objects.filter(id=self.request.user.id)
    
    def get_object(self):
        """返回当前用户对象"""
        return self.request.user
    
    @action(detail=False, methods=['get'])
    @cached_api(cache_type='user_profile', timeout=300)  # 5分钟缓存，用户资料相对稳定
    def me(self, request):
        """获取当前用户资料"""
        serializer = self.get_serializer(request.user)
        return APIResponse.success(data=serializer.data, message='获取用户资料成功')
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """更新用户资料"""
        serializer = UserUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return APIResponse.success('用户资料更新成功', serializer.data)
        
        return APIResponse.validation_error('用户资料更新参数验证失败', serializer.errors)
    
    @action(detail=False, methods=['post'])
    def update_location(self, request):
        """更新用户位置"""
        serializer = LocationUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            user.latitude = serializer.validated_data['latitude']
            user.longitude = serializer.validated_data['longitude']
            user.location_updated_at = timezone.now()
            user.save()
            
            return APIResponse.success('位置更新成功', {
                'latitude': user.latitude,
                'longitude': user.longitude,
                'updated_at': user.location_updated_at
            })
        
        return APIResponse.validation_error('位置更新参数验证失败', serializer.errors)
    
    @action(detail=False, methods=['get'])
    @cached_api(cache_type='user_statistics', timeout=600)  # 10分钟缓存，统计信息相对稳定
    def statistics(self, request):
        """获取用户统计信息"""
        user = request.user
        
        return APIResponse.success('获取用户统计信息成功', {
            'appointment_count': user.appointment_count,
            'last_appointment_at': user.last_appointment_at,
            'total_appointments': user.appointment_count,
            'success_rate': user.success_rate if hasattr(user, 'success_rate') else 0
        })


@api_view(['GET'])
@csrf_exempt  # CSRF豁免
@APIExceptionHandler.handle_exception
@permission_classes([permissions.AllowAny])
@cached_api(cache_type='auth_check', timeout=300)  # 5分钟缓存，认证状态相对稳定
def check_auth(request):
    """检查用户认证状态"""
    
    if request.method != 'GET':
        return APIResponse.method_not_allowed("只支持GET请求")
    
    user = request.user
    
    # 检查用户是否认证
    if user.is_authenticated:
        return APIResponse.success(
            data={
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': user.phone,
                    'email': user.email
                }
            },
            message="认证状态检查成功"
        )
    else:
        return APIResponse.success(
            data={
                'authenticated': False,
                'user': None
            },
            message="用户未认证"
        )


@api_view(['POST'])
@csrf_exempt  # CSRF豁免
@APIExceptionHandler.handle_exception
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """修改密码接口"""
    
    if request.method != 'POST':
        return APIResponse.method_not_allowed("只支持POST请求")
    
    user = request.user
    
    # 获取请求数据
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    # 验证参数
    if not old_password or not new_password or not confirm_password:
        return APIResponse.validation_error("请提供旧密码、新密码和确认密码")
    
    # 验证新密码和确认密码是否一致
    if new_password != confirm_password:
        return APIResponse.validation_error("新密码和确认密码不一致")
    
    # 验证旧密码是否正确
    if not user.check_password(old_password):
        return APIResponse.validation_error("旧密码不正确")
    
    # 修改密码
    user.set_password(new_password)
    user.save()
    
    return APIResponse.success(message="密码修改成功")
