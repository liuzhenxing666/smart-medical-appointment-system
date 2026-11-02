// 用户端我的预约页面JavaScript

// 全局变量
let appointments = [];
let currentFilter = {
    status: 'all',
    dateRange: 'all'
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeMyAppointments();
});

function initializeMyAppointments() {
    // 检查用户登录状态
    if (!currentUser) {
        window.location.href = '/login/';
        return;
    }
    
    // 加载预约列表
    loadMyAppointments();
    
    // 初始化事件监听器
    initEventListeners();
}

// 初始化事件监听器
function initEventListeners() {
    // 状态筛选
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    // 日期范围筛选
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', applyFilters);
    }
    
    // 搜索框
    const searchInput = document.getElementById('appointmentSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // 取消预约按钮
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('cancel-appointment-btn')) {
            const appointmentId = event.target.dataset.appointmentId;
            cancelAppointment(appointmentId);
        }
    });
    
    // 查看详情按钮
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('view-detail-btn')) {
            const appointmentId = event.target.dataset.appointmentId;
            viewAppointmentDetail(appointmentId);
        }
    });
    
    // 评价按钮
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('review-appointment-btn')) {
            const appointmentId = event.target.dataset.appointmentId;
            showReviewModal(appointmentId);
        }
    });
    
    // 再次预约按钮
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('rebook-appointment-btn')) {
            const doctorId = event.target.dataset.doctorId;
            window.location.href = `/appointment-booking/?doctor=${doctorId}`;
        }
    });
    
    // 关闭模态框
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal();
        }
    });
    
    // 提交评价表单
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', submitReview);
    }
    
    // 评分星星点击
    const ratingStars = document.querySelectorAll('.rating-star');
    ratingStars.forEach(star => {
        star.addEventListener('click', handleStarClick);
    });
}

// 加载我的预约列表
function loadMyAppointments() {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;
    
    showLoading(container);
    
    // 构建查询参数
    const params = new URLSearchParams();
    
    if (currentFilter.status !== 'all') {
        params.append('status', currentFilter.status);
    }
    
    if (currentFilter.dateRange !== 'all') {
        params.append('date_range', currentFilter.dateRange);
    }
    
    let url = `${API_BASE_URL}/appointments/my/`;
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        container.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            appointments = data.results;
            renderAppointments(appointments);
            
            // 更新统计信息
            updateAppointmentStats(data.stats);
        } else {
            container.innerHTML = '<div class="no-appointments"><p>暂无预约记录</p><a href="/appointment-search/" class="btn btn-primary">去预约</a></div>';
        }
    })
    .catch(error => {
        console.error('加载预约列表失败:', error);
        container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
    });
}

