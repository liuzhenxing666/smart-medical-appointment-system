from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User
import requests


class WechatLoginSerializer(serializers.Serializer):
    """微信登录序列化器"""
    code = serializers.CharField(required=True, max_length=200)
    
    def validate(self, attrs):
        code = attrs.get('code')
        
        # 调用微信API获取openid和session_key
        wechat_response = self.get_wechat_session(code)
        
        if 'errcode' in wechat_response:
            raise serializers.ValidationError(f"微信登录失败: {wechat_response.get('errmsg', '未知错误')}")
        
        openid = wechat_response.get('openid')
        session_key = wechat_response.get('session_key')
        unionid = wechat_response.get('unionid')
        
        if not openid:
            raise serializers.ValidationError("微信登录失败: 未获取到openid")
        
        # 查找或创建用户
        user, created = self.get_or_create_user(openid, unionid, session_key)
        
        attrs['user'] = user
        attrs['openid'] = openid
        attrs['session_key'] = session_key
        attrs['created'] = created
        
        return attrs
    
    def get_wechat_session(self, code):
        """调用微信API获取session信息"""
        from django.conf import settings
        
        url = "https://api.weixin.qq.com/sns/jscode2session"
        params = {
            'appid': settings.WECHAT_APP_ID,
            'secret': settings.WECHAT_APP_SECRET,
            'js_code': code,
            'grant_type': 'authorization_code'
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            return response.json()
        except requests.RequestException as e:
            raise serializers.ValidationError(f"微信API调用失败: {str(e)}")
    
    def get_or_create_user(self, openid, unionid, session_key):
        """根据微信openid获取或创建用户"""
        try:
            # 首先尝试通过openid查找用户
            user = User.objects.get(wechat_openid=openid)
            created = False
        except User.DoesNotExist:
            # 如果openid不存在，尝试通过unionid查找
            if unionid:
                try:
                    user = User.objects.get(wechat_unionid=unionid)
                    # 更新openid
                    user.wechat_openid = openid
                    user.save()
                    created = False
                except User.DoesNotExist:
                    # 创建新用户
                    username = f"wechat_user_{openid[-8:]}"
                    user = User.objects.create_user(
                        username=username,
                        wechat_openid=openid,
                        wechat_unionid=unionid
                    )
                    created = True
            else:
                # 创建新用户
                username = f"wechat_user_{openid[-8:]}"
                user = User.objects.create_user(
                    username=username,
                    wechat_openid=openid
                )
                created = True
        
        return user, created


class UserProfileSerializer(serializers.ModelSerializer):
    """用户资料序列化器"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'phone', 'avatar', 'latitude', 'longitude',
            'preferred_hospital_type', 'appointment_count',
            'last_appointment_at', 'date_joined', 'name', 'age', 'gender'
        ]
        read_only_fields = ['id', 'date_joined', 'appointment_count', 'last_appointment_at']


class UserUpdateSerializer(serializers.ModelSerializer):
    """用户信息更新序列化器"""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'avatar',
            'latitude', 'longitude', 'preferred_hospital_type', 
            'name', 'age', 'gender'
        ]


class LocationUpdateSerializer(serializers.Serializer):
    """位置更新序列化器"""
    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)


class LoginSerializer(serializers.Serializer):
    """普通登录序列化器（支持用户名或手机号 + 密码）"""
    username = serializers.CharField(required=False, max_length=150)
    phone = serializers.CharField(required=False, max_length=20)
    password = serializers.CharField(required=True, max_length=128)
    code = serializers.CharField(required=False, max_length=6)

    def validate(self, attrs):
        username = attrs.get('username')
        phone = attrs.get('phone')
        password = attrs.get('password')
        code = attrs.get('code')

        # 项目未接入短信服务，验证码登录无法校验真伪，禁止使用（防止任意登录）
        if code:
            raise serializers.ValidationError("短信验证码登录暂未开通，请使用密码登录")

        if not username and not phone:
            raise serializers.ValidationError("请提供用户名或手机号")

        # 查找用户：优先用户名，其次手机号
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise serializers.ValidationError("用户不存在，请先注册")
        else:
            if not phone or not phone.isdigit() or len(phone) < 11 or len(phone) > 20:
                raise serializers.ValidationError("请输入正确的手机号")
            try:
                user = User.objects.get(phone=phone)
            except User.DoesNotExist:
                raise serializers.ValidationError("用户不存在，请先注册")

        # 密码登录验证
        if not user.check_password(password):
            raise serializers.ValidationError("密码错误")

        attrs['user'] = user
        return attrs


class RefreshTokenSerializer(serializers.Serializer):
    """刷新token序列化器"""
    refresh_token = serializers.CharField(required=True, max_length=500)