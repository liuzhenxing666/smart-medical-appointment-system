"""
智能医生预约挂号系统 - 视图模块
"""
from django.http import JsonResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

def home(request):
    """首页视图"""
    return render(request, 'home.html')

def hospital_list(request):
    """医院列表视图"""
    return render(request, 'hospital_list.html')

def hospital_detail(request, pk):
    """医院详情视图"""
    return render(request, 'hospital_detail.html')

def doctor_detail(request, pk):
    """医生详情视图"""
    return render(request, 'doctor_detail.html')

def doctor_list(request):
    """医生列表视图"""
    return render(request, 'doctor_list.html')

def appointment_list(request):
    """预约列表视图"""
    return render(request, 'appointment_list.html')

def appointment_detail(request, pk):
    """预约详情视图"""
    return render(request, 'appointment_detail.html')

def appointment_search(request):
    """预约搜索视图"""
    return render(request, 'appointment-search.html')

def appointment_booking(request):
    """预约预订视图"""
    return render(request, 'appointment.html')

@login_required
def profile(request):
    """个人中心视图"""
    return render(request, 'profile.html')