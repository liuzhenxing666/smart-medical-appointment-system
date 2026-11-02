// 用户端预约详情页面JavaScript

// 全局变量
let appointment = null;
let doctor = null;
let hospital = null;
let department = null;
let appointmentId = null;
let reviewData = null;

// DOM元素
const appointmentContainer = document.getElementById('appointment-container');
const doctorContainer = document.getElementById('doctor-container');
const hospitalContainer = document.getElementById('hospital-container');
const reviewContainer = document.getElementById('review-container');
const cancelBtn = document.getElementById('cancel-appointment-btn');
const rescheduleBtn = document.getElementById('reschedule-appointment-btn');
const completeBtn = document.getElementById('complete-appointment-btn');
const reviewBtn = document.getElementById('review-appointment-btn');
const reviewModal = document.getElementById('review-modal');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从URL获取预约ID
    const urlParams = new URLSearchParams(window.location.search);
    appointmentId = urlParams.get('id');
    
    if (!appointmentId) {
        showError('未指定预约ID');
        return;
    }
    
    // 初始化页面
    initPage();
});

// 初始化页面
async function initPage() {
    showLoading(true);
    
    try {
        // 加载预约详情
        await loadAppointment();
        
        // 并行加载相关数据
        await Promise.all([
            loadDoctor(),
            loadHospital(),
            loadDepartment(),
            loadReview()
        ]);
        
        // 渲染预约信息
        renderAppointment();
        
        // 渲染医生信息
        renderDoctor();
        
        // 渲染医院信息
        renderHospital();
        
        // 渲染评价信息
        renderReview();
        
        // 初始化事件监听器
        initEventListeners();
        
        showLoading(false);
    } catch (error) {
        console.error('页面初始化失败:', error);
        showError('加载预约详情失败，请刷新页面重试');
        showLoading(false);
    }
}

// 加载预约详情
async function loadAppointment() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('请先登录');
        }
        
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取预约详情失败');
        }
        
        appointment = await response.json();
    } catch (error) {
        console.error('加载预约详情失败:', error);
        throw error;
    }
}

// 加载医生信息
async function loadDoctor() {
    try {
        const response = await fetch(`${API_BASE_URL}/doctors/${appointment.doctor}/`);
        if (!response.ok) {
            throw new Error('获取医生信息失败');
        }
        
        doctor = await response.json();
    } catch (error) {
        console.error('加载医生信息失败:', error);
        throw error;
    }
}

// 加载医院信息
async function loadHospital() {
    try {
        const response = await fetch(`${API_BASE_URL}/hospitals/${appointment.hospital}/`);
        if (!response.ok) {
            throw new Error('获取医院信息失败');
        }
        
        hospital = await response.json();
    } catch (error) {
        console.error('加载医院信息失败:', error);
        throw error;
    }
}

// 加载科室信息
async function loadDepartment() {
    try {
        const response = await fetch(`${API_BASE_URL}/departments/${appointment.department}/`);
        if (!response.ok) {
            throw new Error('获取科室信息失败');
        }
        
        department = await response.json();
    } catch (error) {
        console.error('加载科室信息失败:', error);
        throw error;
    }
}

// 加载评价信息
async function loadReview() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/reviews/?appointment=${appointmentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            reviewData = data.results && data.results.length > 0 ? data.results[0] : null;
        }
    } catch (error) {
        console.error('加载评价信息失败:', error);
        // 不抛出错误，评价信息不是必需的
    }
}

