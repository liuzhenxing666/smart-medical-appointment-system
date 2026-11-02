"""
Django settings for smart_doctor project.

智能医生预约挂号系统 - 后端配置
"""

from pathlib import Path
import os
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# 环境配置
DEBUG = config('DEBUG', default=True, cast=bool)
SECRET_KEY = config('SECRET_KEY', default='django-insecure-development-key')

# 允许的主机
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,testserver', cast=lambda v: [s.strip() for s in v.split(',')])


# Application definition

INSTALLED_APPS = [
    # Django核心应用
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # 第三方应用
    'rest_framework',
    'corsheaders',
    'django_filters',
    'django_extensions',
    # 'django_celery_beat',  # 暂时注释掉，解决Python路径问题
    # 'django_celery_results',
    
    # 自定义应用
    'users',
    'hospitals',
    'doctors',
    'appointments',
    'location',
    'recommendation',
    'web_crawler',
    'miniprogram',
    'favorites',
    'reviews',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # 自定义中间件（放在clickjacking之前，确保异常响应能被正确处理）
    'smart_doctor.middleware.ExceptionHandlingMiddleware',
    'smart_doctor.monitoring_middleware.APIMonitoringMiddleware',  # API监控中间件
    'smart_doctor.middleware.RequestLoggingMiddleware',
    'smart_doctor.middleware.ValidationErrorMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'smart_doctor.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'smart_doctor.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

# 数据库配置（开发环境使用SQLite，生产环境使用PostgreSQL）
if DEBUG:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'OPTIONS': {
                'timeout': 20,  # SQLite连接超时时间
            }
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='smart_doctor'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': config('DB_CONN_MAX_AGE', default=600, cast=int),  # 连接池配置
            'OPTIONS': {
                'connect_timeout': 10,  # 连接超时时间
                'application_name': 'smart_doctor',
            },
            'TEST': {
                'NAME': 'test_smart_doctor',  # 测试数据库名称
            }
        }
    }
    
    # PostgreSQL性能优化配置
    DATABASES['default']['OPTIONS'].update({
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5,
    })


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'zh-hans'

TIME_ZONE = 'Asia/Shanghai'

USE_I18N = True

USE_TZ = True

# REST Framework配置
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# CORS配置（微信小程序支持）
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://servicewechat.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

# 允许所有本地开发端口（开发环境）
CORS_ALLOW_ALL_ORIGINS = DEBUG

CORS_ALLOW_CREDENTIALS = True

# CSRF配置（微信小程序豁免）
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://servicewechat.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

# 为小程序API添加CSRF豁免
CSRF_COOKIE_HTTPONLY = False  # 允许JavaScript访问CSRF token
CSRF_USE_SESSIONS = False  # 使用cookie而不是session存储CSRF token

# Celery配置
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='django-db')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='django-db')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Shanghai'
CELERY_ENABLE_UTC = False

# 定时任务配置
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # 每天凌晨2点同步医院数据
    'sync-hospital-data-daily': {
        'task': 'web_crawler.tasks.sync_hospital_data_task',
        'schedule': crontab(hour=2, minute=0),  # 每天2:00
        'args': ('贵阳', None),  # 同步贵阳所有医院
    },
    
    # 每小时同步医生排班数据
    'sync-doctor-schedules-hourly': {
        'task': 'web_crawler.tasks.sync_doctor_schedules_task',
        'schedule': crontab(minute=0),  # 每小时
        'args': (None,),  # 同步所有医院排班
    },
    
    # 每周日凌晨3点清理过期数据
    'cleanup-old-data-weekly': {
        'task': 'web_crawler.tasks.cleanup_old_data_task',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # 周日3:00
        'args': (30,),  # 清理30天前的数据
    },
}


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'hospital_booking' / 'static',
    BASE_DIR / 'web-frontend' / 'css',
    BASE_DIR / 'static',  # 添加项目根目录下的static目录
]
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# 媒体文件配置
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# 缓存配置
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# 微信小程序配置
WECHAT_APP_ID = config('WECHAT_APP_ID', default='')
WECHAT_APP_SECRET = config('WECHAT_APP_SECRET', default='')

# 腾讯地图配置
TENCENT_MAP_API_KEY = config('TENCENT_MAP_API_KEY', default='')

# 高德地图配置
AMAP_API_KEY = config('AMAP_API_KEY', default='')
AMAP_API_URL = config('AMAP_API_URL', default='https://restapi.amap.com')

# 自定义用户模型配置
AUTH_USER_MODEL = 'users.User'

# 登录/登出页面配置
# 注意：必须用显式路径。如果用路由名 'login'，会反解到 users API 的
# name='login'（/api/users/auth/login/ 等接口），导致网页登录被重定向到API
LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = '/profile/'
LOGOUT_REDIRECT_URL = '/'

# JWT配置
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(days=7),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=30),
}

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# X-Frame-Options设置，允许同源iframe嵌入
X_FRAME_OPTIONS = 'SAMEORIGIN'
