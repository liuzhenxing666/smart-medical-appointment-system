"""
Web Crawler 配置文件
"""

import os
from decouple import config

# 爬虫配置
CRAWLER_CONFIG = {
    # 请求配置
    'REQUEST_TIMEOUT': config('CRAWLER_REQUEST_TIMEOUT', default=30, cast=int),
    'RETRY_COUNT': config('CRAWLER_RETRY_COUNT', default=3, cast=int),
    'RETRY_DELAY': config('CRAWLER_RETRY_DELAY', default=2, cast=int),
    
    # 并发配置
    'MAX_CONCURRENT_REQUESTS': config('CRAWLER_MAX_CONCURRENT', default=5, cast=int),
    'REQUEST_DELAY': config('CRAWLER_REQUEST_DELAY', default=1.0, cast=float),
    
    # 数据同步配置
    'SYNC_BATCH_SIZE': config('SYNC_BATCH_SIZE', default=100, cast=int),
    'SYNC_TIMEOUT': config('SYNC_TIMEOUT', default=300, cast=int),  # 5分钟
    
    # 数据清理配置
    'CLEANUP_DAYS': config('CLEANUP_DAYS', default=30, cast=int),
    'MAX_RECORDS_PER_HOSPITAL': config('MAX_RECORDS_PER_HOSPITAL', default=1000, cast=int),
}

# 医院数据源配置
HOSPITAL_SOURCES = {
    'default': {
        'base_url': 'https://example-hospital-api.com',  # 替换为实际医院API地址
        'api_key': config('HOSPITAL_API_KEY', default=''),
        'rate_limit': 100,  # 每分钟请求限制
    },
    'guizhou': {
        'base_url': 'https://guizhou-hospital-api.com',  # 贵州医院API
        'api_key': config('GUIZHOU_HOSPITAL_API_KEY', default=''),
        'rate_limit': 50,
    }
}

# 城市配置
SUPPORTED_CITIES = [
    '贵阳',
    '遵义', 
    '六盘水',
    '安顺',
    '毕节',
    '铜仁',
    '黔东南',
    '黔南',
    '黔西南',
]

# 科室分类配置
DEPARTMENT_CATEGORIES = {
    '内科': ['消化内科', '呼吸内科', '心血管内科', '神经内科', '肾内科'],
    '外科': ['普外科', '骨科', '神经外科', '泌尿外科', '胸外科'],
    '妇产科': ['妇科', '产科', '计划生育科'],
    '儿科': ['儿科', '新生儿科', '小儿外科'],
    '五官科': ['眼科', '耳鼻喉科', '口腔科'],
    '皮肤科': ['皮肤科', '性病科'],
    '中医科': ['中医科', '针灸科', '推拿科'],
    '其他': ['急诊科', '麻醉科', '病理科', '检验科'],
}

# 医生职称配置
DOCTOR_TITLES = [
    '主任医师',
    '副主任医师', 
    '主治医师',
    '住院医师',
    '医师',
]

# 排班时间配置
SCHEDULE_TIME_SLOTS = {
    'morning': {'start': '08:00', 'end': '12:00'},
    'afternoon': {'start': '14:00', 'end': '18:00'},
    'evening': {'start': '18:00', 'end': '22:00'},
}

# 错误码配置
ERROR_CODES = {
    # 爬虫相关错误
    'CRAWLER_TIMEOUT': 1001,
    'CRAWLER_NETWORK_ERROR': 1002,
    'CRAWLER_PARSE_ERROR': 1003,
    'CRAWLER_RATE_LIMIT': 1004,
    
    # 数据同步错误
    'SYNC_VALIDATION_ERROR': 2001,
    'SYNC_DATABASE_ERROR': 2002,
    'SYNC_DUPLICATE_ERROR': 2003,
    
    # 业务逻辑错误
    'HOSPITAL_NOT_FOUND': 3001,
    'DEPARTMENT_NOT_FOUND': 3002,
    'DOCTOR_NOT_FOUND': 3003,
    'SCHEDULE_NOT_FOUND': 3004,
}

# 日志配置
LOG_CONFIG = {
    'level': config('LOG_LEVEL', default='INFO'),
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': config('LOG_FILE', default='logs/web_crawler.log'),
    'max_size': config('LOG_MAX_SIZE', default=10485760, cast=int),  # 10MB
    'backup_count': config('LOG_BACKUP_COUNT', default=5, cast=int),
}

# 监控配置
MONITORING_CONFIG = {
    'enabled': config('MONITORING_ENABLED', default=True, cast=bool),
    'metrics_port': config('METRICS_PORT', default=9090, cast=int),
    'health_check_interval': config('HEALTH_CHECK_INTERVAL', default=60, cast=int),  # 秒
}

# 缓存配置
CACHE_CONFIG = {
    'default_ttl': config('CACHE_DEFAULT_TTL', default=3600, cast=int),  # 1小时
    'hospital_list_ttl': config('HOSPITAL_LIST_TTL', default=86400, cast=int),  # 24小时
    'schedule_ttl': config('SCHEDULE_TTL', default=1800, cast=int),  # 30分钟
}

def get_hospital_source(city):
    """根据城市获取医院数据源配置"""
    if city in ['贵阳', '遵义']:
        return HOSPITAL_SOURCES['guizhou']
    return HOSPITAL_SOURCES['default']

def validate_city(city):
    """验证城市是否支持"""
    return city in SUPPORTED_CITIES

def get_department_category(department_name):
    """根据科室名称获取分类"""
    for category, departments in DEPARTMENT_CATEGORIES.items():
        if department_name in departments:
            return category
    return '其他'