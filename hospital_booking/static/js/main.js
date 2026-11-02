// 智能预约挂号系统 - 主JavaScript文件

// 全局变量
let currentUser = null;
let currentHospital = null;
let currentDoctor = null;
let userLocation = null;
let mapInstance = null;
let markers = [];

// API配置
const API_BASE_URL = 'http://localhost:8000/api';
const AMAP_API_KEY = 'your_amap_api_key'; // 需要替换为实际的高德API密钥

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 检查用户登录状态
    checkLoginStatus();
    
    // 获取用户位置
    getUserLocation();
    
    // 获取天气信息
    getWeatherInfo();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载首页数据
    if (isUserPortal()) {
        loadUserDashboard();
    } else {
        loadAdminDashboard();
    }
}

// 检查是否为用户门户
function isUserPortal() {
    return !window.location.pathname.includes('admin');
}

// 检查登录状态
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserInterface();
    }
}

// 更新用户界面
function updateUserInterface() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (currentUser) {
        if (userAvatar) userAvatar.src = currentUser.avatar || '/static/images/default-avatar.png';
        if (userName) userName.textContent = currentUser.name || '用户';
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// 获取用户位置
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // 如果在医院列表页面，更新地图
                if (document.getElementById('mapContainer')) {
                    initMap();
                    loadNearbyHospitals();
                }
            },
            error => {
                console.error('获取位置失败:', error);
                // 使用默认位置（贵阳市中心）
                userLocation = { lat: 26.6470, lng: 106.6302 };
            }
        );
    } else {
        console.log('浏览器不支持地理定位');
        // 使用默认位置
        userLocation = { lat: 26.6470, lng: 106.6302 };
    }
}

// 获取天气信息
function getWeatherInfo() {
    const weatherWidget = document.getElementById('weatherWidget');
    if (!weatherWidget) return;
    
    // 使用高德天气API
    fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=${AMAP_API_KEY}&city=520100&extensions=base`)
        .then(response => response.json())
        .then(data => {
            if (data.status === '1' && data.lives && data.lives.length > 0) {
                const weather = data.lives[0];
                weatherWidget.innerHTML = `
                    <div class="weather-info">
                        <div class="weather-icon">☀️</div>
                        <div class="weather-details">
                            <div class="temperature">${weather.temperature}°C</div>
                            <div class="condition">${weather.weather}</div>
                            <div class="location">贵阳</div>
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('获取天气失败:', error);
            weatherWidget.innerHTML = `
                <div class="weather-info">
                    <div class="weather-icon">☀️</div>
                    <div class="weather-details">
                        <div class="temperature">25°C</div>
                        <div class="condition">晴</div>
                        <div class="location">贵阳</div>
                    </div>
                </div>
            `;
        });
}

// 初始化事件监听器
function initEventListeners() {
    // 门户切换
    const portalSwitch = document.getElementById('portalSwitch');
    if (portalSwitch) {
        portalSwitch.addEventListener('change', function() {
            const url = this.checked ? '/admin' : '/';
            window.location.href = url;
        });
    }
    
    // 登录按钮
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }
    
    // 登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // 筛选功能
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            toggleFilter(this);
            applyFilters();
        });
    });
}

// 加载用户仪表板
function loadUserDashboard() {
    loadFeaturedHospitals();
    loadNearbyHospitals();
    loadPopularDoctors();
    loadUserAppointments();
}

// 加载管理仪表板
function loadAdminDashboard() {
    loadAdminStats();
    loadRecentAppointments();
}

