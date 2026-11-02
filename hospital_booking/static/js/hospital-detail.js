// 用户端医院详情页面JavaScript

// 全局变量
let hospital = null;
let departments = null;
let doctors = null;
let hospitalId = null;
let currentPage = 1;
let pageSize = 12;
let totalDoctors = 0;
let isLoading = false;

// DOM元素
const hospitalContainer = document.getElementById('hospital-container');
const departmentsContainer = document.getElementById('departments-container');
const doctorsContainer = document.getElementById('doctors-container');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const paginationContainer = document.getElementById('pagination-container');
const viewToggleBtns = document.querySelectorAll('.view-toggle');
const favoriteBtn = document.getElementById('favorite-btn');
const searchInput = document.getElementById('search-input');
const departmentFilter = document.getElementById('department-filter');
const sortSelect = document.getElementById('sort-select');

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从URL获取医院ID
    const urlParams = new URLSearchParams(window.location.search);
    hospitalId = urlParams.get('id');
    
    if (!hospitalId) {
        showError('未指定医院ID');
        return;
    }
    
    // 初始化页面
    initPage();
});

// 初始化页面
async function initPage() {
    showLoading(true);
    
    try {
        // 并行加载医院信息、科室和医生数据
        await Promise.all([
            loadHospital(),
            loadDepartments(),
            loadDoctors()
        ]);
        
        // 渲染医院信息
        renderHospital();
        
        // 渲染科室列表
        renderDepartments();
        
        // 渲染医生列表
        renderDoctors();
        
        // 渲染分页
        renderPagination();
        
        // 初始化事件监听器
        initEventListeners();
        
        // 检查收藏状态
        checkFavoriteStatus();
        
        showLoading(false);
    } catch (error) {
        console.error('页面初始化失败:', error);
        showError('加载医院详情失败，请刷新页面重试');
        showLoading(false);
    }
}

