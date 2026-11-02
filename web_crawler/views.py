from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from .services import WebSearchCrawler, RealTimeHospitalCrawler, DoctorScheduleCrawler


@csrf_exempt
@require_http_methods(["GET", "POST"])
def search_medical_info(request):
    """搜索医疗信息API"""
    crawler = WebSearchCrawler()
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            keywords = data.get("keywords", "")
        except:
            keywords = request.GET.get("keywords", "")
    else:
        keywords = request.GET.get("keywords", "")
    
    if not keywords:
        return JsonResponse({"error": "请输入搜索关键词"}, status=400)
    
    result = crawler.search_medical_info(keywords)
    return JsonResponse(result)


@require_http_methods(["GET"])
def get_hospitals(request):
    """获取医院列表API"""
    crawler = RealTimeHospitalCrawler()
    city = request.GET.get("city", "贵阳")
    
    hospitals = crawler.crawl_hospital_list(city)
    return JsonResponse({
        "city": city,
        "hospitals": hospitals,
        "count": len(hospitals)
    })


@require_http_methods(["GET"])
def get_hospital_departments(request):
    """获取医院科室API"""
    crawler = RealTimeHospitalCrawler()
    hospital_name = request.GET.get("hospital", "")
    
    if not hospital_name:
        return JsonResponse({"error": "请指定医院名称"}, status=400)
    
    departments = crawler.crawl_hospital_departments(hospital_name)
    return JsonResponse({
        "hospital": hospital_name, 
        "departments": departments,
        "count": len(departments)
    })


@require_http_methods(["GET"])
def get_department_doctors(request):
    """获取科室医生API"""
    crawler = RealTimeHospitalCrawler()
    hospital_name = request.GET.get("hospital", "")
    department_name = request.GET.get("department", "")
    
    if not hospital_name or not department_name:
        return JsonResponse({"error": "请指定医院和科室名称"}, status=400)
    
    doctors = crawler.crawl_department_doctors(hospital_name, department_name)
    return JsonResponse({
        "hospital": hospital_name, 
        "department": department_name,
        "doctors": doctors,
        "count": len(doctors)
    })


@require_http_methods(["GET"])
def get_guizhou_hospital_info(request):
    """获取贵州医科大学附属医院完整信息API"""
    crawler = RealTimeHospitalCrawler()
    
    # 获取医院信息
    hospitals = crawler.crawl_hospital_list("贵阳")
    guizhou_hospital = None
    for hospital in hospitals:
        if "贵州医科大学附属医院" in hospital["name"]:
            guizhou_hospital = hospital
            break
    
    if not guizhou_hospital:
        return JsonResponse({"error": "未找到贵州医科大学附属医院信息"}, status=404)
    
    # 获取科室信息
    departments = crawler.crawl_hospital_departments("贵州医科大学附属医院")
    
    # 获取医生信息（以第一个科室为例）
    doctors = []
    if departments:
        first_department = departments[0]["name"]
        doctors = crawler.crawl_department_doctors("贵州医科大学附属医院", first_department)
    
    result = {
        "hospital": guizhou_hospital,
        "departments": departments,
        "sample_doctors": doctors
    }
    
    return JsonResponse(result)


@require_http_methods(["GET"])
def get_doctor_schedules(request):
    """获取医生排班信息API"""
    crawler = DoctorScheduleCrawler()
    
    hospital_name = request.GET.get("hospital", "")
    department_name = request.GET.get("department", "")
    doctor_name = request.GET.get("doctor", "")
    
    if not hospital_name:
        return JsonResponse({"error": "请指定医院名称"}, status=400)
    
    schedules = crawler.crawl_doctor_schedules(hospital_name, department_name, doctor_name)
    
    return JsonResponse({
        "hospital": hospital_name,
        "department": department_name,
        "doctor": doctor_name,
        "schedules": schedules,
        "count": len(schedules)
    })


@require_http_methods(["GET"])
def get_weekly_schedules(request):
    """获取医生一周排班信息API"""
    crawler = DoctorScheduleCrawler()
    
    hospital_name = request.GET.get("hospital", "")
    department_name = request.GET.get("department", "")
    doctor_name = request.GET.get("doctor", "")
    
    if not hospital_name:
        return JsonResponse({"error": "请指定医院名称"}, status=400)
    
    weekly_schedules = crawler.crawl_doctor_weekly_schedules(hospital_name, department_name, doctor_name)
    
    # 按日期分组
    schedules_by_date = {}
    for schedule in weekly_schedules:
        date = schedule["schedule_date"]
        if date not in schedules_by_date:
            schedules_by_date[date] = []
        schedules_by_date[date].append(schedule)
    
    return JsonResponse({
        "hospital": hospital_name,
        "department": department_name,
        "doctor": doctor_name,
        "weekly_schedules": schedules_by_date,
        "total_count": len(weekly_schedules)
    })


@require_http_methods(["GET"])
def get_available_time_slots(request):
    """获取可预约时间段API"""
    crawler = DoctorScheduleCrawler()
    
    hospital_name = request.GET.get("hospital", "")
    department_name = request.GET.get("department", "")
    doctor_name = request.GET.get("doctor", "")
    schedule_date = request.GET.get("date", "")
    
    if not hospital_name or not schedule_date:
        return JsonResponse({"error": "请指定医院名称和日期"}, status=400)
    
    # 获取指定日期的排班信息
    schedules = crawler.crawl_doctor_schedules(hospital_name, department_name, doctor_name)
    
    # 过滤指定日期的排班
    date_schedules = [schedule for schedule in schedules if schedule.get("schedule_date") == schedule_date]
    
    # 提取可用的时间段
    available_time_slots = []
    for schedule in date_schedules:
        for time_slot in schedule.get("time_slots", []):
            if time_slot.get("available", False):
                available_time_slots.append({
                    "doctor_id": schedule["doctor_id"],
                    "doctor_name": schedule["doctor_name"],
                    "title": schedule["title"],
                    "department": schedule["department"],
                    "start_time": time_slot["start_time"],
                    "end_time": time_slot["end_time"],
                    "available_appointments": time_slot["appointment_count"],
                    "fee": schedule["fee"],
                    "location": schedule["location"],
                    "specialty": schedule["specialty"],
                    "rating": schedule["rating"]
                })
    
    return JsonResponse({
        "hospital": hospital_name,
        "department": department_name,
        "doctor": doctor_name,
        "date": schedule_date,
        "available_time_slots": available_time_slots,
        "count": len(available_time_slots)
    })