// 加载特色医院
function loadFeaturedHospitals() {
    const container = document.getElementById('featuredHospitals');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/hospitals/featured/`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(hospital => {
                    const hospitalCard = createHospitalCard(hospital);
                    container.appendChild(hospitalCard);
                });
            } else {
                container.innerHTML = '<p class="no-data">暂无特色医院</p>';
            }
        })
        .catch(error => {
            console.error('加载特色医院失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 加载附近医院
function loadNearbyHospitals() {
    if (!userLocation) return;
    
    const container = document.getElementById('nearbyHospitals');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/hospitals/nearby/?lat=${userLocation.lat}&lng=${userLocation.lng}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(hospital => {
                    const hospitalCard = createHospitalCard(hospital);
                    container.appendChild(hospitalCard);
                });
                
                // 更新地图标记
                if (mapInstance) {
                    updateMapMarkers(data.results);
                }
            } else {
                container.innerHTML = '<p class="no-data">附近暂无医院</p>';
            }
        })
        .catch(error => {
            console.error('加载附近医院失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 加载热门医生
function loadPopularDoctors() {
    const container = document.getElementById('popularDoctors');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/doctors/popular/`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(doctor => {
                    const doctorCard = createDoctorCard(doctor);
                    container.appendChild(doctorCard);
                });
            } else {
                container.innerHTML = '<p class="no-data">暂无热门医生</p>';
            }
        })
        .catch(error => {
            console.error('加载热门医生失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 加载用户预约
function loadUserAppointments() {
    if (!currentUser) return;
    
    const container = document.getElementById('userAppointments');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/appointments/user/?user_id=${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(appointment => {
                    const appointmentCard = createAppointmentCard(appointment);
                    container.appendChild(appointmentCard);
                });
            } else {
                container.innerHTML = '<p class="no-data">暂无预约记录</p>';
            }
        })
        .catch(error => {
            console.error('加载预约记录失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 创建医院卡片
function createHospitalCard(hospital) {
    const card = document.createElement('div');
    card.className = 'hospital-card';
    
    const distance = hospital.distance ? `${hospital.distance.toFixed(1)}km` : '';
    const rating = hospital.rating || '暂无评分';
    
    card.innerHTML = `
        <div class="hospital-image">
            <img src="${hospital.image || '/static/images/default-hospital.jpg'}" alt="${hospital.name}">
            ${hospital.is_featured ? '<span class="featured-badge">特色</span>' : ''}
        </div>
        <div class="hospital-info">
            <h3 class="hospital-name">${hospital.name}</h3>
            <div class="hospital-meta">
                <span class="hospital-level">${hospital.level || ''}</span>
                <span class="hospital-rating">⭐ ${rating}</span>
                ${distance ? `<span class="hospital-distance">📍 ${distance}</span>` : ''}
            </div>
            <p class="hospital-address">${hospital.address}</p>
            <div class="hospital-tags">
                ${hospital.tags ? hospital.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
            </div>
        </div>
        <div class="hospital-actions">
            <button class="btn btn-outline" onclick="viewHospital(${hospital.id})">查看详情</button>
            <button class="btn btn-primary" onclick="bookHospital(${hospital.id})">预约挂号</button>
        </div>
    `;
    
    return card;
}

// 创建医生卡片
function createDoctorCard(doctor) {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    
    const rating = doctor.rating || '暂无评分';
    
    card.innerHTML = `
        <div class="doctor-avatar">
            <img src="${doctor.avatar || '/static/images/default-doctor.jpg'}" alt="${doctor.name}">
        </div>
        <div class="doctor-info">
            <h3 class="doctor-name">${doctor.name}</h3>
            <p class="doctor-title">${doctor.title}</p>
            <p class="doctor-hospital">${doctor.hospital_name}</p>
            <div class="doctor-meta">
                <span class="doctor-rating">⭐ ${rating}</span>
                <span class="doctor-experience">从业${doctor.experience || 0}年</span>
            </div>
            <div class="doctor-specialties">
                ${doctor.specialties ? doctor.specialties.map(specialty => `<span class="tag">${specialty}</span>`).join('') : ''}
            </div>
        </div>
        <div class="doctor-actions">
            <button class="btn btn-outline" onclick="viewDoctor(${doctor.id})">查看详情</button>
            <button class="btn btn-primary" onclick="bookDoctor(${doctor.id})">预约挂号</button>
        </div>
    `;
    
    return card;
}

// 创建预约卡片
function createAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    
    const statusClass = getStatusClass(appointment.status);
    const statusText = getStatusText(appointment.status);
    
    card.innerHTML = `
        <div class="appointment-header">
            <h3 class="appointment-hospital">${appointment.hospital_name}</h3>
            <span class="appointment-status ${statusClass}">${statusText}</span>
        </div>
        <div class="appointment-body">
            <div class="appointment-doctor">
                <img src="${appointment.doctor_avatar || '/static/images/default-doctor.jpg'}" alt="${appointment.doctor_name}">
                <div>
                    <h4>${appointment.doctor_name}</h4>
                    <p>${appointment.doctor_title}</p>
                </div>
            </div>
            <div class="appointment-time">
                <p>📅 ${appointment.date}</p>
                <p>⏰ ${appointment.time_slot}</p>
            </div>
        </div>
        <div class="appointment-actions">
            ${appointment.status === 'confirmed' ? 
                `<button class="btn btn-outline" onclick="cancelAppointment(${appointment.id})">取消预约</button>` : 
                appointment.status === 'completed' ? 
                `<button class="btn btn-primary" onclick="reviewAppointment(${appointment.id})">评价</button>` : 
                ''
            }
        </div>
    `;
    
    return card;
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

// 显示加载状态
function showLoading(container) {
    container.innerHTML = '<div class="loading-spinner"></div>';
}

// 搜索处理
function handleSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) return;
    
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('hospitals')) {
        searchHospitals(query);
    } else if (currentPath.includes('doctors')) {
        searchDoctors(query);
    }
}

// 搜索医院
function searchHospitals(query) {
    const container = document.getElementById('hospitalsList');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/hospitals/search/?q=${query}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(hospital => {
                    const hospitalCard = createHospitalCard(hospital);
                    container.appendChild(hospitalCard);
                });
            } else {
                container.innerHTML = '<p class="no-data">未找到匹配的医院</p>';
            }
        })
        .catch(error => {
            console.error('搜索医院失败:', error);
            container.innerHTML = '<p class="error">搜索失败，请稍后重试</p>';
        });
}

