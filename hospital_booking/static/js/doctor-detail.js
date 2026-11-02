// 用户端医生详情页面JavaScript

// 全局变量
let doctor = null;
let hospital = null;
let department = null;
let schedules = [];
let reviews = [];
let doctorId = null;
let selectedDate = null;
let selectedTimeSlot = null;
let isFavorite = false;

// DOM元素
const doctorContainer = document.getElementById('doctor-container');
const scheduleContainer = document.getElementById('schedule-container');
const reviewsContainer = document.getElementById('reviews-container');
const appointmentModal = document.getElementById('appointment-modal');
const favoriteBtn = document.getElementById('favorite-btn');
const bookAppointmentBtn = document.getElementById('book-appointment-btn');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从URL获取医生ID
    const urlParams = new URLSearchParams(window.location.search);
    doctorId = urlParams.get('id');
    
    if (!doctorId) {
        showError('未指定医生ID');
        return;
    }
    
    // 初始化页面
    initPage();
});

// 初始化页面
async function initPage() {
    showLoading(true);
    
    try {
        // 并行加载数据
        await Promise.all([
            loadDoctor(),
            loadSchedules(),
            loadReviews()
        ]);
        
        // 渲染医生信息
        renderDoctor();
        
        // 渲染排班信息
        renderSchedules();
        
        // 渲染评价信息
        renderReviews();
        
        // 初始化事件监听器
        initEventListeners();
        
        showLoading(false);
    } catch (error) {
        console.error('页面初始化失败:', error);
        showError('加载医生详情失败，请刷新页面重试');
        showLoading(false);
    }
}