// 渲染预约列表
function renderAppointments(appointmentList) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;
    
    // 按状态分组
    const groupedAppointments = groupAppointmentsByStatus(appointmentList);
    
    let html = '';
    
    // 渲染待确认预约
    if (groupedAppointments.pending && groupedAppointments.pending.length > 0) {
        html += `
            <div class="appointment-group">
                <h3 class="group-title">待确认 (${groupedAppointments.pending.length})</h3>
                <div class="appointment-list">
                    ${groupedAppointments.pending.map(appointment => renderAppointmentCard(appointment)).join('')}
                </div>
            </div>
        `;
    }
    
    // 渲染已确认预约
    if (groupedAppointments.confirmed && groupedAppointments.confirmed.length > 0) {
        html += `
            <div class="appointment-group">
                <h3 class="group-title">已确认 (${groupedAppointments.confirmed.length})</h3>
                <div class="appointment-list">
                    ${groupedAppointments.confirmed.map(appointment => renderAppointmentCard(appointment)).join('')}
                </div>
            </div>
        `;
    }
    
    // 渲染已完成预约
    if (groupedAppointments.completed && groupedAppointments.completed.length > 0) {
        html += `
            <div class="appointment-group">
                <h3 class="group-title">已完成 (${groupedAppointments.completed.length})</h3>
                <div class="appointment-list">
                    ${groupedAppointments.completed.map(appointment => renderAppointmentCard(appointment)).join('')}
                </div>
            </div>
        `;
    }
    
    // 渲染已取消预约
    if (groupedAppointments.cancelled && groupedAppointments.cancelled.length > 0) {
        html += `
            <div class="appointment-group">
                <h3 class="group-title">已取消 (${groupedAppointments.cancelled.length})</h3>
                <div class="appointment-list">
                    ${groupedAppointments.cancelled.map(appointment => renderAppointmentCard(appointment)).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// 按状态分组预约
function groupAppointmentsByStatus(appointmentList) {
    return {
        pending: appointmentList.filter(a => a.status === 'pending'),
        confirmed: appointmentList.filter(a => a.status === 'confirmed'),
        completed: appointmentList.filter(a => a.status === 'completed'),
        cancelled: appointmentList.filter(a => a.status === 'cancelled')
    };
}

// 渲染预约卡片
function renderAppointmentCard(appointment) {
    const statusClass = getStatusClass(appointment.status);
    const statusText = getStatusText(appointment.status);
    
    return `
        <div class="appointment-card ${statusClass}">
            <div class="appointment-header">
                <div class="appointment-info">
                    <h4 class="appointment-title">预约挂号</h4>
                    <div class="appointment-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="appointment-date">
                    <div class="date">${formatDate(appointment.date)}</div>
                    <div class="time">${appointment.time_slot}</div>
                </div>
            </div>
            
            <div class="appointment-body">
                <div class="doctor-info">
                    <div class="doctor-avatar">
                        <img src="${appointment.doctor_image || '/static/images/default-doctor.png'}" alt="${appointment.doctor_name}">
                    </div>
                    <div class="doctor-details">
                        <h5 class="doctor-name">${appointment.doctor_name}</h5>
                        <div class="doctor-title">${appointment.doctor_title}</div>
                        <div class="hospital-name">${appointment.hospital_name}</div>
                    </div>
                </div>
                
                <div class="appointment-details">
                    <div class="detail-item">
                        <span class="label">患者姓名:</span>
                        <span class="value">${appointment.patient_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">联系电话:</span>
                        <span class="value">${appointment.patient_phone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">预约时间:</span>
                        <span class="value">${formatDateTime(appointment.created_at)}</span>
                    </div>
                    ${appointment.description ? `
                        <div class="detail-item">
                            <span class="label">病情描述:</span>
                            <span class="value">${appointment.description}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="appointment-footer">
                ${getAppointmentActions(appointment)}
            </div>
        </div>
    `;
}

// 获取预约操作按钮
function getAppointmentActions(appointment) {
    let actions = '';
    
    switch (appointment.status) {
        case 'pending':
            actions = `
                <button class="btn btn-outline view-detail-btn" data-appointment-id="${appointment.id}">详情</button>
                <button class="btn btn-danger cancel-appointment-btn" data-appointment-id="${appointment.id}">取消</button>
            `;
            break;
        case 'confirmed':
            actions = `
                <button class="btn btn-outline view-detail-btn" data-appointment-id="${appointment.id}">详情</button>
                <button class="btn btn-danger cancel-appointment-btn" data-appointment-id="${appointment.id}">取消</button>
            `;
            break;
        case 'completed':
            actions = `
                <button class="btn btn-outline view-detail-btn" data-appointment-id="${appointment.id}">详情</button>
                ${appointment.reviewed ? 
                    '<button class="btn btn-outline" disabled>已评价</button>' : 
                    `<button class="btn btn-primary review-appointment-btn" data-appointment-id="${appointment.id}">评价</button>`
                }
                <button class="btn btn-primary rebook-appointment-btn" data-doctor-id="${appointment.doctor_id}">再次预约</button>
            `;
            break;
        case 'cancelled':
            actions = `
                <button class="btn btn-outline view-detail-btn" data-appointment-id="${appointment.id}">详情</button>
                <button class="btn btn-primary rebook-appointment-btn" data-doctor-id="${appointment.doctor_id}">再次预约</button>
            `;
            break;
    }
    
    return actions;
}

// 更新预约统计信息
function updateAppointmentStats(stats) {
    if (!stats) return;
    
    const statsContainer = document.getElementById('appointmentStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${stats.total || 0}</div>
                <div class="stat-label">总预约</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.pending || 0}</div>
                <div class="stat-label">待确认</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.confirmed || 0}</div>
                <div class="stat-label">已确认</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.completed || 0}</div>
                <div class="stat-label">已完成</div>
            </div>
        </div>
    `;
}

// 取消预约
function cancelAppointment(appointmentId) {
    if (!confirm('确定要取消这个预约吗？')) return;
    
    const reason = prompt('请输入取消原因（可选）:');
    
    fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            reason: reason
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('预约已取消');
            loadMyAppointments();
        } else {
            alert('取消失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('取消预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 查看预约详情
function viewAppointmentDetail(appointmentId) {
            window.location.href = `/appointment-detail/?id=${appointmentId}`;
}

// 显示评价模态框
function showReviewModal(appointmentId) {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    
    // 设置预约ID
    const appointmentIdInput = document.getElementById('appointmentId');
    if (appointmentIdInput) {
        appointmentIdInput.value = appointmentId;
    }
    
    // 重置表单
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.reset();
    }
    
    // 重置评分
    resetRatingStars();
    
    // 显示模态框
    modal.style.display = 'block';
}

// 关闭模态框
function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// 处理星星点击
function handleStarClick(event) {
    const star = event.currentTarget;
    const rating = parseInt(star.dataset.rating);
    
    // 更新星星状态
    updateRatingStars(rating);
    
    // 更新隐藏的评分输入
    const ratingInput = document.getElementById('rating');
    if (ratingInput) {
        ratingInput.value = rating;
    }
}

// 更新星星状态
function updateRatingStars(rating) {
    const stars = document.querySelectorAll('.rating-star');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// 重置星星状态
function resetRatingStars() {
    updateRatingStars(0);
    
    const ratingInput = document.getElementById('rating');
    if (ratingInput) {
        ratingInput.value = '';
    }
}

// 提交评价
function submitReview(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const appointmentId = formData.get('appointment_id');
    const rating = formData.get('rating');
    const content = formData.get('content');
    const tags = formData.get('tags');
    
    if (!rating) {
        alert('请选择评分');
        return;
    }
    
    const reviewData = {
        appointment_id: appointmentId,
        rating: parseInt(rating),
        content: content,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };
    
    const submitBtn = document.getElementById('submitReviewBtn');
    const originalText = submitBtn.textContent;
    
    // 显示加载状态
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    
    fetch(`${API_BASE_URL}/reviews/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(reviewData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('评价提交成功');
            closeModal();
            loadMyAppointments();
        } else {
            alert('评价失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('提交评价失败:', error);
        alert('评价失败，请稍后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

// 搜索预约
function handleSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
        renderAppointments(appointments);
        return;
    }
    
    const filteredAppointments = appointments.filter(appointment => {
        return (
            appointment.doctor_name.toLowerCase().includes(query.toLowerCase()) ||
            appointment.hospital_name.toLowerCase().includes(query.toLowerCase()) ||
            appointment.patient_name.toLowerCase().includes(query.toLowerCase()) ||
            appointment.patient_phone.includes(query)
        );
    });
    
    renderAppointments(filteredAppointments);
}

// 应用筛选器
function applyFilters() {
    // 更新筛选条件
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        currentFilter.status = statusFilter.value;
    }
    
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        currentFilter.dateRange = dateRangeFilter.value;
    }
    
    // 重新加载预约列表
    loadMyAppointments();
}

// 获取状态样式类
function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'status-pending';
        case 'confirmed': return 'status-confirmed';
        case 'completed': return 'status-completed';
        case 'cancelled': return 'status-cancelled';
        default: return '';
    }
}

// 获取状态文本
function getStatusText(status) {
    switch (status) {
        case 'pending': return '待确认';
        case 'confirmed': return '已确认';
        case 'completed': return '已完成';
        case 'cancelled': return '已取消';
        default: return '未知';
    }
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 显示加载状态
function showLoading(container) {
    container.innerHTML = '<div class="loading-spinner"></div>';
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}