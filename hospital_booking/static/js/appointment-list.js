// 预约列表页面JavaScript

// 全局变量
let currentPage = 1;
let pageSize = 10;
let currentTab = 'upcoming'; // upcoming 或 history
let appointmentsData = {
    upcoming: [],
    history: []
};
let filters = {
    hospital: '',
    department: '',
    status: '',
    search: ''
};

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAppointmentListPage();
});

// 初始化预约列表页面
function initializeAppointmentListPage() {
    // 检查用户登录状态
    checkUserLoginStatus();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载筛选选项数据
    loadFilterOptions();
    
    // 加载预约数据
    loadAppointments();
}

// 检查用户登录状态
function checkUserLoginStatus() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        // 未登录，跳转到登录页
        showToast('请先登录', 'warning');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 1500);
        return false;
    }
    return true;
}

// 初始化事件监听器
function initEventListeners() {
    // 标签页切换事件
    document.getElementById('upcoming-tab').addEventListener('shown.bs.tab', function() {
        currentTab = 'upcoming';
        currentPage = 1;
        loadAppointments();
    });
    
    document.getElementById('history-tab').addEventListener('shown.bs.tab', function() {
        currentTab = 'history';
        currentPage = 1;
        loadAppointments();
    });
    
    // 筛选条件变化事件
    document.getElementById('hospitalFilter').addEventListener('change', function() {
        filters.hospital = this.value;
        currentPage = 1;
        loadAppointments();
    });
    
    document.getElementById('departmentFilter').addEventListener('change', function() {
        filters.department = this.value;
        currentPage = 1;
        loadAppointments();
    });
    
    document.getElementById('statusFilter').addEventListener('change', function() {
        filters.status = this.value;
        currentPage = 1;
        loadAppointments();
    });
    
    // 搜索框输入事件（防抖）
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filters.search = this.value;
            currentPage = 1;
            loadAppointments();
        }, 500);
    });
}