// 搜索医生
function searchDoctors(query) {
    const container = document.getElementById('doctorsList');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/doctors/search/?q=${query}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(doctor => {
                    const doctorCard = createDoctorCard(doctor);
                    container.appendChild(doctorCard);
                });
            } else {
                container.innerHTML = '<p class="no-data">未找到匹配的医生</p>';
            }
        })
        .catch(error => {
            console.error('搜索医生失败:', error);
            container.innerHTML = '<p class="error">搜索失败，请稍后重试</p>';
        });
}

// 切换筛选器
function toggleFilter(button) {
    button.classList.toggle('active');
}

// 应用筛选器
function applyFilters() {
    // 这里实现筛选逻辑
    console.log('应用筛选器');
}

// 初始化地图
function initMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer || !userLocation) return;
    
    // 这里使用高德地图API初始化地图
    // 由于是示例，这里只做占位
    mapContainer.innerHTML = `
        <div class="map-placeholder">
            <p>地图加载中...</p>
            <p>当前用户位置: ${userLocation.lat}, ${userLocation.lng}</p>
        </div>
    `;
}

// 更新地图标记
function updateMapMarkers(hospitals) {
    // 这里实现地图标记更新逻辑
    console.log('更新地图标记:', hospitals);
}

// 查看医院详情
function viewHospital(hospitalId) {
    window.location.href = `/hospital/${hospitalId}`;
}

// 查看医生详情
function viewDoctor(doctorId) {
    window.location.href = `/doctor/${doctorId}`;
}

// 医院预约
function bookHospital(hospitalId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    window.location.href = `/hospital/${hospitalId}/booking`;
}

// 医生预约
function bookDoctor(doctorId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    window.location.href = `/doctor/${doctorId}/booking`;
}

