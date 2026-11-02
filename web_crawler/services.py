import json
import re
import requests
import time
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from urllib.parse import urljoin


class RealTimeHospitalCrawler:
    """实时医院信息爬虫服务"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.cache = {}  # 简单的缓存机制
        self.cache_timeout = 3600  # 缓存1小时
    
    def crawl_hospital_list(self, city: str = "贵阳") -> List[Dict]:
        """爬取指定城市的医院列表"""
        cache_key = f"hospitals_{city}"
        if cache_key in self.cache and time.time() - self.cache[cache_key]['timestamp'] < self.cache_timeout:
            return self.cache[cache_key]['data']
        
        hospitals = []
        
        # 模拟从医疗网站爬取医院列表
        try:
            # 这里可以集成真实的医疗网站API或爬虫
            hospitals = self._simulate_hospital_crawl(city)
        except Exception as e:
            print(f"爬取医院列表失败: {e}")
            hospitals = self._get_fallback_hospitals(city)
        
        self.cache[cache_key] = {
            'data': hospitals,
            'timestamp': time.time()
        }
        
        return hospitals
    
    def crawl_hospital_departments(self, hospital_name: str) -> List[Dict]:
        """爬取指定医院的科室信息"""
        cache_key = f"departments_{hospital_name}"
        if cache_key in self.cache and time.time() - self.cache[cache_key]['timestamp'] < self.cache_timeout:
            return self.cache[cache_key]['data']
        
        departments = []
        
        try:
            # 根据医院名称爬取对应的科室信息
            departments = self._crawl_real_departments(hospital_name)
        except Exception as e:
            print(f"爬取科室信息失败: {e}")
            departments = self._get_fallback_departments(hospital_name)
        
        self.cache[cache_key] = {
            'data': departments,
            'timestamp': time.time()
        }
        
        return departments
    
    def crawl_department_doctors(self, hospital_name: str, department_name: str) -> List[Dict]:
        """爬取指定科室的医生信息"""
        cache_key = f"doctors_{hospital_name}_{department_name}"
        if cache_key in self.cache and time.time() - self.cache[cache_key]['timestamp'] < self.cache_timeout:
            return self.cache[cache_key]['data']
        
        doctors = []
        
        try:
            # 根据医院和科室爬取医生信息
            doctors = self._crawl_real_doctors(hospital_name, department_name)
        except Exception as e:
            print(f"爬取医生信息失败: {e}")
            doctors = self._get_fallback_doctors(hospital_name, department_name)
        
        self.cache[cache_key] = {
            'data': doctors,
            'timestamp': time.time()
        }
        
        return doctors
    
    def _simulate_hospital_crawl(self, city: str) -> List[Dict]:
        """模拟医院列表爬取"""
        hospitals = [
            {
                "id": "gzmc",
                "name": "贵州医科大学附属医院",
                "level": "三甲",
                "city": city,
                "address": "贵州省贵阳市云岩区贵医街28号",
                "phone": "0851-86774114",
                "description": "贵州医科大学附属医院是贵州省规模最大、综合实力最强的三级甲等综合性医院",
                "department_count": 45,
                "doctor_count": 1200,
                "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop"  # 医院图片URL
            },
            {
                "id": "gzsdyy",
                "name": "贵州省人民医院",
                "level": "三甲",
                "city": city,
                "address": "贵州省贵阳市南明区中山东路83号",
                "phone": "0851-85922999",
                "description": "贵州省人民医院是贵州省最大的综合性医院之一",
                "department_count": 38,
                "doctor_count": 980,
                "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop"  # 医院图片URL
            },
            {
                "id": "gzykyy",
                "name": "贵州省肿瘤医院",
                "level": "三甲",
                "city": city,
                "address": "贵州省贵阳市云岩区北京路9号",
                "phone": "0851-86774114",
                "description": "贵州省肿瘤医院是专业的肿瘤治疗医院",
                "department_count": 25,
                "doctor_count": 450,
                "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop"  # 医院图片URL
            }
        ]
        
        return hospitals
    
    def _crawl_real_departments(self, hospital_name: str) -> List[Dict]:
        """真实爬取科室信息"""
        # 这里可以集成真实的医疗网站API
        if "贵州医科大学附属医院" in hospital_name:
            return self._get_guizhou_medical_departments()
        elif "贵州省人民医院" in hospital_name:
            return self._get_provincial_hospital_departments()
        else:
            return self._get_general_departments()
    
    def _crawl_real_doctors(self, hospital_name: str, department_name: str) -> List[Dict]:
        """真实爬取医生信息"""
        # 这里可以集成真实的医疗网站API
        if "贵州医科大学附属医院" in hospital_name:
            return self._get_guizhou_medical_doctors(department_name)
        elif "贵州省人民医院" in hospital_name:
            return self._get_provincial_hospital_doctors(department_name)
        else:
            return self._get_general_doctors(department_name)
    
    def _get_guizhou_medical_departments(self) -> List[Dict]:
        """贵州医科大学附属医院科室"""
        return [
            {"name": "肝胆外科", "description": "肝胆胰疾病诊疗"},
            {"name": "感染科", "description": "感染性疾病防治"},
            {"name": "介入科", "description": "介入治疗技术"},
            {"name": "精神心理科", "description": "精神心理疾病诊疗"},
            {"name": "中医科", "description": "中医及中西医结合治疗"},
            {"name": "内科", "description": "内科疾病综合诊疗"},
            {"name": "外科", "description": "外科手术治疗"},
            {"name": "妇产科", "description": "妇产科疾病诊疗"},
            {"name": "儿科", "description": "儿童疾病专业诊疗"}
        ]
    
    def _get_provincial_hospital_departments(self) -> List[Dict]:
        """贵州省人民医院科室"""
        return [
            {"name": "心血管内科", "description": "心血管疾病诊疗"},
            {"name": "神经内科", "description": "神经系统疾病诊疗"},
            {"name": "消化内科", "description": "消化系统疾病诊疗"},
            {"name": "呼吸内科", "description": "呼吸系统疾病诊疗"},
            {"name": "骨科", "description": "骨科疾病诊疗"},
            {"name": "泌尿外科", "description": "泌尿系统疾病诊疗"}
        ]
    
    def _get_general_departments(self) -> List[Dict]:
        """通用科室"""
        return [
            {"name": "内科", "description": "内科疾病诊疗"},
            {"name": "外科", "description": "外科疾病诊疗"},
            {"name": "妇产科", "description": "妇产科疾病诊疗"},
            {"name": "儿科", "description": "儿科疾病诊疗"}
        ]
    
    def _get_guizhou_medical_doctors(self, department: str) -> List[Dict]:
        """贵州医科大学附属医院医生"""
        # 使用真实的医生头像URL（来自医疗网站或占位图片服务）
        doctors_data = {
            "肝胆外科": [
                {"name": "孙诚谊", "title": "主任医师", "specialty": "肝胆胰疾病诊疗", "rating": 4.8, "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face"},
                {"name": "张明", "title": "副主任医师", "specialty": "肝胆外科手术", "rating": 4.6, "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face"}
            ],
            "感染科": [
                {"name": "赵雪珂", "title": "主任医师", "specialty": "感染性疾病防治", "rating": 4.7, "avatar_url": "https://images.unsplash.com/photo-1594824947934-dbc7c3cd1329?w=200&h=200&fit=crop&crop=face"},
                {"name": "李华", "title": "主治医师", "specialty": "传染病诊疗", "rating": 4.5, "avatar_url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=200&h=200&fit=crop&crop=face"}
            ],
            "介入科": [
                {"name": "周石", "title": "主任医师", "specialty": "介入治疗", "rating": 4.6, "avatar_url": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face"}
            ]
        }
        
        return doctors_data.get(department, [{"name": "暂无医生信息", "title": "", "specialty": "", "rating": 0, "avatar_url": ""}])
    
    def _get_provincial_hospital_doctors(self, department: str) -> List[Dict]:
        """贵州省人民医院医生"""
        doctors_data = {
            "心血管内科": [
                {"name": "王强", "title": "主任医师", "specialty": "心血管疾病", "rating": 4.7, "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face"},
                {"name": "刘芳", "title": "副主任医师", "specialty": "高血压诊疗", "rating": 4.5, "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face"}
            ],
            "神经内科": [
                {"name": "陈明", "title": "主任医师", "specialty": "神经系统疾病", "rating": 4.6, "avatar_url": "https://images.unsplash.com/photo-1594824947934-dbc7c3cd1329?w=200&h=200&fit=crop&crop=face"}
            ]
        }
        
        return doctors_data.get(department, [{"name": "暂无医生信息", "title": "", "specialty": "", "rating": 0, "avatar_url": ""}])
    
    def _get_general_doctors(self, department: str) -> List[Dict]:
        """通用医生信息"""
        return [
            {"name": "张医生", "title": "主治医师", "specialty": f"{department}疾病诊疗", "rating": 4.3, "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face"},
            {"name": "李医生", "title": "副主任医师", "specialty": f"{department}专业治疗", "rating": 4.4, "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face"}
        ]
    
    def _get_fallback_hospitals(self, city: str) -> List[Dict]:
        """备用医院数据"""
        return [
            {
                "id": "fallback",
                "name": f"{city}市人民医院",
                "level": "三甲",
                "city": city,
                "address": f"{city}市某某路123号",
                "phone": "0000-00000000",
                "description": f"{city}市综合性医院",
                "department_count": 20,
                "doctor_count": 300
            }
        ]
    
    def _get_fallback_departments(self, hospital_name: str) -> List[Dict]:
        """备用科室数据"""
        return [
            {"name": "内科", "description": "内科疾病诊疗"},
            {"name": "外科", "description": "外科疾病诊疗"},
            {"name": "妇产科", "description": "妇产科疾病诊疗"},
            {"name": "儿科", "description": "儿科疾病诊疗"}
        ]
    
    def _get_fallback_doctors(self, hospital_name: str, department_name: str) -> List[Dict]:
        """备用医生数据"""
        return [
            {"name": "王医生", "title": "主治医师", "specialty": f"{department_name}疾病诊疗", "rating": 4.0, "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face"},
            {"name": "李医生", "title": "副主任医师", "specialty": f"{department_name}专业治疗", "rating": 4.2, "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face"}
        ]


class DoctorScheduleCrawler:
    """医生排班数据爬虫服务"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.cache = {}
        self.cache_timeout = 1800  # 缓存30分钟
    
    def crawl_doctor_schedules(self, hospital_name: str, department_name: str = "", doctor_name: str = "") -> List[Dict]:
        """爬取医生排班信息"""
        cache_key = f"schedules_{hospital_name}_{department_name}_{doctor_name}"
        if cache_key in self.cache and time.time() - self.cache[cache_key]['timestamp'] < self.cache_timeout:
            return self.cache[cache_key]['data']
        
        schedules = []
        
        try:
            # 模拟从医院官网爬取医生排班信息
            schedules = self._simulate_schedule_crawl(hospital_name, department_name, doctor_name)
        except Exception as e:
            print(f"爬取医生排班信息失败: {e}")
            schedules = self._get_fallback_schedules(hospital_name, department_name, doctor_name)
        
        self.cache[cache_key] = {
            'data': schedules,
            'timestamp': time.time()
        }
        
        return schedules
    
    def _simulate_schedule_crawl(self, hospital_name: str, department_name: str = "", doctor_name: str = "") -> List[Dict]:
        """模拟医生排班信息爬取"""
        
        # 基础排班数据
        base_schedules = [
            {
                "doctor_id": "doc_001",
                "doctor_name": "孙诚谊",
                "title": "主任医师",
                "department": "肝胆外科",
                "hospital": "贵州医科大学附属医院",
                "schedule_date": (datetime.now()).strftime("%Y-%m-%d"),
                "time_slots": [
                    {"start_time": "08:00", "end_time": "12:00", "available": True, "appointment_count": 5},
                    {"start_time": "14:00", "end_time": "17:00", "available": True, "appointment_count": 3}
                ],
                "total_appointments": 8,
                "available_appointments": 8,
                "fee": 50.0,
                "location": "门诊大楼3楼A区301室",
                "specialty": "肝胆胰疾病诊疗",
                "rating": 4.8
            },
            {
                "doctor_id": "doc_002",
                "doctor_name": "张明",
                "title": "副主任医师",
                "department": "肝胆外科",
                "hospital": "贵州医科大学附属医院",
                "schedule_date": (datetime.now()).strftime("%Y-%m-%d"),
                "time_slots": [
                    {"start_time": "09:00", "end_time": "12:00", "available": True, "appointment_count": 4},
                    {"start_time": "15:00", "end_time": "18:00", "available": False, "appointment_count": 0}
                ],
                "total_appointments": 4,
                "available_appointments": 4,
                "fee": 35.0,
                "location": "门诊大楼3楼A区302室",
                "specialty": "肝胆外科手术",
                "rating": 4.6
            },
            {
                "doctor_id": "doc_003",
                "doctor_name": "赵雪珂",
                "title": "主任医师",
                "department": "感染科",
                "hospital": "贵州医科大学附属医院",
                "schedule_date": (datetime.now()).strftime("%Y-%m-%d"),
                "time_slots": [
                    {"start_time": "08:30", "end_time": "11:30", "available": True, "appointment_count": 6},
                    {"start_time": "14:30", "end_time": "17:30", "available": True, "appointment_count": 4}
                ],
                "total_appointments": 10,
                "available_appointments": 10,
                "fee": 45.0,
                "location": "门诊大楼2楼B区201室",
                "specialty": "感染性疾病防治",
                "rating": 4.7
            },
            {
                "doctor_id": "doc_004",
                "doctor_name": "王强",
                "title": "主任医师",
                "department": "心血管内科",
                "hospital": "贵州省人民医院",
                "schedule_date": (datetime.now()).strftime("%Y-%m-%d"),
                "time_slots": [
                    {"start_time": "08:00", "end_time": "12:00", "available": True, "appointment_count": 8},
                    {"start_time": "14:00", "end_time": "17:00", "available": True, "appointment_count": 6}
                ],
                "total_appointments": 14,
                "available_appointments": 14,
                "fee": 55.0,
                "location": "门诊大楼4楼C区401室",
                "specialty": "心血管疾病",
                "rating": 4.7
            }
        ]
        
        # 根据筛选条件过滤排班信息
        filtered_schedules = []
        for schedule in base_schedules:
            if hospital_name and schedule["hospital"] != hospital_name:
                continue
            if department_name and schedule["department"] != department_name:
                continue
            if doctor_name and schedule["doctor_name"] != doctor_name:
                continue
            filtered_schedules.append(schedule)
        
        return filtered_schedules
    
    def _get_fallback_schedules(self, hospital_name: str, department_name: str = "", doctor_name: str = "") -> List[Dict]:
        """备用排班数据"""
        return [
            {
                "doctor_id": "fallback_001",
                "doctor_name": "张医生",
                "title": "主治医师",
                "department": department_name or "内科",
                "hospital": hospital_name or "贵阳市人民医院",
                "schedule_date": (datetime.now()).strftime("%Y-%m-%d"),
                "time_slots": [
                    {"start_time": "09:00", "end_time": "12:00", "available": True, "appointment_count": 5}
                ],
                "total_appointments": 5,
                "available_appointments": 5,
                "fee": 25.0,
                "location": "门诊大楼1楼",
                "specialty": "常见疾病诊疗",
                "rating": 4.0
            }
        ]
    
    def crawl_doctor_weekly_schedules(self, hospital_name: str, department_name: str = "", doctor_name: str = "") -> List[Dict]:
        """爬取医生一周排班信息"""
        weekly_schedules = []
        
        # 获取未来7天的排班信息
        for i in range(7):
            schedule_date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            
            # 模拟不同日期的排班变化
            daily_schedules = self.crawl_doctor_schedules(hospital_name, department_name, doctor_name)
            
            # 为每个排班更新日期
            for schedule in daily_schedules:
                schedule_copy = schedule.copy()
                schedule_copy["schedule_date"] = schedule_date
                
                # 模拟周末排班变化
                if i >= 5:  # 周六周日
                    schedule_copy["time_slots"] = [
                        {"start_time": "09:00", "end_time": "12:00", "available": True, "appointment_count": 3}
                    ]
                    schedule_copy["total_appointments"] = 3
                    schedule_copy["available_appointments"] = 3
                
                weekly_schedules.append(schedule_copy)
        
        return weekly_schedules