// 加载医院信息
async function loadHospital() {
    try {
        const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/`);
        if (!response.ok) {
            throw new Error('获取医院信息失败');
        }
        
        hospital = await response.json();
    } catch (error) {
        console.error('加载医院信息失败:', error);
        throw error;
    }
}

// 加载科室列表
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}/departments/?hospital=${hospitalId}`);
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

// 加载医生列表
async function loadDoctors(page = 1, department = '', search = '', sort = '') {
    try {
        isLoading = true;
        showDoctorsLoading(true);
        
        // 构建查询参数
        let queryParams = `?hospital=${hospitalId}&page=${page}&page_size=${pageSize}`;
        
        if (department) {
            queryParams += `&department=${department}`;
        }
        
        if (search) {
            queryParams += `&search=${encodeURIComponent(search)}`;
        }
        
        if (sort) {
            queryParams += `&ordering=${sort}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/doctors/${queryParams}`);
        if (!response.ok) {
            throw new Error('获取医生列表失败');
        }
        
        const data = await response.json();
        doctors = data.results || [];
        totalDoctors = data.count || 0;
        currentPage = page;
        
        isLoading = false;
        showDoctorsLoading(false);
    } catch (error) {
        console.error('加载医生列表失败:', error);
        isLoading = false;
        showDoctorsLoading(false);
        throw error;
    }
}

// 渲染医院信息
function renderHospital() {
    if (!hospitalContainer || !hospital) return;
    
    const hospitalHtml = `
        <div class="hospital-detail">
            <div class="hospital-header">
                <div class="hospital-avatar">
                    <img src="${hospital.image || '/static/images/default-hospital.png'}" alt="${hospital.name}">
                </div>
                <div class="hospital-info">
                    <h1 class="hospital-name">${hospital.name}</h1>
                    <div class="hospital-meta">
                        <div class="hospital-level">${hospital.level || '未知等级'}</div>
                        <div class="hospital-type">${hospital.type || '综合医院'}</div>
                    </div>
                    <div class="hospital-rating">
                        <div class="stars">
                            ${generateStars(hospital.average_rating || 0)}
                        </div>
                        <span class="rating-score">${hospital.average_rating?.toFixed(1) || '0.0'}</span>
                        <span class="rating-count">(${hospital.review_count || 0}条评价)</span>
                    </div>
                    <div class="hospital-actions">
                        <button id="favorite-btn" class="favorite-btn">
                            <i class="icon">❤️</i>
                            <span class="text">收藏</span>
                        </button>
                        <button id="share-btn" class="share-btn">
                            <i class="icon">📤</i>
                            <span class="text">分享</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="hospital-details">
                <div class="detail-section">
                    <h3>医院简介</h3>
                    <div class="hospital-description">
                        ${hospital.description || '暂无医院简介'}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>基本信息</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <i class="icon">📍</i>
                            <span class="label">地址：</span>
                            <span class="value">${hospital.address || '暂无地址'}</span>
                        </div>
                        <div class="info-item">
                            <i class="icon">📞</i>
                            <span class="label">电话：</span>
                            <span class="value">${hospital.phone || '暂无电话'}</span>
                        </div>
                        <div class="info-item">
                            <i class="icon">⏰</i>
                            <span class="label">工作时间：</span>
                            <span class="value">${hospital.working_hours || '暂无工作时间'}</span>
                        </div>
                        <div class="info-item">
                            <i class="icon">🌐</i>
                            <span class="label">官网：</span>
                            <span class="value">
                                ${hospital.website ? `<a href="${hospital.website}" target="_blank">${hospital.website}</a>` : '暂无官网'}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${hospital.features ? `
                    <div class="detail-section">
                        <h3>医院特色</h3>
                        <div class="features-list">
                            ${hospital.features.split(',').map(feature => 
                                `<span class="feature-tag">${feature.trim()}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${hospital.equipment ? `
                    <div class="detail-section">
                        <h3>医疗设备</h3>
                        <div class="equipment-content">
                            ${hospital.equipment}
                        </div>
                    </div>
                ` : ''}
                
                <div class="detail-section">
                    <h3>医院位置</h3>
                    <div class="map-container" id="map-container">
                        <div class="map-placeholder">
                            <p>地图加载中...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    hospitalContainer.innerHTML = hospitalHtml;
    
    // 初始化地图
    initMap();
}

// 渲染科室列表
function renderDepartments() {
    if (!departmentsContainer || !departments) return;
    
    const departmentsHtml = `
        <div class="departments-section">
            <h2>科室列表</h2>
            <div class="departments-grid">
                ${departments.map(dept => `
                    <div class="department-card" data-department-id="${dept.id}">
                        <div class="department-icon">
                            ${getDepartmentIcon(dept.name)}
                        </div>
                        <div class="department-info">
                            <h3 class="department-name">${dept.name}</h3>
                            <p class="department-desc">${dept.description || '暂无描述'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    departmentsContainer.innerHTML = departmentsHtml;
    
    // 添加科室点击事件
    const departmentCards = document.querySelectorAll('.department-card');
    departmentCards.forEach(card => {
        card.addEventListener('click', function() {
            const departmentId = this.dataset.departmentId;
            const departmentName = this.querySelector('.department-name').textContent;
            
            // 更新筛选器
            if (departmentFilter) {
                departmentFilter.value = departmentId;
            }
            
            // 重新加载医生列表
            loadDoctors(1, departmentId, searchInput ? searchInput.value : '', sortSelect ? sortSelect.value : '')
                .then(() => {
                    renderDoctors();
                    renderPagination();
                });
            
            // 滚动到医生列表
            if (doctorsContainer) {
                doctorsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// 渲染医生列表
function renderDoctors() {
    if (!doctorsContainer) return;
    
    if (!doctors || doctors.length === 0) {
        doctorsContainer.innerHTML = `
            <div class="no-results">
                <p>暂无医生信息</p>
            </div>
        `;
        return;
    }
    
    const doctorsHtml = `
        <div class="doctors-section">
            <div class="section-header">
                <h2>医生团队</h2>
                <div class="view-controls">
                    <div class="view-toggle">
                        <button class="view-btn active" data-view="grid">
                            <i class="icon">⊞</i>
                        </button>
                        <button class="view-btn" data-view="list">
                            <i class="icon">☰</i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="doctors-grid">
                ${doctors.map(doctor => `
                    <div class="doctor-card" data-doctor-id="${doctor.id}">
                        <div class="doctor-avatar">
                            <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
                        </div>
                        <div class="doctor-info">
                            <h3 class="doctor-name">${doctor.name}</h3>
                            <div class="doctor-title">${doctor.title || '医生'}</div>
                            <div class="doctor-department">${doctor.department_name || '未知科室'}</div>
                            <div class="doctor-rating">
                                <div class="stars">
                                    ${generateStars(doctor.average_rating || 0)}
                                </div>
                                <span class="rating-score">${doctor.average_rating?.toFixed(1) || '0.0'}</span>
                                <span class="rating-count">(${doctor.review_count || 0})</span>
                            </div>
                            ${doctor.specialties ? `
                                <div class="doctor-specialties">
                                    ${doctor.specialties.substring(0, 50)}${doctor.specialties.length > 50 ? '...' : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="doctor-actions">
                            <a href="/doctor-detail.html?id=${doctor.id}" class="view-btn">查看详情</a>
                            <a href="/appointment-booking.html?doctor=${doctor.id}" class="book-btn">预约挂号</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    doctorsContainer.innerHTML = doctorsHtml;
    
    // 初始化视图切换
    initViewToggle();
    
    // 初始化医生卡片事件
    initDoctorCardEvents();
}

// 渲染分页
function renderPagination() {
    if (!paginationContainer) return;
    
    if (totalDoctors <= pageSize) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(totalDoctors / pageSize);
    let paginationHtml = '<div class="pagination">';
    
    // 上一页按钮
    paginationHtml += `
        <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                data-page="${currentPage - 1}" 
                ${currentPage === 1 ? 'disabled' : ''}>
            上一页
        </button>
    `;
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHtml += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                    data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="page-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // 下一页按钮
    paginationHtml += `
        <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                data-page="${currentPage + 1}" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            下一页
        </button>
    `;
    
    paginationHtml += '</div>';
    paginationContainer.innerHTML = paginationHtml;
    
    // 添加分页事件
    const pageBtns = paginationContainer.querySelectorAll('.page-btn:not(.disabled)');
    pageBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page !== currentPage) {
                const department = departmentFilter ? departmentFilter.value : '';
                const search = searchInput ? searchInput.value : '';
                const sort = sortSelect ? sortSelect.value : '';
                
                loadDoctors(page, department, search, sort)
                    .then(() => {
                        renderDoctors();
                        renderPagination();
                        
                        // 滚动到医生列表顶部
                        if (doctorsContainer) {
                            doctorsContainer.scrollIntoView({ behavior: 'smooth' });
                        }
                    });
            }
        });
    });
}

// 初始化事件监听器
function initEventListeners() {
    // 收藏按钮
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }
    
    // 分享按钮
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareHospital);
    }
    
    // 搜索输入框
    if (searchInput) {
        // 使用防抖处理搜索
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const department = departmentFilter ? departmentFilter.value : '';
                const search = this.value;
                const sort = sortSelect ? sortSelect.value : '';
                
                loadDoctors(1, department, search, sort)
                    .then(() => {
                        renderDoctors();
                        renderPagination();
                    });
            }, 500);
        });
    }
    
    // 科室筛选
    if (departmentFilter) {
        departmentFilter.addEventListener('change', function() {
            const department = this.value;
            const search = searchInput ? searchInput.value : '';
            const sort = sortSelect ? sortSelect.value : '';
            
            loadDoctors(1, department, search, sort)
                .then(() => {
                    renderDoctors();
                    renderPagination();
                });
        });
    }
    
    // 排序选择
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const sort = this.value;
            const department = departmentFilter ? departmentFilter.value : '';
            const search = searchInput ? searchInput.value : '';
            
            loadDoctors(1, department, search, sort)
                .then(() => {
                    renderDoctors();
                    renderPagination();
                });
        });
    }
}