// 加载医生详情
async function loadDoctor() {
    try {
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/`);
        if (!response.ok) {
            throw new Error('获取医生详情失败');
        }
        
        doctor = await response.json();
        
        // 检查是否已收藏
        checkFavoriteStatus();
    } catch (error) {
        console.error('加载医生详情失败:', error);
        throw error;
    }
}

// 加载排班信息
async function loadSchedules() {
    try {
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 14); // 获取未来两周的排班
        
        const params = new URLSearchParams();
        params.append('doctor', doctorId);
        params.append('start_date', formatDate(today));
        params.append('end_date', formatDate(endDate));
        
        const response = await fetch(`${API_BASE_URL}/schedules/?${params.toString()}`);
        if (!response.ok) {
            throw new Error('获取排班信息失败');
        }
        
        const data = await response.json();
        schedules = data.results || data;
    } catch (error) {
        console.error('加载排班信息失败:', error);
        throw error;
    }
}

// 加载评价信息
async function loadReviews() {
    try {
        const params = new URLSearchParams();
        params.append('doctor', doctorId);
        params.append('ordering', '-created_at');
        params.append('page_size', 10);
        
        const response = await fetch(`${API_BASE_URL}/reviews/?${params.toString()}`);
        if (!response.ok) {
            throw new Error('获取评价信息失败');
        }
        
        const data = await response.json();
        reviews = data.results || data;
    } catch (error) {
        console.error('加载评价信息失败:', error);
        throw error;
    }
}

// 渲染医生信息
async function renderDoctor() {
    if (!doctorContainer || !doctor) return;
    
    // 获取医院和科室信息
    try {
        const [hospitalResponse, departmentResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/hospitals/${doctor.hospital}/`),
            fetch(`${API_BASE_URL}/departments/${doctor.department}/`)
        ]);
        
        if (hospitalResponse.ok) {
            hospital = await hospitalResponse.json();
        }
        
        if (departmentResponse.ok) {
            department = await departmentResponse.json();
        }
    } catch (error) {
        console.error('获取医院/科室信息失败:', error);
    }
    
    const doctorHtml = `
        <div class="doctor-detail">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
                </div>
                <div class="doctor-info">
                    <h1 class="doctor-name">${doctor.name}</h1>
                    <div class="doctor-title">${doctor.title || '医生'}</div>
                    <div class="doctor-meta">
                        <span class="doctor-hospital">${hospital ? hospital.name : '未知医院'}</span>
                        <span class="doctor-department">${department ? department.name : '未知科室'}</span>
                        <span class="doctor-experience">从业${doctor.experience || 0}年</span>
                    </div>
                    <div class="doctor-rating">
                        <div class="stars">
                            ${generateStars(doctor.average_rating || 0)}
                        </div>
                        <span class="rating-score">${doctor.average_rating?.toFixed(1) || '0.0'}</span>
                        <span class="rating-count">(${doctor.review_count || 0}条评价)</span>
                    </div>
                    <div class="doctor-actions">
                        <button id="favorite-btn" class="favorite-btn ${isFavorite ? 'favorited' : ''}">
                            <i class="icon">${isFavorite ? '❤️' : '🤍'}</i>
                            <span>${isFavorite ? '已收藏' : '收藏'}</span>
                        </button>
                        <button id="book-appointment-btn" class="book-btn">预约挂号</button>
                    </div>
                </div>
            </div>
            
            <div class="doctor-content">
                <div class="doctor-section">
                    <h2>医生简介</h2>
                    <div class="doctor-bio">
                        ${doctor.bio || '暂无简介'}
                    </div>
                </div>
                
                <div class="doctor-section">
                    <h2>专长领域</h2>
                    <div class="doctor-specialties">
                        ${doctor.specialties || '暂无专长信息'}
                    </div>
                </div>
                
                <div class="doctor-section">
                    <h2>教育背景</h2>
                    <div class="doctor-education">
                        ${doctor.education || '暂无教育背景信息'}
                    </div>
                </div>
                
                <div class="doctor-section">
                    <h2>执业经历</h2>
                    <div class="doctor-experience-details">
                        ${doctor.experience_details || '暂无执业经历信息'}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    doctorContainer.innerHTML = doctorHtml;
    
    // 更新DOM元素引用
    document.getElementById('favorite-btn').addEventListener('click', toggleFavorite);
    document.getElementById('book-appointment-btn').addEventListener('click', openAppointmentModal);
}

// 渲染排班信息
function renderSchedules() {
    if (!scheduleContainer) return;
    
    if (schedules.length === 0) {
        scheduleContainer.innerHTML = '<p class="no-schedule">暂无排班信息</p>';
        return;
    }
    
    // 按日期分组排班
    const schedulesByDate = {};
    schedules.forEach(schedule => {
        if (!schedulesByDate[schedule.date]) {
            schedulesByDate[schedule.date] = [];
        }
        schedulesByDate[schedule.date].push(schedule);
    });
    
    // 生成排班HTML
    let scheduleHtml = '<div class="schedule-list">';
    
    Object.keys(schedulesByDate).sort().forEach(date => {
        const dateObj = new Date(date);
        const dateStr = formatDateDisplay(dateObj);
        const dayOfWeek = getDayOfWeek(dateObj);
        
        scheduleHtml += `
            <div class="schedule-day">
                <div class="schedule-date">
                    <div class="date">${dateStr}</div>
                    <div class="day">${dayOfWeek}</div>
                </div>
                <div class="schedule-slots">
        `;
        
        schedulesByDate[date].forEach(schedule => {
            const timeSlots = schedule.time_slots || [];
            timeSlots.forEach(timeSlot => {
                const isAvailable = timeSlot.is_available;
                const slotClass = isAvailable ? 'available' : 'unavailable';
                
                scheduleHtml += `
                    <button class="time-slot ${slotClass}" 
                            data-date="${date}" 
                            data-time="${timeSlot.start_time}-${timeSlot.end_time}"
                            data-schedule-id="${schedule.id}"
                            ${!isAvailable ? 'disabled' : ''}>
                        ${timeSlot.start_time.substring(0, 5)}
                    </button>
                `;
            });
        });
        
        scheduleHtml += `
                </div>
            </div>
        `;
    });
    
    scheduleHtml += '</div>';
    
    scheduleContainer.innerHTML = scheduleHtml;
    
    // 添加时段选择事件
    addTimeSlotEvents();
}

// 渲染评价信息
function renderReviews() {
    if (!reviewsContainer) return;
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p class="no-reviews">暂无评价</p>';
        return;
    }
    
    let reviewsHtml = '<div class="reviews-list">';
    
    reviews.forEach(review => {
        const reviewDate = new Date(review.created_at);
        const dateStr = formatDateDisplay(reviewDate);
        
        reviewsHtml += `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">
                            <img src="${review.user_avatar || '/static/images/default-avatar.png'}" alt="${review.user_name}">
                        </div>
                        <div class="reviewer-details">
                            <div class="reviewer-name">${review.user_name || '匿名用户'}</div>
                            <div class="review-date">${dateStr}</div>
                        </div>
                    </div>
                    <div class="review-rating">
                        <div class="stars">
                            ${generateStars(review.rating || 0)}
                        </div>
                    </div>
                </div>
                <div class="review-content">
                    ${review.content || ''}
                </div>
                ${review.reply ? `
                    <div class="review-reply">
                        <div class="reply-header">
                            <span class="reply-author">医生回复</span>
                            <span class="reply-date">${formatDateDisplay(new Date(review.reply.created_at))}</span>
                        </div>
                        <div class="reply-content">${review.reply.content}</div>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    reviewsHtml += '</div>';
    
    if (reviews.length >= 10) {
        reviewsHtml += `
            <div class="reviews-more">
                <a href="/doctor-reviews.html?doctor=${doctorId}" class="more-reviews-btn">查看更多评价</a>
            </div>
        `;
    }
    
    reviewsContainer.innerHTML = reviewsHtml;
}

// 初始化事件监听器
function initEventListeners() {
    // 收藏按钮事件
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }
    
    // 预约按钮事件
    const bookAppointmentBtn = document.getElementById('book-appointment-btn');
    if (bookAppointmentBtn) {
        bookAppointmentBtn.addEventListener('click', openAppointmentModal);
    }
    
    // 预约模态框事件
    const appointmentModal = document.getElementById('appointment-modal');
    if (appointmentModal) {
        // 关闭按钮
        const closeBtn = appointmentModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeAppointmentModal);
        }
        
        // 取消按钮
        const cancelBtn = appointmentModal.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeAppointmentModal);
        }
        
        // 确认预约按钮
        const confirmBtn = appointmentModal.querySelector('.confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', submitAppointment);
        }
        
        // 点击模态框外部关闭
        appointmentModal.addEventListener('click', function(e) {
            if (e.target === appointmentModal) {
                closeAppointmentModal();
            }
        });
    }
}

// 添加时段选择事件
function addTimeSlotEvents() {
    const timeSlots = document.querySelectorAll('.time-slot.available');
    timeSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            // 移除其他选中状态
            document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
            
            // 添加选中状态
            this.classList.add('selected');
            
            // 保存选中的日期和时段
            selectedDate = this.dataset.date;
            selectedTimeSlot = this.dataset.time;
        });
    });
}

// 检查收藏状态
async function checkFavoriteStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/favorites/doctors/check/?doctor=${doctorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            isFavorite = data.is_favorite || false;
        }
    } catch (error) {
        console.error('检查收藏状态失败:', error);
    }
}

// 切换收藏状态
async function toggleFavorite() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('请先登录', 'warning');
            return;
        }
        
        const favoriteBtn = document.getElementById('favorite-btn');
        
        if (isFavorite) {
            // 取消收藏
            const response = await fetch(`${API_BASE_URL}/favorites/doctors/${doctorId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok && response.status !== 404) {
                throw new Error('取消收藏失败');
            }
            
            isFavorite = false;
            favoriteBtn.classList.remove('favorited');
            favoriteBtn.querySelector('i').textContent = '🤍';
            favoriteBtn.querySelector('span').textContent = '收藏';
            showToast('已取消收藏', 'success');
        } else {
            // 添加收藏
            const response = await fetch(`${API_BASE_URL}/favorites/doctors/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ doctor: doctorId })
            });
            
            if (!response.ok) {
                throw new Error('添加收藏失败');
            }
            
            isFavorite = true;
            favoriteBtn.classList.add('favorited');
            favoriteBtn.querySelector('i').textContent = '❤️';
            favoriteBtn.querySelector('span').textContent = '已收藏';
            showToast('收藏成功', 'success');
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        showToast('操作失败，请稍后重试', 'error');
    }
}

// 打开预约模态框
function openAppointmentModal() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('请先登录', 'warning');
        return;
    }
    
    if (!selectedDate || !selectedTimeSlot) {
        showToast('请先选择就诊日期和时段', 'warning');
        
        // 滚动到排班区域
        scheduleContainer.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    // 更新模态框内容
    const appointmentModal = document.getElementById('appointment-modal');
    const dateDisplay = document.getElementById('appointment-date');
    const timeDisplay = document.getElementById('appointment-time');
    const doctorDisplay = document.getElementById('appointment-doctor');
    const hospitalDisplay = document.getElementById('appointment-hospital');
    
    if (dateDisplay) {
        dateDisplay.textContent = formatDateDisplay(new Date(selectedDate));
    }
    
    if (timeDisplay) {
        timeDisplay.textContent = selectedTimeSlot;
    }
    
    if (doctorDisplay) {
        doctorDisplay.textContent = doctor.name;
    }
    
    if (hospitalDisplay) {
        hospitalDisplay.textContent = hospital ? hospital.name : '';
    }
    
    // 显示模态框
    appointmentModal.style.display = 'flex';
    appointmentModal.classList.add('show');
}

// 关闭预约模态框
function closeAppointmentModal() {
    const appointmentModal = document.getElementById('appointment-modal');
    appointmentModal.classList.remove('show');
    
    // 延迟隐藏，以便动画完成
    setTimeout(() => {
        appointmentModal.style.display = 'none';
    }, 300);
}

// 提交预约
async function submitAppointment() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('请先登录', 'warning');
            return;
        }
        
        // 获取表单数据
        const symptomInput = document.getElementById('appointment-symptom');
        const noteInput = document.getElementById('appointment-note');
        
        const symptoms = symptomInput ? symptomInput.value.trim() : '';
        const notes = noteInput ? noteInput.value.trim() : '';
        
        if (!symptoms) {
            showToast('请填写就诊症状', 'warning');
            return;
        }
        
        // 构建预约数据
        const appointmentData = {
            doctor: doctorId,
            hospital: doctor.hospital,
            department: doctor.department,
            appointment_date: selectedDate,
            time_slot: selectedTimeSlot,
            symptoms: symptoms,
            notes: notes
        };
        
        // 提交预约
        const response = await fetch(`${API_BASE_URL}/appointments/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '预约失败');
        }
        
        // 预约成功
        showToast('预约成功', 'success');
        
        // 关闭模态框
        closeAppointmentModal();
        
        // 清空表单
        if (symptomInput) symptomInput.value = '';
        if (noteInput) noteInput.value = '';
        
        // 重置选中的时段
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        selectedDate = null;
        selectedTimeSlot = null;
        
        // 刷新排班信息
        await loadSchedules();
        renderSchedules();
        
    } catch (error) {
        console.error('提交预约失败:', error);
        showToast(error.message || '预约失败，请稍后重试', 'error');
    }
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

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

function getDayOfWeek(date) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
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