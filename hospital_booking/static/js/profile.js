// 个人中心页面JavaScript

// 全局变量
let userInfo = null;
let appointments = [];
let favorites = [];

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
});

function initializeProfile() {
    // 检查用户登录状态
    if (!currentUser) {
        window.location.href = '/login/';
        return;
    }
    
    // 加载用户信息
    loadUserInfo();
    
    // 加载用户统计数据
    loadUserStats();
    
    // 初始化事件监听器
    initEventListeners();
}

// 初始化事件监听器
function initEventListeners() {
    // 编辑信息按钮
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', openEditProfileModal);
    }
    
    // 修改密码按钮
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', openChangePasswordModal);
    }
    
    // 保存信息按钮
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    
    // 修改密码提交按钮
    const submitPasswordBtn = document.getElementById('submitPasswordBtn');
    if (submitPasswordBtn) {
        submitPasswordBtn.addEventListener('click', changePassword);
    }
    
    // 查看更多预约按钮
    const viewMoreAppointmentsBtn = document.getElementById('viewMoreAppointmentsBtn');
    if (viewMoreAppointmentsBtn) {
        viewMoreAppointmentsBtn.addEventListener('click', () => {
            window.location.href = '/my-appointments/';
        });
    }
    
    // 查看更多收藏按钮
    const viewMoreFavoritesBtn = document.getElementById('viewMoreFavoritesBtn');
    if (viewMoreFavoritesBtn) {
        viewMoreFavoritesBtn.addEventListener('click', () => {
            window.location.href = '/my-favorites/';
        });
    }
    
    // 退出登录按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// 加载用户信息
function loadUserInfo() {
    fetch(`${API_BASE_URL}/users/profiles/me/`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        userInfo = data;
        renderUserInfo(data);
    })
    .catch(error => {
        console.error('加载用户信息失败:', error);
    });
}

// 渲染用户信息
function renderUserInfo(user) {
    // 基本信息区域
    const userName = document.getElementById('userName');
    if (userName) userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '未设置';
    
    const userPhone = document.getElementById('userPhone');
    if (userPhone) userPhone.textContent = user.phone || '未设置';
    
    const userEmail = document.getElementById('userEmail');
    if (userEmail) userEmail.textContent = user.email || '未设置';
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.avatar) {
        userAvatar.src = user.avatar;
    }
    
    // 编辑表单
    const editFirstName = document.getElementById('first_name');
    if (editFirstName) editFirstName.value = user.first_name || '';
    
    const editLastName = document.getElementById('last_name');
    if (editLastName) editLastName.value = user.last_name || '';
    
    const editPhone = document.getElementById('phone');
    if (editPhone) editPhone.value = user.phone || '';
    
    const editEmail = document.getElementById('email');
    if (editEmail) editEmail.value = user.email || '';
    
    const editGender = document.getElementById('gender');
    if (editGender) editGender.value = user.gender || '';
    
    const editDateOfBirth = document.getElementById('date_of_birth');
    if (editDateOfBirth) editDateOfBirth.value = user.date_of_birth || '';
    
    const editAddress = document.getElementById('address');
    if (editAddress) editAddress.value = user.address || '';
    
    const editEmergencyContact = document.getElementById('emergency_contact');
    if (editEmergencyContact) editEmergencyContact.value = user.emergency_contact || '';
    
    const editEmergencyPhone = document.getElementById('emergency_phone');
    if (editEmergencyPhone) editEmergencyPhone.value = user.emergency_phone || '';
}

// 加载用户统计数据
function loadUserStats() {
    // 加载预约统计
    loadAppointmentStats();
    
    // 加载收藏统计
    loadFavoriteStats();
}

// 加载预约统计
function loadAppointmentStats() {
    fetch(`${API_BASE_URL}/appointments/stats/`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // 渲染预约统计
        const totalAppointments = document.getElementById('totalAppointments');
        if (totalAppointments) totalAppointments.textContent = data.total || 0;
        
        const pendingAppointments = document.getElementById('pendingAppointments');
        if (pendingAppointments) pendingAppointments.textContent = data.pending || 0;
        
        const completedAppointments = document.getElementById('completedAppointments');
        if (completedAppointments) completedAppointments.textContent = data.completed || 0;
        
        const cancelledAppointments = document.getElementById('cancelledAppointments');
        if (cancelledAppointments) cancelledAppointments.textContent = data.cancelled || 0;
        
        // 加载最近预约
        loadRecentAppointments();
    })
    .catch(error => {
        console.error('加载预约统计失败:', error);
    });
}

// 加载最近预约
function loadRecentAppointments() {
    fetch(`${API_BASE_URL}/appointments/recent/`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        appointments = data.results || [];
        renderRecentAppointments(appointments.slice(0, 3)); // 只显示最近3条
    })
    .catch(error => {
        console.error('加载最近预约失败:', error);
    });
}