// 初始化视图切换
function initViewToggle() {
    const viewBtns = document.querySelectorAll('.view-btn');
    const doctorsGrid = document.querySelector('.doctors-grid');
    
    if (!viewBtns.length || !doctorsGrid) return;
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新按钮状态
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 更新视图
            const view = this.dataset.view;
            doctorsGrid.className = view === 'list' ? 'doctors-list' : 'doctors-grid';
        });
    });
}

// 初始化医生卡片事件
function initDoctorCardEvents() {
    const doctorCards = document.querySelectorAll('.doctor-card');
    
    doctorCards.forEach(card => {
        // 添加点击事件，点击卡片跳转到医生详情
        card.addEventListener('click', function(e) {
            // 如果点击的是按钮，不触发卡片点击事件
            if (e.target.closest('.doctor-actions')) {
                return;
            }
            
            const doctorId = this.dataset.doctorId;
            window.location.href = `/doctor-detail.html?id=${doctorId}`;
        });
    });
}

// 初始化地图
function initMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer || !hospital) return;
    
    // 这里可以集成地图API，如百度地图、高德地图等
    // 由于这是一个示例，我们只显示一个简单的地图占位符
    
    const mapHtml = `
        <div class="map-placeholder">
            <p>医院地址：${hospital.address || '暂无地址'}</p>
            <button class="view-map-btn" id="view-map-btn">查看地图</button>
        </div>
    `;
    
    mapContainer.innerHTML = mapHtml;
    
    // 查看地图按钮事件
    const viewMapBtn = document.getElementById('view-map-btn');
    if (viewMapBtn) {
        viewMapBtn.addEventListener('click', function() {
            // 在实际应用中，这里可以打开地图应用或显示详细地图
            if (hospital.address) {
                // 打开地图应用
                const mapUrl = `https://api.map.baidu.com/staticimage/v2?center=${encodeURIComponent(hospital.address)}&width=600&height=300&zoom=15`;
                window.open(mapUrl, '_blank');
            } else {
                showToast('暂无医院地址信息', 'warning');
            }
        });
    }
}

