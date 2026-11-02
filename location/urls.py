from django.urls import path
from . import views
from . import tencent_views
from . import amap_views

urlpatterns = [
    # 地图API（已切换为腾讯地图）
    path('geocode/', views.geocode_address, name='geocode'),
    path('reverse-geocode/', views.reverse_geocode, name='reverse_geocode'),
    path('distance/', views.calculate_distance, name='distance'),
    path('search-poi/', views.search_poi, name='search_poi'),
    path('route-planning/', views.get_route_planning, name='route_planning'),
    path('weather/', views.get_weather, name='weather'),
    
    # 腾讯地图API
    path('tencent/geocode/', tencent_views.tencent_geocode_address, name='tencent_geocode'),
    path('tencent/reverse-geocode/', tencent_views.tencent_reverse_geocode, name='tencent_reverse_geocode'),
    path('tencent/distance/', tencent_views.tencent_calculate_distance, name='tencent_distance'),
    path('tencent/search-poi/', tencent_views.tencent_search_poi, name='tencent_search_poi'),
    path('tencent/route-planning/', tencent_views.tencent_route_planning, name='tencent_route_planning'),
    path('tencent/weather/', tencent_views.tencent_weather, name='tencent_weather'),
    
    # 高德地图API
    path('amap/geocode/', amap_views.amap_geocode_address, name='amap_geocode'),
    path('amap/reverse-geocode/', amap_views.amap_reverse_geocode, name='amap_reverse_geocode'),
    path('amap/distance/', amap_views.amap_calculate_distance, name='amap_distance'),
    path('amap/search-poi/', amap_views.amap_search_poi, name='amap_search_poi'),
    path('amap/route-planning/', amap_views.amap_route_planning, name='amap_route_planning'),
    path('amap/weather/', amap_views.amap_weather, name='amap_weather'),
]