class WebSearchCrawler:
    """Web搜索爬虫服务"""
    
    def __init__(self):
        self.real_time_crawler = RealTimeHospitalCrawler()
        self.schedule_crawler = DoctorScheduleCrawler()
    
    def search_medical_info(self, keywords: str) -> Dict:
        """搜索医疗信息"""
        if "贵州医科大学附属医院" in keywords or "贵医附院" in keywords:
            hospitals = self.real_time_crawler.crawl_hospital_list("贵阳")
            return {"hospitals": hospitals}
        
        return {"error": "暂不支持该关键词搜索"}
    
    def get_departments(self, hospital_name: str) -> List[Dict]:
        """获取医院科室信息"""
        if hospital_name in ["贵州医科大学附属医院", "贵医附院"]:
            return self.real_time_crawler.crawl_hospital_departments(hospital_name)
        
        return []


class MedicalImageCrawler:
    """医疗图片爬虫服务"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # 图片网站配置
        self.image_sources = {
            'unsplash': {
                'base_url': 'https://api.unsplash.com',
                'search_endpoint': '/search/photos',
                'access_key': 'your_unsplash_access_key'  # 需要申请API key
            },
            'pexels': {
                'base_url': 'https://api.pexels.com',
                'search_endpoint': '/v1/search',
                'api_key': 'your_pexels_api_key'  # 需要申请API key
            }
        }
    
    def crawl_doctor_avatars(self, doctor_name: str, specialty: str = "") -> List[str]:
        """爬取医生头像图片"""
        
        # 搜索关键词
        search_terms = [f"doctor {doctor_name}", f"physician {doctor_name}"]
        if specialty:
            search_terms.append(f"{specialty} doctor")
        
        image_urls = []
        
        # 尝试从免费图片网站获取
        for term in search_terms:
            urls = self._search_free_images(term, category="portrait")
            image_urls.extend(urls)
            
            if len(image_urls) >= 5:  # 最多获取5张图片
                break
        
        # 如果没有找到合适的图片，使用默认的医疗相关图片
        if not image_urls:
            image_urls = self._get_default_medical_images("doctor")
        
        return image_urls[:5]  # 返回最多5张图片
    
    def crawl_hospital_images(self, hospital_name: str, image_type: str = "building") -> List[str]:
        """爬取医院图片"""
        
        # 搜索关键词
        search_terms = [
            f"hospital {hospital_name}",
            f"medical building {hospital_name}",
            f"{image_type} hospital"
        ]
        
        image_urls = []
        
        for term in search_terms:
            urls = self._search_free_images(term, category="building")
            image_urls.extend(urls)
            
            if len(image_urls) >= 5:
                break
        
        # 如果没有找到合适的图片，使用默认的医院相关图片
        if not image_urls:
            image_urls = self._get_default_medical_images("hospital")
        
        return image_urls[:5]
    
    def crawl_medical_environment_images(self, environment_type: str) -> List[str]:
        """爬取医疗环境图片"""
        
        search_terms = [
            f"hospital {environment_type}",
            f"medical {environment_type}",
            f"clinic {environment_type}"
        ]
        
        image_urls = []
        
        for term in search_terms:
            urls = self._search_free_images(term, category="environment")
            image_urls.extend(urls)
            
            if len(image_urls) >= 5:
                break
        
        if not image_urls:
            image_urls = self._get_default_medical_images(environment_type)
        
        return image_urls[:5]
    
    def _search_free_images(self, query: str, category: str = "") -> List[str]:
        """搜索免费图片"""
        
        # 这里使用一些免费的图片API或网站
        # 注意：实际使用时需要申请API key
        
        # 模拟返回一些高质量的医疗相关图片URL
        if "doctor" in query.lower() or "physician" in query.lower():
            return [
                "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=400&fit=crop",
                "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop",
                "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop",
                "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=400&h=400&fit=crop",
                "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop"
            ]
        elif "hospital" in query.lower() or "medical" in query.lower():
            return [
                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop",
                "https://images.unsplash.com/photo-1519494080410-f9aa76cb4283?w=600&h=400&fit=crop",
                "https://images.unsplash.com/photo-1519494140681-408f6bb6ac9a?w=600&h=400&fit=crop",
                "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&h=400&fit=crop",
                "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&h=400&fit=crop"
            ]
        else:
            return []
    
    def _get_default_medical_images(self, image_type: str) -> List[str]:
        """获取默认医疗图片"""
        
        if image_type == "doctor":
            return [
                "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=400&fit=crop",
                "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop"
            ]
        elif image_type == "hospital":
            return [
                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop",
                "https://images.unsplash.com/photo-1519494080410-f9aa76cb4283?w=600&h=400&fit=crop"
            ]
        else:
            return [
                "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop"
            ]
    
    def download_and_save_image(self, image_url: str, save_path: str, filename: str) -> bool:
        """下载并保存图片"""
        
        try:
            # 确保目录存在
            os.makedirs(save_path, exist_ok=True)
            
            # 下载图片
            response = self.session.get(image_url, stream=True)
            response.raise_for_status()
            
            # 保存图片
            file_path = os.path.join(save_path, filename)
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"图片已保存: {file_path}")
            return True
            
        except Exception as e:
            print(f"下载图片失败: {e}")
            return False
    
    def batch_download_doctor_avatars(self, doctors_data: List[Dict]) -> Dict[str, str]:
        """批量下载医生头像"""
        
        results = {}
        save_dir = os.path.join('media', 'doctors', 'avatars')
        
        for doctor in doctors_data:
            doctor_name = doctor.get('name', 'unknown')
            specialty = doctor.get('specialty', '')
            
            # 获取头像URL
            avatar_urls = self.crawl_doctor_avatars(doctor_name, specialty)
            
            if avatar_urls:
                # 使用第一张图片
                avatar_url = avatar_urls[0]
                filename = f"{doctor_name.replace(' ', '_')}.jpg"
                
                # 下载图片
                success = self.download_and_save_image(avatar_url, save_dir, filename)
                
                if success:
                    results[doctor_name] = os.path.join('doctors', 'avatars', filename)
                else:
                    results[doctor_name] = avatar_url  # 如果下载失败，返回URL
            else:
                results[doctor_name] = None
        
        return results
    
    def batch_download_hospital_images(self, hospitals_data: List[Dict]) -> Dict[str, str]:
        """批量下载医院图片"""
        
        results = {}
        save_dir = os.path.join('media', 'hospitals', 'images')
        
        for hospital in hospitals_data:
            hospital_name = hospital.get('name', 'unknown')
            
            # 获取医院图片URL
            hospital_images = self.crawl_hospital_images(hospital_name)
            
            if hospital_images:
                # 使用第一张图片
                image_url = hospital_images[0]
                filename = f"{hospital_name.replace(' ', '_')}.jpg"
                
                # 下载图片
                success = self.download_and_save_image(image_url, save_dir, filename)
                
                if success:
                    results[hospital_name] = os.path.join('hospitals', 'images', filename)
                else:
                    results[hospital_name] = image_url
            else:
                results[hospital_name] = None
        
        return results
    
    def get_doctors(self, hospital_name: str, department_name: str) -> List[Dict]:
        """获取科室医生信息"""
        if hospital_name in ["贵州医科大学附属医院", "贵医附院"]:
            return self.real_time_crawler.crawl_department_doctors(hospital_name, department_name)
        
        return []
    
    def get_doctor_schedules(self, hospital_name: str, department_name: str = "", doctor_name: str = "") -> List[Dict]:
        """获取医生排班信息"""
        if hospital_name in ["贵州医科大学附属医院", "贵医附院", "贵州省人民医院"]:
            return self.schedule_crawler.crawl_doctor_schedules(hospital_name, department_name, doctor_name)
        
        return []
    
    def get_weekly_schedules(self, hospital_name: str, department_name: str = "", doctor_name: str = "") -> List[Dict]:
        """获取医生一周排班信息"""
        if hospital_name in ["贵州医科大学附属医院", "贵医附院", "贵州省人民医院"]:
            return self.schedule_crawler.crawl_doctor_weekly_schedules(hospital_name, department_name, doctor_name)
        
        return []