// 用户端首页JavaScript

// 全局变量
let featuredHospitals = null;
let featuredDoctors = null;
let departments = null;
let userAppointments = null;
let userFavorites = null;
let isLoading = false;

// DOM元素
const featuredHospitalsContainer = document.getElementById('featured-hospitals-container');
const featuredDoctorsContainer = document.getElementById('featured-doctors-container');
const departmentsContainer = document.getElementById('departments-container');
const recentAppointmentsContainer = document.getElementById('recent-appointments-container');
const recentFavoritesContainer = document.getElementById('recent-favorites-container');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const quickBookingBtn = document.getElementById('quick-booking-btn');
const userInfoContainer = document.getElementById('user-info-container');

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initPage();
});

// 初始化页面
async function initPage() {
    showLoading(true);
    
    try {
        // 并行加载首页数据
        await Promise.all([
            loadFeaturedHospitals(),
            loadFeaturedDoctors(),
            loadDepartments(),
            checkUserStatus()
        ]);
        
        // 渲染推荐医院
        renderFeaturedHospitals();
        
        // 渲染推荐医生
        renderFeaturedDoctors();
        
        // 渲染科室导航
        renderDepartments();
        
        // 如果用户已登录，加载用户相关数据
        const token = localStorage.getItem('token');
        if (token) {
            await Promise.all([
                loadUserAppointments(),
                loadUserFavorites()
            ]);
            
            // 渲染用户信息
            renderUserInfo();
            
            // 渲染最近预约
            renderRecentAppointments();
            
            // 渲染最近收藏
            renderRecentFavorites();
        }
        
        // 初始化事件监听器
        initEventListeners();
        
        showLoading(false);
    } catch (error) {
        console.error('页面初始化失败:', error);
        showError('加载首页失败，请刷新页面重试');
        showLoading(false);
    }
}

// 加载推荐医院
async function loadFeaturedHospitals() {
    try {
        const response = await fetch(`${API_BASE_URL}/hospitals/?featured=true&page_size=8`);
        if (!response.ok) {
            throw new Error('获取推荐医院失败');
        }
        
        const data = await response.json();
        featuredHospitals = data.results || [];
    } catch (error) {
        console.error('加载推荐医院失败:', error);
        throw error;
    }
}

// 加载推荐医生
async function loadFeaturedDoctors() {
    try {
        const response = await fetch(`${API_BASE_URL}/doctors/?featured=true&page_size=8`);
        if (!response.ok) {
            throw new Error('获取推荐医生失败');
        }
        
        const data = await response.json();
        featuredDoctors = data.results || [];
    } catch (error) {
        console.error('加载推荐医生失败:', error);
        throw error;
    }
}

// 加载科室列表
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}/departments/?page_size=12`);
        if (!response.ok) {
            throw new Error('获取科室列表失败');
        }
        
        const data = await response.json();
        departments = data.results || [];
    } catch (error) {
        console.error('加载科室列表失败:', error);
        throw error;
    }
}

// 检查用户状态
async function checkUserStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/user/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Token可能已过期，清除本地存储
            localStorage.removeItem('token');
            return;
        }
        
        return await response.json();
    } catch (error) {
        console.error('检查用户状态失败:', error);
        // 发生错误时也清除token，以防万一
        localStorage.removeItem('token');
    }
}

// 加载用户预约
async function loadUserAppointments() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/appointments/?page_size=3`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取用户预约失败');
        }
        
        const data = await response.json();
        userAppointments = data.results || [];
    } catch (error) {
        console.error('加载用户预约失败:', error);
        throw error;
    }
}