// 渲染最近预约
function renderRecentAppointments(recentAppointments) {
    const container = document.getElementById('recentAppointments');
    if (!container) return;
    
    if (recentAppointments.length === 0) {
        container.innerHTML = '<p class="no-data">暂无预约记录</p>';
        return;
    }
    
    const appointmentsHTML = recentAppointments.map(appointment => {
        const statusClass = getStatusClass(appointment.status);
        const statusText = getStatusText(appointment.status);
        
        return `
            <div class="appointment-item">
                <div class="appointment-info">
                    <div class="appointment-doctor">${appointment.doctor_name}</div>
                    <div class="appointment-hospital">${appointment.hospital_name}</div>
                    <div class="appointment-time">${formatDateTime(appointment.appointment_time)}</div>
                </div>
                <div class="appointment-status">
                    <span class="status ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = appointmentsHTML;
}

// 加载收藏统计
function loadFavoriteStats() {
    fetch(`${API_BASE_URL}/favorites/stats/`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // 渲染收藏统计
        const totalFavorites = document.getElementById('totalFavorites');
        if (totalFavorites) totalFavorites.textContent = data.total || 0;
        
        // 加载最近收藏
        loadRecentFavorites();
    })
    .catch(error => {
        console.error('加载收藏统计失败:', error);
    });
}

// 加载最近收藏
function loadRecentFavorites() {
    fetch(`${API_BASE_URL}/favorites/recent/`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        favorites = data.results || [];
        renderRecentFavorites(favorites.slice(0, 3)); // 只显示最近3条
    })
    .catch(error => {
        console.error('加载最近收藏失败:', error);
    });
}

// 渲染最近收藏
function renderRecentFavorites(recentFavorites) {
    const container = document.getElementById('recentFavorites');
    if (!container) return;
    
    if (recentFavorites.length === 0) {
        container.innerHTML = '<p class="no-data">暂无收藏医生</p>';
        return;
    }
    
    const favoritesHTML = recentFavorites.map(favorite => {
        return `
            <div class="favorite-item">
                <div class="favorite-info">
                    <div class="favorite-doctor">${favorite.doctor_name}</div>
                    <div class="favorite-hospital">${favorite.hospital_name}</div>
                    <div class="favorite-time">${formatDate(favorite.favorite_time)}</div>
                </div>
                <div class="favorite-action">
                    <button class="btn btn-outline" onclick="viewDoctorDetail(${favorite.doctor_id})">查看</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = favoritesHTML;
}

// 打开编辑个人信息模态框
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 打开修改密码模态框
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 保存个人信息
function saveProfile() {
    const first_name = document.getElementById('first_name').value.trim();
    const last_name = document.getElementById('last_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const date_of_birth = document.getElementById('date_of_birth').value;
    const gender = document.getElementById('gender').value;
    const address = document.getElementById('address').value.trim();
    const emergency_contact = document.getElementById('emergency_contact').value.trim();
    const emergency_phone = document.getElementById('emergency_phone').value.trim();
    
    // 简单验证
    if (!first_name) {
        alert('请输入姓名');
        return;
    }
    
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        alert('请输入有效的手机号码');
        return;
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('请输入有效的邮箱地址');
        return;
    }
    
    const profileData = {
        first_name,
        last_name,
        phone,
        email,
        date_of_birth,
        gender,
        address,
        emergency_contact,
        emergency_phone
    };
    
    fetch(`${API_BASE_URL}/users/profiles/me/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(profileData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('个人信息保存成功');
            closeModal('editProfileModal');
            
            // 重新加载用户信息
            loadUserInfo();
        } else {
            alert('保存失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('保存个人信息失败:', error);
        alert('保存失败，请稍后重试');
    });
}

// 修改密码
function changePassword() {
    const currentPassword = document.getElementById('old_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    // 验证
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('请填写所有密码字段');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('新密码长度不能少于6位');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
    }
    
    const passwordData = {
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
    };
    
    fetch(`${API_BASE_URL}/users/auth/change-password/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(passwordData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('密码修改成功，请重新登录');
            closeModal('changePasswordModal');
            
            // 清空表单
            document.getElementById('old_password').value = '';
            document.getElementById('new_password').value = '';
            document.getElementById('confirm_password').value = '';
            
            // 退出登录
            logout();
        } else {
            alert('修改失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('修改密码失败:', error);
        alert('修改失败，请稍后重试');
    });
}

// 查看医生详情
function viewDoctorDetail(doctorId) {
    window.location.href = `/doctors/${doctorId}/`;
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        // 清除本地存储的用户信息
        localStorage.removeItem('currentUser');
        
        // 跳转到登录页
        window.location.href = '/accounts/login/';
    }
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

// 格式化日期时间
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

// 补零
function padZero(num) {
    return num < 10 ? `0${num}` : num;
}