// 加载筛选选项数据
async function loadFilterOptions() {
    try {
        // 加载医院列表
        const hospitalsResponse = await fetch(`${API_BASE_URL}/hospitals/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (hospitalsResponse.ok) {
            const hospitalsData = await hospitalsResponse.json();
            const hospitalSelect = document.getElementById('hospitalFilter');
            
            hospitalsData.results.forEach(hospital => {
                const option = document.createElement('option');
                option.value = hospital.id;
                option.textContent = hospital.name;
                hospitalSelect.appendChild(option);
            });
        }
        
        // 加载科室列表
        const departmentsResponse = await fetch(`${API_BASE_URL}/departments/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (departmentsResponse.ok) {
            const departmentsData = await departmentsResponse.json();
            const departmentSelect = document.getElementById('departmentFilter');
            
            departmentsData.results.forEach(department => {
                const option = document.createElement('option');
                option.value = department.id;
                option.textContent = department.name;
                departmentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载筛选选项失败:', error);
    }
}

// 加载预约数据
async function loadAppointments() {
    showLoading(currentTab);
    
    try {
        // 构建查询参数
        const queryParams = new URLSearchParams({
            page: currentPage,
            page_size: pageSize,
            ordering: '-appointment_date'
        });
        
        // 添加筛选条件
        if (filters.hospital) queryParams.append('hospital', filters.hospital);
        if (filters.department) queryParams.append('department', filters.department);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.search) queryParams.append('search', filters.search);
        
        // 根据当前标签页添加状态筛选
        if (currentTab === 'upcoming') {
            queryParams.append('status__in', 'pending,confirmed');
        } else {
            queryParams.append('status__in', 'completed,cancelled');
        }
        
        const response = await fetch(`${API_BASE_URL}/appointments/?${queryParams}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            appointmentsData[currentTab] = data.results;
            
            // 渲染预约列表
            renderAppointments();
            
            // 渲染分页
            renderPagination(data.count, data.next, data.previous);
        } else {
            throw new Error('获取预约列表失败');
        }
    } catch (error) {
        console.error('加载预约列表失败:', error);
        showError(currentTab, '加载预约列表失败，请稍后重试');
    }
}

// 渲染预约列表
function renderAppointments() {
    const container = document.getElementById(`${currentTab}AppointmentsContainer`);
    
    if (appointmentsData[currentTab].length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-calendar-x"></i>
                <h3>暂无${currentTab === 'upcoming' ? '即将就诊' : '历史'}预约</h3>
                <p>${currentTab === 'upcoming' ? '您还没有即将就诊的预约' : '您还没有历史预约记录'}</p>
                <a href="/appointment-search/" class="btn btn-primary">
                    <i class="bi bi-plus-circle"></i> 立即预约
                </a>
            </div>
        `;
        return;
    }
    
    const appointmentsHtml = appointmentsData[currentTab].map(appointment => {
        const statusBadge = getStatusBadge(appointment.status);
        const appointmentDate = formatDate(appointment.appointment_date);
        const timeSlot = appointment.time_slot || '未指定';
        
        return `
            <div class="appointment-card">
                <div class="appointment-header">
                    <div>
                        <span class="status-badge ${statusBadge.class}">${statusBadge.text}</span>
                        <span class="ms-2 text-muted">预约号: ${appointment.id}</span>
                    </div>
                    <div class="action-buttons">
                        ${getActionButtons(appointment)}
                    </div>
                </div>
                <div class="appointment-body">
                    <div class="doctor-info">
                        <div class="doctor-avatar">
                            <img src="${appointment.doctor.avatar || '/static/images/default-doctor.png'}" alt="${appointment.doctor.name}">
                        </div>
                        <div class="doctor-details">
                            <div class="doctor-name">${appointment.doctor.name}</div>
                            <div class="hospital-info">${appointment.doctor.hospital_name}</div>
                            <div class="department-info">${appointment.doctor.department_name}</div>
                        </div>
                    </div>
                    <div class="appointment-info">
                        <div class="info-item">
                            <i class="bi bi-calendar3"></i>
                            <span>${appointmentDate}</span>
                        </div>
                        <div class="info-item">
                            <i class="bi bi-clock"></i>
                            <span>${timeSlot}</span>
                        </div>
                        <div class="info-item">
                            <i class="bi bi-person"></i>
                            <span>${appointment.patient_name}</span>
                        </div>
                        <div class="info-item">
                            <i class="bi bi-telephone"></i>
                            <span>${appointment.patient_phone}</span>
                        </div>
                    </div>
                    ${appointment.description ? `
                        <div class="mt-2">
                            <small class="text-muted">病情描述: ${appointment.description}</small>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = appointmentsHtml;
}

// 获取状态徽章
function getStatusBadge(status) {
    const statusMap = {
        'pending': { class: 'status-pending', text: '待确认' },
        'confirmed': { class: 'status-confirmed', text: '已确认' },
        'completed': { class: 'status-completed', text: '已完成' },
        'cancelled': { class: 'status-cancelled', text: '已取消' }
    };
    
    return statusMap[status] || { class: '', text: status };
}

// 获取操作按钮
function getActionButtons(appointment) {
    let buttons = '';
    
    // 查看详情按钮
    buttons += `<a href="/appointment-detail/?id=${appointment.id}" class="btn btn-sm btn-outline-primary">查看详情</a>`;
    
    // 根据状态添加不同操作
    if (appointment.status === 'pending') {
        buttons += `<button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment(${appointment.id})">取消预约</button>`;
    } else if (appointment.status === 'confirmed') {
        buttons += `<button class="btn btn-sm btn-outline-success" onclick="confirmAppointment(${appointment.id})">确认就诊</button>`;
        buttons += `<button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment(${appointment.id})">取消预约</button>`;
    } else if (appointment.status === 'completed') {
        buttons += `<button class="btn btn-sm btn-outline-secondary" onclick="leaveFeedback(${appointment.id})">评价</button>`;
    }
    
    return buttons;
}

// 渲染分页
function renderPagination(count, next, previous) {
    const totalPages = Math.ceil(count / pageSize);
    const paginationContainer = document.getElementById('appointmentsPagination');
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHtml = '';
    
    // 上一页
    paginationHtml += `
        <li class="page-item ${!previous ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="上一页">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        // 只显示当前页附近的页码
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }
    
    // 下一页
    paginationHtml += `
        <li class="page-item ${!next ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="下一页">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    paginationContainer.innerHTML = paginationHtml;
}

// 切换页面
function changePage(page) {
    if (page < 1) return;
    
    currentPage = page;
    loadAppointments();
    
    // 滚动到顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 取消预约
async function cancelAppointment(appointmentId) {
    if (!confirm('确定要取消这个预约吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('预约已取消', 'success');
            // 重新加载预约列表
            loadAppointments();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || '取消预约失败');
        }
    } catch (error) {
        console.error('取消预约失败:', error);
        showToast(error.message || '取消预约失败，请稍后重试', 'error');
    }
}

// 确认就诊
async function confirmAppointment(appointmentId) {
    if (!confirm('确定已就诊吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/complete/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('就诊状态已更新', 'success');
            // 重新加载预约列表
            loadAppointments();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || '更新就诊状态失败');
        }
    } catch (error) {
        console.error('更新就诊状态失败:', error);
        showToast(error.message || '更新就诊状态失败，请稍后重试', 'error');
    }
}

// 留下评价
function leaveFeedback(appointmentId) {
    // 跳转到预约详情页，并自动打开评价表单
    window.location.href = `/appointments/detail/${appointmentId}/?feedback=true`;
}

// 显示加载状态
function showLoading(tab) {
    const container = document.getElementById(`${tab}AppointmentsContainer`);
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
        </div>
    `;
}

// 显示错误信息
function showError(tab, message) {
    const container = document.getElementById(`${tab}AppointmentsContainer`);
    container.innerHTML = `
        <div class="error-message">
            <i class="bi bi-exclamation-triangle"></i>
            <h3>加载失败</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadAppointments()">重试</button>
        </div>
    `;
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 触发显示
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    
    return `${year}-${month}-${day} ${weekDay}`;
}