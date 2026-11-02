// 用户端医生列表页面JavaScript

// 全局变量
let doctors = [];
let hospitals = [];
let departments = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 12;
let currentSort = 'default';
let currentFilters = {
    hospital: '',
    department: '',
    title: '',
    keyword: ''
};
let viewMode = 'grid'; // grid or list
let hospitalId = null;

// DOM元素
const doctorsContainer = document.getElementById('doctors-container');
const paginationContainer = document.getElementById('pagination');
const filtersContainer = document.getElementById('filters-container');
const viewToggleContainer = document.getElementById('view-toggle');
const sortContainer = document.getElementById('sort-container');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const noResultsElement = document.getElementById('no-results');

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从URL获取医院ID
    const urlParams = new URLSearchParams(window.location.search);
    hospitalId = urlParams.get('hospital');
    
    // 初始化页面
    initPage();
});

// 初始化页面
async function initPage() {
    showLoading(true);
    
    try {
        // 并行加载数据
        await Promise.all([
            loadHospitals(),
            loadDepartments(),
            loadDoctors()
        ]);
        
        // 渲染筛选器
        renderFilters();
        
        // 渲染排序选项
        renderSortOptions();
        
        // 渲染视图切换
        renderViewToggle();
        
        // 渲染医生列表
        renderDoctors();
        
        // 渲染分页
        renderPagination();
        
        // 初始化事件监听器
        initEventListeners();
        
        showLoading(false);
    } catch (error) {
        console.error('页面初始化失败:', error);
        showError('加载医生列表失败，请刷新页面重试');
        showLoading(false);
    }
}

// 加载医院列表
async function loadHospitals() {
    try {
        const response = await fetch(`${API_BASE_URL}/hospitals/`);
        if (!response.ok) {
            throw new Error('获取医院列表失败');
        }
        
        const data = await response.json();
        hospitals = data.results || data;
    } catch (error) {
        console.error('加载医院列表失败:', error);
        throw error;
    }
}