// 加载用户收藏
async function loadUserFavorites() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/favorites/?page_size=3`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取用户收藏失败');
        }
        
        const data = await response.json();
        userFavorites = data.results || [];
    } catch (error) {
        console.error('加载用户收藏失败:', error);
        throw error;
    }
}

// 渲染推荐医院
function renderFeaturedHospitals() {
    if (!featuredHospitalsContainer) return;
    
    if (!featuredHospitals || featuredHospitals.length === 0) {
        featuredHospitalsContainer.innerHTML = `
            <div class="no-results">
                <p>暂无推荐医院</p>
            </div>
        `;
        return;
    }
    
    const hospitalsHtml = `
        <div class="section-header">
            <h2>推荐医院</h2>
            <a href="/appointment-search/" class="view-all">查看全部</a>
        </div>
        <div class="hospitals-grid">
            ${featuredHospitals.map(hospital => `
                <div class="hospital-card" data-hospital-id="${hospital.id}">
                    <div class="hospital-image">
                        <img src="${hospital.image || '/static/images/default-hospital.png'}" alt="${hospital.name}">
                    </div>
                    <div class="hospital-info">
                        <h3 class="hospital-name">${hospital.name}</h3>
                        <div class="hospital-level">${hospital.level || '未知等级'}</div>
                        <div class="hospital-rating">
                            <div class="stars">
                                ${generateStars(hospital.average_rating || 0)}
                            </div>
                            <span class="rating-score">${hospital.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div class="hospital-address">${hospital.address || '暂无地址'}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    featuredHospitalsContainer.innerHTML = hospitalsHtml;
    
    // 添加医院卡片点击事件
    const hospitalCards = featuredHospitalsContainer.querySelectorAll('.hospital-card');
    hospitalCards.forEach(card => {
        card.addEventListener('click', function() {
            const hospitalId = this.dataset.hospitalId;
            window.location.href = `/appointment-search/?hospital=${hospitalId}`;
        });
    });
}

// 渲染推荐医生
function renderFeaturedDoctors() {
    if (!featuredDoctorsContainer) return;
    
    if (!featuredDoctors || featuredDoctors.length === 0) {
        featuredDoctorsContainer.innerHTML = `
            <div class="no-results">
                <p>暂无推荐医生</p>
            </div>
        `;
        return;
    }
    
    const doctorsHtml = `
        <div class="section-header">
            <h2>推荐医生</h2>
            <a href="/appointment-search/" class="view-all">查看全部</a>
        </div>
        <div class="doctors-grid">
            ${featuredDoctors.map(doctor => `
                <div class="doctor-card" data-doctor-id="${doctor.id}">
                    <div class="doctor-avatar">
                        <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
                    </div>
                    <div class="doctor-info">
                        <h3 class="doctor-name">${doctor.name}</h3>
                        <div class="doctor-title">${doctor.title || '医生'}</div>
                        <div class="doctor-hospital">${doctor.hospital_name || '未知医院'}</div>
                        <div class="doctor-department">${doctor.department_name || '未知科室'}</div>
                        <div class="doctor-rating">
                            <div class="stars">
                                ${generateStars(doctor.average_rating || 0)}
                            </div>
                            <span class="rating-score">${doctor.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    featuredDoctorsContainer.innerHTML = doctorsHtml;
    
    // 添加医生卡片点击事件
    const doctorCards = featuredDoctorsContainer.querySelectorAll('.doctor-card');
    doctorCards.forEach(card => {
        card.addEventListener('click', function() {
            const doctorId = this.dataset.doctorId;
            window.location.href = `/appointment-search/?doctor=${doctorId}`;
        });
    });
}

// 渲染科室导航
function renderDepartments() {
    if (!departmentsContainer) return;
    
    if (!departments || departments.length === 0) {
        departmentsContainer.innerHTML = `
            <div class="no-results">
                <p>暂无科室信息</p>
            </div>
        `;
        return;
    }
    
    const departmentsHtml = `
        <div class="section-header">
            <h2>科室导航</h2>
            <a href="/appointment-search/" class="view-all">查看全部</a>
        </div>
        <div class="departments-grid">
            ${departments.map(dept => `
                <div class="department-card" data-department-id="${dept.id}">
                    <div class="department-icon">
                        ${getDepartmentIcon(dept.name)}
                    </div>
                    <div class="department-name">${dept.name}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    departmentsContainer.innerHTML = departmentsHtml;
    
    // 添加科室卡片点击事件
    const departmentCards = departmentsContainer.querySelectorAll('.department-card');
    departmentCards.forEach(card => {
        card.addEventListener('click', function() {
            const departmentId = this.dataset.departmentId;
            const departmentName = this.querySelector('.department-name').textContent;
            
            // 跳转到预约搜索页面，并带上科室筛选参数
            window.location.href = `/appointment-search/?department=${departmentId}&name=${encodeURIComponent(departmentName)}`;
        });
    });
}

// 渲染用户信息
function renderUserInfo() {
    if (!userInfoContainer) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        userInfoContainer.innerHTML = `
            <div class="login-prompt">
                <p>登录后可查看您的预约和收藏</p>
                <a href="/login/" class="login-btn">立即登录</a>
            </div>
        `;
        return;
    }
    
    // 这里应该从本地存储或API获取用户信息
    // 为了简化，我们使用一个模拟的用户信息
    const userInfo = {
        name: '用户',
        avatar: '/static/images/default-avatar.png'
    };
    
    userInfoContainer.innerHTML = `
        <div class="user-welcome">
            <div class="user-avatar">
                <img src="${userInfo.avatar}" alt="${userInfo.name}">
            </div>
            <div class="user-greeting">
                <p>欢迎回来，${userInfo.name}</p>
                <div class="user-actions">
                    <a href="/profile/">个人中心</a>
                    <a href="/appointment-list/">我的预约</a>
                    <a href="/my-favorites/">我的收藏</a>
                </div>
            </div>
        </div>
    `;
}

// 渲染最近预约
function renderRecentAppointments() {
    if (!recentAppointmentsContainer) return;
    
    if (!userAppointments || userAppointments.length === 0) {
        recentAppointmentsContainer.innerHTML = `
            <div class="no-results">
                <p>暂无预约记录</p>
            </div>
        `;
        return;
    }
    
    const appointmentsHtml = `
        <div class="section-header">
            <h3>最近预约</h3>
            <a href="/appointment-list/" class="view-all">查看全部</a>
        </div>
        <div class="appointments-list">
            ${userAppointments.map(appointment => `
                <div class="appointment-item" data-appointment-id="${appointment.id}">
                    <div class="appointment-doctor">
                        <div class="doctor-avatar">
                            <img src="${appointment.doctor_avatar || '/static/images/default-doctor.png'}" alt="${appointment.doctor_name}">
                        </div>
                        <div class="doctor-info">
                            <h4>${appointment.doctor_name}</h4>
                            <p>${appointment.department_name || '未知科室'}</p>
                        </div>
                    </div>
                    <div class="appointment-time">
                        <div class="date">${formatDate(appointment.appointment_date)}</div>
                        <div class="time">${appointment.time_slot || '未知时段'}</div>
                    </div>
                    <div class="appointment-status">
                        <span class="status ${appointment.status}">${getStatusText(appointment.status)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    recentAppointmentsContainer.innerHTML = appointmentsHtml;
    
    // 添加预约项点击事件
    const appointmentItems = recentAppointmentsContainer.querySelectorAll('.appointment-item');
    appointmentItems.forEach(item => {
        item.addEventListener('click', function() {
            const appointmentId = this.dataset.appointmentId;
            window.location.href = `/appointment-detail/?id=${appointmentId}`;
        });
    });
}

// 渲染最近收藏
function renderRecentFavorites() {
    if (!recentFavoritesContainer) return;
    
    if (!userFavorites || userFavorites.length === 0) {
        recentFavoritesContainer.innerHTML = `
            <div class="no-results">
                <p>暂无收藏记录</p>
            </div>
        `;
        return;
    }
    
    const favoritesHtml = `
        <div class="section-header">
            <h3>最近收藏</h3>
            <a href="/my-favorites/" class="view-all">查看全部</a>
        </div>
        <div class="favorites-list">
            ${userFavorites.map(favorite => {
                if (favorite.hospital) {
                    return `
                        <div class="favorite-item hospital" data-hospital-id="${favorite.hospital.id}">
                            <div class="favorite-image">
                                <img src="${favorite.hospital.image || '/static/images/default-hospital.png'}" alt="${favorite.hospital.name}">
                            </div>
                            <div class="favorite-info">
                                <h4>${favorite.hospital.name}</h4>
                                <p>${favorite.hospital.level || '未知等级'}</p>
                            </div>
                        </div>
                    `;
                } else if (favorite.doctor) {
                    return `
                        <div class="favorite-item doctor" data-doctor-id="${favorite.doctor.id}">
                            <div class="favorite-avatar">
                                <img src="${favorite.doctor.avatar || '/static/images/default-doctor.png'}" alt="${favorite.doctor.name}">
                            </div>
                            <div class="favorite-info">
                                <h4>${favorite.doctor.name}</h4>
                                <p>${favorite.doctor.title || '医生'}</p>
                            </div>
                        </div>
                    `;
                }
                return '';
            }).join('')}
        </div>
    `;
    
    recentFavoritesContainer.innerHTML = favoritesHtml;
    
    // 添加收藏项点击事件
    const favoriteItems = recentFavoritesContainer.querySelectorAll('.favorite-item');
    favoriteItems.forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('hospital')) {
                const hospitalId = this.dataset.hospitalId;
                window.location.href = `/appointment-search/?hospital=${hospitalId}`;
            } else if (this.classList.contains('doctor')) {
                const doctorId = this.dataset.doctorId;
                window.location.href = `/appointment-search/?doctor=${doctorId}`;
            }
        });
    });
}

// 初始化事件监听器
function initEventListeners() {
    // 搜索功能
    if (searchInput && searchBtn) {
        // 搜索按钮点击事件
        searchBtn.addEventListener('click', performSearch);
        
        // 搜索框回车事件
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // 快速预约按钮
    if (quickBookingBtn) {
        quickBookingBtn.addEventListener('click', function() {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('请先登录', 'warning');
                window.location.href = '/login/';
                return;
            }
            
            window.location.href = '/appointment-booking/';
        });
    }
}

// 执行搜索
function performSearch() {
    if (!searchInput) return;
    
    const searchQuery = searchInput.value.trim();
    if (!searchQuery) {
        showToast('请输入搜索关键词', 'warning');
        return;
    }
    
    // 跳转到搜索结果页面
    window.location.href = `/appointment-search/?q=${encodeURIComponent(searchQuery)}`;
}

// 工具函数
function generateStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="star full">★</i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="star half">☆</i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="star empty">☆</i>';
    }
    
    return stars;
}

function getDepartmentIcon(departmentName) {
    // 根据科室名称返回对应的图标
    const iconMap = {
        '内科': '🫀',
        '外科': '🔪',
        '儿科': '👶',
        '妇科': '👩',
        '产科': '🤱',
        '眼科': '👁️',
        '耳鼻喉科': '👂',
        '口腔科': '🦷',
        '皮肤科': '🧴',
        '中医科': '🌿',
        '骨科': '🦴',
        '神经科': '🧠',
        '心血管科': '❤️',
        '消化科': '🍽️',
        '呼吸科': '🫁',
        '泌尿科': '💧',
        '内分泌科': '🧬',
        '肿瘤科': '🎗️',
        '急诊科': '🚑',
        '麻醉科': '💉',
        '影像科': '📷',
        '检验科': '🔬'
    };
    
    // 查找匹配的科室名称
    for (const [key, icon] of Object.entries(iconMap)) {
        if (departmentName.includes(key)) {
            return icon;
        }
    }
    
    // 默认图标
    return '🏥';
}

function formatDate(dateString) {
    if (!dateString) return '未知日期';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待确认',
        'confirmed': '已确认',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    
    return statusMap[status] || status;
}

function showLoading(show) {
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    } else {
        showToast(message, 'error');
    }
}

function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}