// 渲染预约信息
function renderAppointment() {
    if (!appointmentContainer || !appointment) return;
    
    const appointmentDate = new Date(appointment.appointment_date);
    const dateStr = formatDateDisplay(appointmentDate);
    const dayOfWeek = getDayOfWeek(appointmentDate);
    const statusClass = getStatusClass(appointment.status);
    const statusText = getStatusText(appointment.status);
    
    const appointmentHtml = `
        <div class="appointment-detail">
            <div class="appointment-header">
                <h1 class="appointment-title">预约详情</h1>
                <div class="appointment-status ${statusClass}">${statusText}</div>
            </div>
            
            <div class="appointment-info">
                <div class="info-section">
                    <h2>预约信息</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">预约编号:</span>
                            <span class="value">${appointment.id}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">预约时间:</span>
                            <span class="value">${dateStr} ${dayOfWeek} ${appointment.time_slot}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">挂号费:</span>
                            <span class="value price">¥${appointment.fee || 0}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">预约时间:</span>
                            <span class="value">${formatDateTime(appointment.created_at)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h2>就诊人信息</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">姓名:</span>
                            <span class="value">${appointment.patient_name || '未填写'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">身份证号:</span>
                            <span class="value">${appointment.patient_id_card || '未填写'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">手机号:</span>
                            <span class="value">${appointment.patient_phone || '未填写'}</span>
                        </div>
                    </div>
                </div>
                
                ${appointment.symptoms ? `
                    <div class="info-section">
                        <h2>症状描述</h2>
                        <div class="symptom-content">
                            ${appointment.symptoms}
                        </div>
                    </div>
                ` : ''}
                
                ${appointment.notes ? `
                    <div class="info-section">
                        <h2>备注信息</h2>
                        <div class="notes-content">
                            ${appointment.notes}
                        </div>
                    </div>
                ` : ''}
                
                ${appointment.diagnosis ? `
                    <div class="info-section">
                        <h2>诊断结果</h2>
                        <div class="diagnosis-content">
                            ${appointment.diagnosis}
                        </div>
                    </div>
                ` : ''}
                
                ${appointment.prescription ? `
                    <div class="info-section">
                        <h2>处方信息</h2>
                        <div class="prescription-content">
                            ${appointment.prescription}
                        </div>
                    </div>
                ` : ''}
                
                ${appointment.medical_record ? `
                    <div class="info-section">
                        <h2>病历信息</h2>
                        <div class="medical-record-content">
                            ${appointment.medical_record}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="appointment-actions">
                ${getActionButtons()}
            </div>
        </div>
    `;
    
    appointmentContainer.innerHTML = appointmentHtml;
}

// 渲染医生信息
function renderDoctor() {
    if (!doctorContainer || !doctor) return;
    
    const doctorHtml = `
        <div class="doctor-card">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
                </div>
                <div class="doctor-info">
                    <h3 class="doctor-name">${doctor.name}</h3>
                    <div class="doctor-title">${doctor.title || '医生'}</div>
                    <div class="doctor-department">${department ? department.name : '未知科室'}</div>
                    <div class="doctor-rating">
                        <div class="stars">
                            ${generateStars(doctor.average_rating || 0)}
                        </div>
                        <span class="rating-score">${doctor.average_rating?.toFixed(1) || '0.0'}</span>
                        <span class="rating-count">(${doctor.review_count || 0}条评价)</span>
                    </div>
                </div>
            </div>
            
            <div class="doctor-details">
                ${doctor.bio ? `
                    <div class="doctor-bio">
                        <h4>医生简介</h4>
                        <p>${doctor.bio}</p>
                    </div>
                ` : ''}
                
                ${doctor.specialties ? `
                    <div class="doctor-specialties">
                        <h4>专长领域</h4>
                        <p>${doctor.specialties}</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="doctor-actions">
                <a href="/appointment-search/?doctor=${doctor.id}" class="view-doctor-btn">查看医生详情</a>
                <a href="/appointment-booking/?doctor=${doctor.id}" class="book-again-btn">再次预约</a>
            </div>
        </div>
    `;
    
    doctorContainer.innerHTML = doctorHtml;
}

// 渲染医院信息
function renderHospital() {
    if (!hospitalContainer || !hospital) return;
    
    const hospitalHtml = `
        <div class="hospital-card">
            <div class="hospital-header">
                <h3 class="hospital-name">${hospital.name}</h3>
                <div class="hospital-level">${hospital.level || '未知等级'}</div>
            </div>
            
            <div class="hospital-details">
                <div class="detail-item">
                    <i class="icon">📍</i>
                    <span>${hospital.address || '暂无地址'}</span>
                </div>
                <div class="detail-item">
                    <i class="icon">📞</i>
                    <span>${hospital.phone || '暂无电话'}</span>
                </div>
                <div class="detail-item">
                    <i class="icon">⏰</i>
                    <span>${hospital.working_hours || '暂无工作时间'}</span>
                </div>
            </div>
            
            <div class="hospital-actions">
                <a href="/appointment-search/?hospital=${hospital.id}" class="view-hospital-btn">查看医院详情</a>
            </div>
        </div>
    `;
    
    hospitalContainer.innerHTML = hospitalHtml;
}

// 渲染评价信息
function renderReview() {
    if (!reviewContainer) return;
    
    if (!reviewData) {
        reviewContainer.innerHTML = `
            <div class="no-review">
                <p>暂无评价</p>
            </div>
        `;
        return;
    }
    
    const reviewDate = new Date(reviewData.created_at);
    const dateStr = formatDateDisplay(reviewDate);
    
    const reviewHtml = `
        <div class="review-detail">
            <div class="review-header">
                <h3>我的评价</h3>
                <div class="review-date">${dateStr}</div>
            </div>
            
            <div class="review-rating">
                <div class="stars">
                    ${generateStars(reviewData.rating || 0)}
                </div>
                <span class="rating-score">${reviewData.rating}/5</span>
            </div>
            
            <div class="review-content">
                ${reviewData.content || ''}
            </div>
            
            ${reviewData.reply ? `
                <div class="review-reply">
                    <div class="reply-header">
                        <span class="reply-author">医生回复</span>
                        <span class="reply-date">${formatDateDisplay(new Date(reviewData.reply.created_at))}</span>
                    </div>
                    <div class="reply-content">${reviewData.reply.content}</div>
                </div>
            ` : ''}
        </div>
    `;
    
    reviewContainer.innerHTML = reviewHtml;
}

// 初始化事件监听器
function initEventListeners() {
    // 取消预约按钮
    const cancelBtn = document.getElementById('cancel-appointment-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelAppointment);
    }
    
    // 改约按钮
    const rescheduleBtn = document.getElementById('reschedule-appointment-btn');
    if (rescheduleBtn) {
        rescheduleBtn.addEventListener('click', rescheduleAppointment);
    }
    
    // 完成就诊按钮
    const completeBtn = document.getElementById('complete-appointment-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', completeAppointment);
    }
    
    // 评价按钮
    const reviewBtn = document.getElementById('review-appointment-btn');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', openReviewModal);
    }
    
    // 评价模态框事件
    const reviewModal = document.getElementById('review-modal');
    if (reviewModal) {
        // 关闭按钮
        const closeBtn = reviewModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeReviewModal);
        }
        
        // 取消按钮
        const cancelReviewBtn = reviewModal.querySelector('.cancel-btn');
        if (cancelReviewBtn) {
            cancelReviewBtn.addEventListener('click', closeReviewModal);
        }
        
        // 提交评价按钮
        const submitBtn = reviewModal.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitReview);
        }
        
        // 点击模态框外部关闭
        reviewModal.addEventListener('click', function(e) {
            if (e.target === reviewModal) {
                closeReviewModal();
            }
        });
        
        // 评分星星点击事件
        const stars = reviewModal.querySelectorAll('.rating-star');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.rating);
                setRating(rating);
            });
        });
    }
}

