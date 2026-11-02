// 全局变量
const API_BASE_URL = '/api/v1';

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载天气信息
    loadWeatherInfo();
    
    // 默认显示用户端
    showUserPortal();
}

// 绑定事件监听器
function bindEventListeners() {
    // 用户端/管理端切换
    document.getElementById('userPortalBtn').addEventListener('click', showUserPortal);
    document.getElementById('adminPortalBtn').addEventListener('click', showAdminPortal);
    
    // 返回按钮
    document.getElementById('backBtn').addEventListener('click', function() {
        hideContentArea();
    });
}

// 显示用户端
function showUserPortal() {
    document.getElementById('userPortal').classList.remove('d-none');
    document.getElementById('adminPortal').classList.add('d-none');
    document.getElementById('contentArea').classList.add('d-none');
    
    // 更新按钮状态
    document.getElementById('userPortalBtn').classList.add('btn-light');
    document.getElementById('userPortalBtn').classList.remove('btn-outline-light');
    document.getElementById('adminPortalBtn').classList.remove('btn-light');
    document.getElementById('adminPortalBtn').classList.add('btn-outline-light');
}

// 显示管理端
function showAdminPortal() {
    document.getElementById('userPortal').classList.add('d-none');
    document.getElementById('adminPortal').classList.remove('d-none');
    document.getElementById('contentArea').classList.add('d-none');
    
    // 更新按钮状态
    document.getElementById('adminPortalBtn').classList.add('btn-light');
    document.getElementById('adminPortalBtn').classList.remove('btn-outline-light');
    document.getElementById('userPortalBtn').classList.remove('btn-light');
    document.getElementById('userPortalBtn').classList.add('btn-outline-light');
}

// 显示内容区域
function showContentArea(title, content) {
    document.getElementById('contentTitle').textContent = title;
    document.getElementById('contentBody').innerHTML = content;
    document.getElementById('contentArea').classList.remove('d-none');
    
    // 隐藏门户区域
    document.getElementById('userPortal').classList.add('d-none');
    document.getElementById('adminPortal').classList.add('d-none');
}

// 隐藏内容区域
function hideContentArea() {
    document.getElementById('contentArea').classList.add('d-none');
    
    // 显示当前门户区域
    if (document.getElementById('adminPortalBtn').classList.contains('btn-light')) {
        showAdminPortal();
    } else {
        showUserPortal();
    }
}

// 用户端功能函数
function showHospitals() {
    // 跳转到预约搜索页面
    window.location.href = '/appointment-search/';
}

function showDoctors() {
    // 跳转到预约搜索页面
    window.location.href = '/appointment-search/';
}

function showMyAppointments() {
    // 跳转到预约列表页面
    window.location.href = '/appointment-list/';
}

function showFavorites() {
    // 跳转到预约搜索页面，可以在这里添加收藏筛选
    window.location.href = '/appointment-search/';
}

// 管理端功能函数
function showHospitalManagement() {
    // 跳转到医院管理页面
    window.location.href = '/admin/hospitals/';
}

function showDoctorManagement() {
    // 跳转到医生管理页面
    window.location.href = '/admin/doctors/';
}

function showScheduleManagement() {
    // 跳转到排班管理页面
    window.location.href = '/admin/schedules/';
}

function showAppointmentManagement() {
    // 跳转到预约管理页面
    window.location.href = '/admin/appointments/';
}

// 加载天气信息
function loadWeatherInfo() {
    // 使用浏览器地理位置API获取用户位置
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // 调用天气API
            fetch(`${API_BASE_URL}/weather/?lat=${lat}&lon=${lon}`)
                .then(response => response.json())
                .then(data => {
                    updateWeatherWidget(data);
                })
                .catch(error => {
                    console.error('获取天气信息失败:', error);
                    // 显示默认天气信息
                    updateWeatherWidget({
                        temperature: '25',
                        description: '晴朗',
                        icon: 'sun'
                    });
                });
        }, function(error) {
            console.error('获取地理位置失败:', error);
            // 显示默认天气信息
            updateWeatherWidget({
                temperature: '25',
                description: '晴朗',
                icon: 'sun'
            });
        });
    } else {
        // 浏览器不支持地理位置API
        updateWeatherWidget({
            temperature: '25',
            description: '晴朗',
            icon: 'sun'
        });
    }
}

// 更新天气小部件
function updateWeatherWidget(weatherData) {
    document.getElementById('temperature').textContent = `${weatherData.temperature}°C`;
    document.getElementById('weatherDesc').textContent = weatherData.description;
    
    // 根据天气状况更新图标
    const weatherIcon = document.getElementById('weatherIcon');
    const iconMap = {
        'sun': 'bi-sun',
        'cloud': 'bi-cloud',
        'cloud-sun': 'bi-cloud-sun',
        'rain': 'bi-cloud-rain',
        'snow': 'bi-snow',
        'thunderstorm': 'bi-cloud-lightning-rain'
    };
    
    weatherIcon.className = `bi ${iconMap[weatherData.icon] || 'bi-cloud-sun'}`;
}

// 工具函数
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // 创建toast容器（如果不存在）
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    
    // 添加toast到容器
    toastContainer.appendChild(toast);
    
    // 初始化并显示toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 自动移除toast元素
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

// 格式化时间
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// 格式化日期时间
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}