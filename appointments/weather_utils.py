"""
预约日天气查询工具模块
提供预约日天气查询、天气提醒和出行建议功能
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings

# 导入腾讯地图API客户端
from location.tencent_map_client import tencent_map_client

logger = logging.getLogger(__name__)


class AppointmentWeatherService:
    """预约日天气服务类"""
    
    def __init__(self):
        self.tencent_map_client = tencent_map_client
    
    def get_appointment_weather(self, appointment):
        """
        获取预约日的天气信息
        
        Args:
            appointment: Appointment对象
            
        Returns:
            dict: 天气信息，包含实时天气和预报天气
        """
        try:
            # 获取医院所在城市
            hospital_city = self._get_hospital_city(appointment.hospital)
            
            if not hospital_city:
                return {
                    'success': False,
                    'error': '无法获取医院所在城市信息',
                    'weather_data': None
                }
            
            # 获取实时天气
            current_weather = self._get_current_weather(hospital_city)
            
            # 获取预约日天气预报
            forecast_weather = self._get_forecast_weather(hospital_city, appointment.appointment_date)
            
            # 生成出行建议
            travel_advice = self._generate_travel_advice(current_weather, forecast_weather)
            
            return {
                'success': True,
                'hospital_city': hospital_city,
                'appointment_date': appointment.appointment_date.isoformat(),
                'current_weather': current_weather,
                'forecast_weather': forecast_weather,
                'travel_advice': travel_advice
            }
            
        except Exception as e:
            logger.error(f"获取预约日天气信息失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'weather_data': None
            }
    
    def _get_hospital_city(self, hospital):
        """获取医院所在城市"""
        # 从医院地址中提取城市信息
        # 这里可以根据实际的数据结构进行调整
        if hospital.address:
            # 假设地址格式为"北京市东城区帅府园1号"
            # 提取城市部分
            address_parts = hospital.address.split('市')
            if len(address_parts) > 1:
                return address_parts[0] + '市'
        
        # 如果无法从地址提取，返回默认城市
        return '北京'
    
    def _get_current_weather(self, city):
        """获取实时天气"""
        try:
            result = self.tencent_map_client.get_weather(city=city)
            
            if result.get('status') == '1' and result.get('lives'):
                weather_data = result['lives'][0]
                return {
                    'city': weather_data.get('city', ''),
                    'weather': weather_data.get('weather', ''),
                    'temperature': weather_data.get('temperature', ''),
                    'wind_direction': weather_data.get('winddirection', ''),
                    'wind_power': weather_data.get('windpower', ''),
                    'humidity': weather_data.get('humidity', ''),
                    'report_time': weather_data.get('reporttime', '')
                }
            else:
                raise Exception(f"天气查询失败: {result.get('info', '未知错误')}")
                
        except Exception as e:
            logger.error(f"获取实时天气失败: {str(e)}")
            return None
    
    def _get_forecast_weather(self, city, target_date):
        """
        获取天气预报
        
        Args:
            city: 城市名称
            target_date: 目标日期
            
        Returns:
            dict: 天气预报信息
        """
        try:
            # 腾讯地图API目前只提供实时天气，这里模拟预报数据
            # 实际项目中可以集成其他天气预报API
            
            # 计算与目标日期的天数差
            today = timezone.now().date()
            days_diff = (target_date - today).days
            
            if days_diff < 0:
                return {
                    'available': False,
                    'reason': '目标日期已过去',
                    'forecast': None
                }
            elif days_diff > 7:
                return {
                    'available': False,
                    'reason': '仅支持7天内天气预报',
                    'forecast': None
                }
            else:
                # 模拟天气预报数据
                # 实际项目中应该调用天气预报API
                return {
                    'available': True,
                    'days_ahead': days_diff,
                    'forecast': self._simulate_forecast(city, target_date)
                }
                
        except Exception as e:
            logger.error(f"获取天气预报失败: {str(e)}")
            return {
                'available': False,
                'reason': str(e),
                'forecast': None
            }
    
    def _simulate_forecast(self, city, target_date):
        """模拟天气预报数据"""
        # 这里模拟天气预报，实际项目中应该调用真实的天气预报API
        weather_types = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '雪']
        temperatures = range(15, 35)  # 温度范围
        
        import random
        return {
            'date': target_date.isoformat(),
            'weather': random.choice(weather_types),
            'temperature_high': random.choice(temperatures),
            'temperature_low': random.choice(temperatures) - 5,
            'wind_direction': '东南风',
            'wind_power': '3-4级',
            'humidity': f"{random.randint(40, 90)}%"
        }
    
    def _generate_travel_advice(self, current_weather, forecast_weather):
        """生成出行建议"""
        if not forecast_weather.get('available') or not forecast_weather.get('forecast'):
            return {
                'level': 'info',
                'message': '天气预报信息暂不可用，请关注实时天气情况',
                'suggestions': ['建议提前查看当天天气预报', '准备雨具以防万一']
            }
        
        forecast = forecast_weather['forecast']
        weather = forecast.get('weather', '')
        
        advice = {
            'level': 'normal',
            'message': '天气适宜出行',
            'suggestions': []
        }
        
        # 根据天气情况生成建议
        if '雨' in weather:
            advice['level'] = 'warning'
            advice['message'] = '有降雨，请注意出行安全'
            advice['suggestions'].extend([
                '请携带雨具',
                '建议提前出发，预留充足时间',
                '注意路面湿滑，小心驾驶'
            ])
        elif '雪' in weather:
            advice['level'] = 'warning'
            advice['message'] = '有降雪，请注意出行安全'
            advice['suggestions'].extend([
                '请注意保暖',
                '建议选择公共交通出行',
                '路面可能结冰，小心慢行'
            ])
        elif '高温' in weather or int(forecast.get('temperature_high', 0)) > 35:
            advice['level'] = 'warning'
            advice['message'] = '高温天气，请注意防暑'
            advice['suggestions'].extend([
                '请做好防晒措施',
                '携带饮用水',
                '避免长时间户外活动'
            ])
        elif '低温' in weather or int(forecast.get('temperature_low', 0)) < 0:
            advice['level'] = 'warning'
            advice['message'] = '低温天气，请注意保暖'
            advice['suggestions'].extend([
                '请穿着保暖衣物',
                '注意防寒保暖',
                '预防感冒'
            ])
        else:
            advice['suggestions'].extend([
                '天气适宜，祝您就诊顺利',
                '建议按时到达医院'
            ])
        
        return advice
    
    def batch_get_appointments_weather(self, appointments):
        """
        批量获取多个预约的天气信息
        
        Args:
            appointments: Appointment对象列表
            
        Returns:
            list: 每个预约的天气信息列表
        """
        results = []
        
        for appointment in appointments:
            weather_info = self.get_appointment_weather(appointment)
            results.append({
                'appointment_id': str(appointment.id),
                'appointment_number': appointment.appointment_number,
                'appointment_date': appointment.appointment_date.isoformat(),
                'hospital_name': appointment.hospital.name,
                'weather_info': weather_info
            })
        
        return results


# 创建全局天气服务实例
weather_service = AppointmentWeatherService()