// 获取操作按钮HTML
function getActionButtons() {
    if (!appointment) return '';
    
    const status = appointment.status;
    let buttons = '';
    
    if (status === 'pending') {
        buttons += `
            <button id="cancel-appointment-btn" class="action-btn cancel-btn">取消预约</button>
            <button id="reschedule-appointment-btn" class="action-btn reschedule-btn">改约</button>
        `;
    } else if (status === 'confirmed') {
        buttons += `
            <button id="cancel-appointment-btn" class="action-btn cancel-btn">取消预约</button>
            <button id="reschedule-appointment-btn" class="action-btn reschedule-btn">改约</button>
            <button id="complete-appointment-btn" class="action-btn complete-btn">完成就诊</button>
        `;
    } else if (status === 'completed') {
        if (!reviewData) {
            buttons += `
                <button id="review-appointment-btn" class="action-btn review-btn">评价</button>
            `;
        }
        buttons += `
            <a href="/appointment-booking/?doctor=${appointment.doctor}" class="action-btn book-again-btn">再次预约</a>
        `;
    }
    
    return buttons;
}

// 取消预约
async function cancelAppointment() {
    if (!confirm('确定要取消此预约吗？取消后可能无法恢复。')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('请先登录', 'warning');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '取消预约失败');
        }
        
        showToast('预约已取消', 'success');
        
        // 刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('取消预约失败:', error);
        showToast(error.message || '取消预约失败，请稍后重试', 'error');
    }
}

