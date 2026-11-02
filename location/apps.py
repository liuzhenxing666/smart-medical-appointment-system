from django.apps import AppConfig


class LocationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'location'
    
    def ready(self):
        """
        应用启动时初始化高德地图客户端
        """
        # 导入高德地图客户端，确保在应用启动时初始化
        from .amap_client import amap_client