// 检查收藏状态
async function checkFavoriteStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/favorites/check/?hospital=${hospitalId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const favoriteBtn = document.getElementById('favorite-btn');
            
            if (data.is_favorite && favoriteBtn) {
                favoriteBtn.classList.add('favorited');
                favoriteBtn.querySelector('.text').textContent = '已收藏';
            }
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
        const isFavorited = favoriteBtn.classList.contains('favorited');
        
        let url, method;
        if (isFavorited) {
            // 取消收藏
            url = `${API_BASE_URL}/favorites/remove/`;
            method = 'DELETE';
        } else {
            // 添加收藏
            url = `${API_BASE_URL}/favorites/add/`;
            method = 'POST';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                hospital: hospitalId
            })
        });
        
        if (!response.ok) {
            throw new Error(isFavorited ? '取消收藏失败' : '收藏失败');
        }
        
        // 更新UI
        if (isFavorited) {
            favoriteBtn.classList.remove('favorited');
            favoriteBtn.querySelector('.text').textContent = '收藏';
            showToast('已取消收藏', 'success');
        } else {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.querySelector('.text').textContent = '已收藏';
            showToast('收藏成功', 'success');
        }
    } catch (error) {
        console.error('切换收藏状态失败:', error);
        showToast(error.message || '操作失败，请稍后重试', 'error');
    }
}

// 分享医院
function shareHospital() {
    if (!hospital) return;
    
    // 生成分享链接
    const shareUrl = window.location.href;
    const shareText = `${hospital.name} - ${hospital.level || '医院'} - ${hospital.address || ''}`;
    
    // 检查是否支持Web Share API
    if (navigator.share) {
        navigator.share({
            title: hospital.name,
            text: shareText,
            url: shareUrl
        })
        .then(() => {
            showToast('分享成功', 'success');
        })
        .catch((error) => {
            console.error('分享失败:', error);
            // 降级到复制链接
            copyShareLink(shareUrl);
        });
    } else {
        // 不支持Web Share API，复制链接
        copyShareLink(shareUrl);
    }
}

// 复制分享链接
function copyShareLink(url) {
    // 创建临时输入框
    const tempInput = document.createElement('input');
    tempInput.value = url;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        if (successful) {
            showToast('链接已复制，快去分享吧', 'success');
        } else {
            showToast('复制链接失败，请手动复制', 'error');
        }
    } catch (err) {
        document.body.removeChild(tempInput);
        showToast('复制链接失败，请手动复制', 'error');
    }
}

// 显示医生列表加载状态
function showDoctorsLoading(show) {
    if (!doctorsContainer) return;
    
    if (show) {
        doctorsContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>加载医生列表中...</p>
            </div>
        `;
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