// 改约
async function rescheduleAppointment() {
    // 跳转到预约页面，并传递医生ID和当前预约ID
    window.location.href = `/appointment-booking/?doctor=${appointment.doctor}&reschedule=${appointmentId}`;
}

// 完成就诊
async function completeAppointment() {
    if (!confirm('确定要标记此预约为已完成吗？')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('请先登录', 'warning');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/complete/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '操作失败');
        }
        
        showToast('就诊已完成', 'success');
        
        // 刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('完成就诊失败:', error);
        showToast(error.message || '操作失败，请稍后重试', 'error');
    }
}

// 打开评价模态框
function openReviewModal() {
    const reviewModal = document.getElementById('review-modal');
    if (!reviewModal) return;
    
    // 重置表单
    const ratingStars = reviewModal.querySelectorAll('.rating-star');
    ratingStars.forEach(star => {
        star.classList.remove('active');
    });
    
    const reviewContent = document.getElementById('review-content');
    if (reviewContent) {
        reviewContent.value = '';
    }
    
    // 显示模态框
    reviewModal.style.display = 'flex';
    reviewModal.classList.add('show');
}

// 关闭评价模态框
function closeReviewModal() {
    const reviewModal = document.getElementById('review-modal');
    if (!reviewModal) return;
    
    reviewModal.classList.remove('show');
    
    // 延迟隐藏，以便动画完成
    setTimeout(() => {
        reviewModal.style.display = 'none';
    }, 300);
}

// 设置评分
function setRating(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    
    // 保存评分值
    document.getElementById('review-rating').value = rating;
}

// 提交评价
async function submitReview() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('请先登录', 'warning');
            return;
        }
        
        // 获取评分和内容
        const rating = document.getElementById('review-rating').value;
        const content = document.getElementById('review-content').value.trim();
        
        if (!rating || rating === '0') {
            showToast('请选择评分', 'warning');
            return;
        }
        
        if (!content) {
            showToast('请填写评价内容', 'warning');
            return;
        }
        
        // 构建评价数据
        const reviewData = {
            appointment: appointmentId,
            doctor: appointment.doctor,
            hospital: appointment.hospital,
            department: appointment.department,
            rating: parseInt(rating),
            content: content
        };
        
        // 提交评价
        const response = await fetch(`${API_BASE_URL}/reviews/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '提交评价失败');
        }
        
        showToast('评价提交成功', 'success');
        
        // 关闭模态框
        closeReviewModal();
        
        // 刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('提交评价失败:', error);
        showToast(error.message || '提交评价失败，请稍后重试', 'error');
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

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled',
        'no_show': 'status-no-show'
    };
    
    return statusMap[status] || '';
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待确认',
        'confirmed': '已确认',
        'completed': '已完成',
        'cancelled': '已取消',
        'no_show': '未就诊'
    };
    
    return statusMap[status] || status;
}

function formatDateDisplay(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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