// 取消预约
function cancelAppointment(appointmentId) {
    if (!confirm('确定要取消这个预约吗？')) return;
    
    fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('预约已取消');
            loadUserAppointments();
        } else {
            alert('取消失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('取消预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 评价预约
function reviewAppointment(appointmentId) {
    window.location.href = `/appointment-detail/${appointmentId}/`;
}

// 显示登录模态框
function showLoginModal() {
    // 这里实现登录模态框显示逻辑
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>用户登录</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">用户名</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">密码</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary">登录</button>
            </form>
            <p class="register-link">还没有账号？<a href="#" onclick="showRegisterModal()">立即注册</a></p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭模态框
    modal.querySelector('.close').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // 登录表单提交
    modal.querySelector('#loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin({
            username: modal.querySelector('#username').value,
            password: modal.querySelector('#password').value
        });
    });
}

// 处理登录
function handleLogin(credentials) {
    fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentUser = data.user;
            currentUser.token = data.token;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // 关闭登录模态框
            const modal = document.querySelector('.modal');
            if (modal) {
                document.body.removeChild(modal);
            }
            
            // 更新界面
            updateUserInterface();
            
            // 刷新当前页面数据
            if (isUserPortal()) {
                loadUserDashboard();
            } else {
                loadAdminDashboard();
            }
        } else {
            alert('登录失败: ' + (data.message || '用户名或密码错误'));
        }
    })
    .catch(error => {
        console.error('登录失败:', error);
        alert('登录失败，请稍后重试');
    });
}

// 登出
function logout() {
    if (!confirm('确定要退出登录吗？')) return;
    
    localStorage.removeItem('currentUser');
    currentUser = null;
    updateUserInterface();
    
    // 刷新当前页面数据
    if (isUserPortal()) {
        loadUserDashboard();
    } else {
        loadAdminDashboard();
    }
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

// 管理端功能
function loadAdminStats() {
    const statsContainer = document.getElementById('adminStats');
    if (!statsContainer) return;
    
    // 这里加载管理端统计数据
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>总医院数</h3>
                <p class="stat-number">25</p>
            </div>
            <div class="stat-card">
                <h3>总医生数</h3>
                <p class="stat-number">150</p>
            </div>
            <div class="stat-card">
                <h3>今日预约</h3>
                <p class="stat-number">42</p>
            </div>
            <div class="stat-card">
                <h3>待处理预约</h3>
                <p class="stat-number">8</p>
            </div>
        </div>
    `;
}

function loadRecentAppointments() {
    const container = document.getElementById('recentAppointments');
    if (!container) return;
    
    // 这里加载最近预约数据
    showLoading(container);
    
    fetch(`${API_BASE_URL}/appointments/recent/`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                const table = document.createElement('table');
                table.className = 'data-table';
                
                // 表头
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>预约编号</th>
                        <th>患者姓名</th>
                        <th>医院</th>
                        <th>医生</th>
                        <th>预约时间</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                `;
                table.appendChild(thead);
                
                // 表体
                const tbody = document.createElement('tbody');
                data.results.forEach(appointment => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${appointment.id}</td>
                        <td>${appointment.patient_name}</td>
                        <td>${appointment.hospital_name}</td>
                        <td>${appointment.doctor_name}</td>
                        <td>${appointment.date} ${appointment.time_slot}</td>
                        <td><span class="appointment-status ${getStatusClass(appointment.status)}">${getStatusText(appointment.status)}</span></td>
                        <td>
                            ${appointment.status === 'pending' ? 
                                `<button class="btn btn-sm btn-primary" onclick="confirmAppointment(${appointment.id})">确认</button>` : 
                                ''
                            }
                            <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetail(${appointment.id})">详情</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
                
                container.appendChild(table);
            } else {
                container.innerHTML = '<p class="no-data">暂无预约记录</p>';
            }
        })
        .catch(error => {
            console.error('加载预约记录失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 确认预约
function confirmAppointment(appointmentId) {
    if (!confirm('确定要确认这个预约吗？')) return;
    
    fetch(`${API_BASE_URL}/appointments/${appointmentId}/confirm/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('预约已确认');
            loadRecentAppointments();
        } else {
            alert('确认失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('确认预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 查看预约详情
function viewAppointmentDetail(appointmentId) {
    window.location.href = `/admin/appointment/${appointmentId}`;
}