// 加载科室列表
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}/departments/`);
        if (!response.ok) {
            throw new Error('获取科室列表失败');
        }
        
        const data = await response.json();
        departments = data.results || data;
    } catch (error) {
        console.error('加载科室列表失败:', error);
        throw error;
    }
}

// 加载医生列表
async function loadDoctors() {
    try {
        // 构建查询参数
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('page_size', pageSize);
        
        if (hospitalId) {
            params.append('hospital', hospitalId);
            currentFilters.hospital = hospitalId;
        }
        
        if (currentFilters.hospital) {
            params.append('hospital', currentFilters.hospital);
        }
        
        if (currentFilters.department) {
            params.append('department', currentFilters.department);
        }
        
        if (currentFilters.title) {
            params.append('title', currentFilters.title);
        }
        
        if (currentFilters.keyword) {
            params.append('search', currentFilters.keyword);
        }
        
        // 添加排序参数
        if (currentSort !== 'default') {
            params.append('ordering', getSortParam(currentSort));
        }
        
        const response = await fetch(`${API_BASE_URL}/doctors/?${params.toString()}`);
        if (!response.ok) {
            throw new Error('获取医生列表失败');
        }
        
        const data = await response.json();
        doctors = data.results || [];
        totalPages = Math.ceil(data.count / pageSize) || 1;
    } catch (error) {
        console.error('加载医生列表失败:', error);
        throw error;
    }
}

// 渲染筛选器
function renderFilters() {
    if (!filtersContainer) return;
    
    // 构建医院选项
    let hospitalOptions = '<option value="">全部医院</option>';
    hospitals.forEach(hospital => {
        const selected = currentFilters.hospital === hospital.id.toString() ? 'selected' : '';
        hospitalOptions += `<option value="${hospital.id}" ${selected}>${hospital.name}</option>`;
    });
    
    // 构建科室选项
    let departmentOptions = '<option value="">全部科室</option>';
    departments.forEach(department => {
        const selected = currentFilters.department === department.id.toString() ? 'selected' : '';
        departmentOptions += `<option value="${department.id}" ${selected}>${department.name}</option>`;
    });
    
    // 构建职称选项
    const titleOptions = `
        <option value="">全部职称</option>
        <option value="主任医师" ${currentFilters.title === '主任医师' ? 'selected' : ''}>主任医师</option>
        <option value="副主任医师" ${currentFilters.title === '副主任医师' ? 'selected' : ''}>副主任医师</option>
        <option value="主治医师" ${currentFilters.title === '主治医师' ? 'selected' : ''}>主治医师</option>
        <option value="住院医师" ${currentFilters.title === '住院医师' ? 'selected' : ''}>住院医师</option>
    `;
    
    const filtersHtml = `
        <div class="filters">
            <div class="filter-group">
                <label for="hospital-filter">医院</label>
                <select id="hospital-filter">
                    ${hospitalOptions}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="department-filter">科室</label>
                <select id="department-filter">
                    ${departmentOptions}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="title-filter">职称</label>
                <select id="title-filter">
                    ${titleOptions}
                </select>
            </div>
            
            <div class="filter-group search-group">
                <label for="keyword-filter">搜索</label>
                <div class="search-input">
                    <input type="text" id="keyword-filter" placeholder="医生姓名或专长" value="${currentFilters.keyword}">
                    <button id="search-btn" class="search-btn">
                        <i class="icon">🔍</i>
                    </button>
                </div>
            </div>
            
            <div class="filter-actions">
                <button id="reset-filters" class="reset-btn">重置</button>
            </div>
        </div>
    `;
    
    filtersContainer.innerHTML = filtersHtml;
}

// 渲染排序选项
function renderSortOptions() {
    if (!sortContainer) return;
    
    const sortOptions = [
        { value: 'default', label: '默认排序' },
        { value: 'rating_desc', label: '评分从高到低' },
        { value: 'rating_asc', label: '评分从低到高' },
        { value: 'review_count_desc', label: '评价数量从多到少' },
        { value: 'experience_desc', label: '从业年限从长到短' },
        { value: 'experience_asc', label: '从业年限从短到长' }
    ];
    
    let sortHtml = '<div class="sort-options">';
    sortOptions.forEach(option => {
        const active = currentSort === option.value ? 'active' : '';
        sortHtml += `<button class="sort-option ${active}" data-sort="${option.value}">${option.label}</button>`;
    });
    sortHtml += '</div>';
    
    sortContainer.innerHTML = sortHtml;
}

// 渲染视图切换
function renderViewToggle() {
    if (!viewToggleContainer) return;
    
    const viewToggleHtml = `
        <div class="view-toggle">
            <button class="view-btn ${viewMode === 'grid' ? 'active' : ''}" data-view="grid">
                <i class="icon">⊞</i> 网格
            </button>
            <button class="view-btn ${viewMode === 'list' ? 'active' : ''}" data-view="list">
                <i class="icon">☰</i> 列表
            </button>
        </div>
    `;
    
    viewToggleContainer.innerHTML = viewToggleHtml;
}

// 渲染医生列表
function renderDoctors() {
    if (!doctorsContainer) return;
    
    if (doctors.length === 0) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    let doctorsHtml = `<div class="doctors-container view-${viewMode}">`;
    
    doctors.forEach(doctor => {
        const hospital = hospitals.find(h => h.id === doctor.hospital);
        const department = departments.find(d => d.id === doctor.department);
        
        if (viewMode === 'grid') {
            doctorsHtml += renderDoctorCard(doctor, hospital, department);
        } else {
            doctorsHtml += renderDoctorListItem(doctor, hospital, department);
        }
    });
    
    doctorsHtml += '</div>';
    
    doctorsContainer.innerHTML = doctorsHtml;
    
    // 添加收藏按钮事件
    addFavoriteButtonEvents();
}

// 渲染医生卡片（网格视图）
function renderDoctorCard(doctor, hospital, department) {
    const isFavorite = checkIfFavorite(doctor.id);
    const favoriteClass = isFavorite ? 'favorited' : '';
    const favoriteText = isFavorite ? '已收藏' : '收藏';
    
    return `
        <div class="doctor-card" data-doctor-id="${doctor.id}">
            <div class="doctor-avatar">
                <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
            </div>
            <div class="doctor-info">
                <h3 class="doctor-name">${doctor.name}</h3>
                <div class="doctor-title">${doctor.title || '医生'}</div>
                <div class="doctor-hospital">${hospital ? hospital.name : '未知医院'}</div>
                <div class="doctor-department">${department ? department.name : '未知科室'}</div>
                <div class="doctor-rating">
                    <div class="stars">
                        ${generateStars(doctor.average_rating || 0)}
                    </div>
                    <span class="rating-score">${doctor.average_rating?.toFixed(1) || '0.0'}</span>
                    <span class="rating-count">(${doctor.review_count || 0}条评价)</span>
                </div>
                <div class="doctor-specialty">
                    ${doctor.specialties ? doctor.specialties.substring(0, 50) + (doctor.specialties.length > 50 ? '...' : '') : '暂无专长介绍'}
                </div>
            </div>
            <div class="doctor-actions">
                <button class="favorite-btn ${favoriteClass}" data-doctor-id="${doctor.id}">
                    <i class="icon">${isFavorite ? '❤️' : '🤍'}</i>
                    <span>${favoriteText}</span>
                </button>
                <a href="/appointment-search/?doctor=${doctor.id}" class="view-doctor-btn">查看详情</a>
                <a href="/appointment-booking/?doctor=${doctor.id}" class="book-btn">预约挂号</a>
            </div>
        </div>
    `;
}

// 渲染医生列表项（列表视图）
function renderDoctorListItem(doctor, hospital, department) {
    const isFavorite = checkIfFavorite(doctor.id);
    const favoriteClass = isFavorite ? 'favorited' : '';
    const favoriteText = isFavorite ? '已收藏' : '收藏';
    
    return `
        <div class="doctor-list-item" data-doctor-id="${doctor.id}">
            <div class="doctor-avatar">
                <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
            </div>
            <div class="doctor-info">
                <div class="doctor-header">
                    <h3 class="doctor-name">${doctor.name}</h3>
                    <div class="doctor-title">${doctor.title || '医生'}</div>
                </div>
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
                <div class="doctor-specialty">
                    ${doctor.specialties || '暂无专长介绍'}
                </div>
            </div>
            <div class="doctor-actions">
                <button class="favorite-btn ${favoriteClass}" data-doctor-id="${doctor.id}">
                    <i class="icon">${isFavorite ? '❤️' : '🤍'}</i>
                    <span>${favoriteText}</span>
                </button>
                <a href="/appointment-search/?doctor=${doctor.id}" class="view-doctor-btn">查看详情</a>
                <a href="/appointment-booking/?doctor=${doctor.id}" class="book-btn">预约挂号</a>
            </div>
        </div>
    `;
}

// 渲染分页
function renderPagination() {
    if (!paginationContainer || totalPages <= 1) return;
    
    let paginationHtml = '<div class="pagination">';
    
    // 上一页按钮
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHtml += `<button class="pagination-btn prev-btn ${prevDisabled}" data-page="${currentPage - 1}">上一页</button>`;
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 第一页和省略号
    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // 页码
    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'active' : '';
        paginationHtml += `<button class="pagination-btn ${active}" data-page="${i}">${i}</button>`;
    }
    
    // 省略号和最后一页
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // 下一页按钮
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHtml += `<button class="pagination-btn next-btn ${nextDisabled}" data-page="${currentPage + 1}">下一页</button>`;
    
    paginationHtml += '</div>';
    
    paginationContainer.innerHTML = paginationHtml;
}

// 初始化事件监听器
function initEventListeners() {
    // 筛选器事件
    const hospitalFilter = document.getElementById('hospital-filter');
    if (hospitalFilter) {
        hospitalFilter.addEventListener('change', function() {
            currentFilters.hospital = this.value;
            currentPage = 1;
            loadAndRenderDoctors();
        });
    }
    
    const departmentFilter = document.getElementById('department-filter');
    if (departmentFilter) {
        departmentFilter.addEventListener('change', function() {
            currentFilters.department = this.value;
            currentPage = 1;
            loadAndRenderDoctors();
        });
    }
    
    const titleFilter = document.getElementById('title-filter');
    if (titleFilter) {
        titleFilter.addEventListener('change', function() {
            currentFilters.title = this.value;
            currentPage = 1;
            loadAndRenderDoctors();
        });
    }
    
    // 搜索事件
    const keywordFilter = document.getElementById('keyword-filter');
    const searchBtn = document.getElementById('search-btn');
    
    if (keywordFilter) {
        keywordFilter.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                currentFilters.keyword = this.value.trim();
                currentPage = 1;
                loadAndRenderDoctors();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            currentFilters.keyword = keywordFilter.value.trim();
            currentPage = 1;
            loadAndRenderDoctors();
        });
    }
    
    // 重置筛选器
    const resetFiltersBtn = document.getElementById('reset-filters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            currentFilters = {
                hospital: hospitalId || '',
                department: '',
                title: '',
                keyword: ''
            };
            currentPage = 1;
            currentSort = 'default';
            
            renderFilters();
            renderSortOptions();
            loadAndRenderDoctors();
        });
    }
    
    // 排序事件
    const sortOptions = document.querySelectorAll('.sort-option');
    sortOptions.forEach(option => {
        option.addEventListener('click', function() {
            currentSort = this.dataset.sort;
            currentPage = 1;
            
            // 更新激活状态
            sortOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            loadAndRenderDoctors();
        });
    });
    
    // 视图切换事件
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            viewMode = this.dataset.view;
            
            // 更新激活状态
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            renderDoctors();
        });
    });
    
    // 分页事件
    const paginationBtns = document.querySelectorAll('.pagination-btn:not(.disabled)');
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currentPage = parseInt(this.dataset.page);
            loadAndRenderDoctors();
        });
    });
}

// 添加收藏按钮事件
function addFavoriteButtonEvents() {
    const favoriteBtns = document.querySelectorAll('.favorite-btn');
    favoriteBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const doctorId = this.dataset.doctorId;
            toggleFavorite(doctorId, this);
        });
    });
}

// 切换收藏状态
async function toggleFavorite(doctorId, button) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('请先登录', 'warning');
            return;
        }
        
        const isFavorited = button.classList.contains('favorited');
        
        if (isFavorited) {
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
            
            button.classList.remove('favorited');
            button.querySelector('i').textContent = '🤍';
            button.querySelector('span').textContent = '收藏';
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
            
            button.classList.add('favorited');
            button.querySelector('i').textContent = '❤️';
            button.querySelector('span').textContent = '已收藏';
            showToast('收藏成功', 'success');
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        showToast('操作失败，请稍后重试', 'error');
    }
}

// 检查是否已收藏
function checkIfFavorite(doctorId) {
    // 这里简化处理，实际应该从用户收藏列表中检查
    const favorites = JSON.parse(localStorage.getItem('favoriteDoctors') || '[]');
    return favorites.includes(doctorId.toString());
}

// 加载并渲染医生列表
async function loadAndRenderDoctors() {
    showLoading(true);
    
    try {
        await loadDoctors();
        renderDoctors();
        renderPagination();
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        showLoading(false);
    } catch (error) {
        console.error('加载医生列表失败:', error);
        showError('加载医生列表失败，请刷新页面重试');
        showLoading(false);
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

function getSortParam(sortValue) {
    const sortParams = {
        'rating_desc': '-average_rating',
        'rating_asc': 'average_rating',
        'review_count_desc': '-review_count',
        'review_count_asc': 'review_count',
        'experience_desc': '-experience',
        'experience_asc': 'experience'
    };
    return sortParams[sortValue] || '';
}

function showNoResults() {
    if (noResultsElement) {
        noResultsElement.style.display = 'block';
    }
    if (doctorsContainer) {
        doctorsContainer.style.display = 'none';
    }
}

function hideNoResults() {
    if (noResultsElement) {
        noResultsElement.style.display = 'none';
    }
    if (doctorsContainer) {
        doctorsContainer.style.display = 'block';
    }
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