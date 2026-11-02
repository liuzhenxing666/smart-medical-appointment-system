// 预约搜索页面JavaScript

// 全局变量
let doctors = [];
let hospitals = [];
let departments = [];
let regions = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let searchParams = {
    keyword: '',
    hospital: '',
    department: '',
    region: '',
    levels: [],
    titles: [],
    sort: 'default'
};

// DOM元素
const searchForm = document.getElementById('search-form');
const resetBtn = document.getElementById('reset-btn');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('no-results');
const doctorsListElement = document.getElementById('doctors-list');
const paginationNavElement = document.getElementById('pagination-nav');
const sortSelectElement = document.getElementById('sort-select');
const searchKeywordElement = document.getElementById('search-keyword');
const searchHospitalElement = document.getElementById('search-hospital');
const searchDepartmentElement = document.getElementById('search-department');
const searchRegionElement = document.getElementById('search-region');

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initPage();
});

// 初始化页面
async function initPage() {
    try {
        // 检查用户登录状态
        checkUserLogin();
        
        // 加载筛选选项数据
        await Promise.all([
            loadHospitals(),
            loadDepartments(),
            loadRegions()
        ]);
        
        // 初始化事件监听器
        initEventListeners();
        
        // 执行初始搜索
        await searchDoctors();
    } catch (error) {
        console.error('页面初始化失败:', error);
        showToast('页面加载失败，请刷新重试', 'error');
    }
}

// 检查用户登录状态
function checkUserLogin() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('请先登录后使用预约功能', 'warning');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 2000);
        return false;
    }
    return true;
}

// 加载医院列表
async function loadHospitals() {
    try {
        const response = await fetch(`${API_BASE_URL}/hospitals/`);
        if (!response.ok) throw new Error('获取医院列表失败');
        
        const data = await response.json();
        hospitals = data.results || data;
        
        // 填充医院下拉框
        if (searchHospitalElement) {
            hospitals.forEach(hospital => {
                const option = document.createElement('option');
                option.value = hospital.id;
                option.textContent = hospital.name;
                searchHospitalElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载医院列表失败:', error);
        throw error;
    }
}

// 加载科室列表
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}/departments/`);
        if (!response.ok) throw new Error('获取科室列表失败');
        
        const data = await response.json();
        departments = data.results || data;
        
        // 填充科室下拉框
        if (searchDepartmentElement) {
            departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.id;
                option.textContent = department.name;
                searchDepartmentElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载科室列表失败:', error);
        throw error;
    }
}

// 加载地区列表
async function loadRegions() {
    try {
        // 从医院列表中提取地区
        const uniqueRegions = [...new Set(hospitals.map(hospital => hospital.region).filter(Boolean))];
        regions = uniqueRegions;
        
        // 填充地区下拉框
        if (searchRegionElement) {
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                searchRegionElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载地区列表失败:', error);
        throw error;
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 搜索表单提交
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSearch();
        });
    }
    
    // 重置按钮
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSearch);
    }
    
    // 排序选择
    if (sortSelectElement) {
        sortSelectElement.addEventListener('change', function() {
            searchParams.sort = this.value;
            searchDoctors();
        });
    }
    
    // 医院等级筛选
    const levelCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="level-"]');
    levelCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateFilterParams('levels', this.value, this.checked);
            searchDoctors();
        });
    });
    
    // 医生职称筛选
    const titleCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="title-"]');
    titleCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateFilterParams('titles', this.value, this.checked);
            searchDoctors();
        });
    });
}

// 处理搜索
function handleSearch() {
    // 更新搜索参数
    searchParams.keyword = searchKeywordElement ? searchKeywordElement.value.trim() : '';
    searchParams.hospital = searchHospitalElement ? searchHospitalElement.value : '';
    searchParams.department = searchDepartmentElement ? searchDepartmentElement.value : '';
    searchParams.region = searchRegionElement ? searchRegionElement.value : '';
    
    // 重置页码
    currentPage = 1;
    
    // 执行搜索
    searchDoctors();
}

// 重置搜索
function resetSearch() {
    // 重置表单
    if (searchForm) {
        searchForm.reset();
    }
    
    // 重置搜索参数
    searchParams = {
        keyword: '',
        hospital: '',
        department: '',
        region: '',
        levels: [],
        titles: [],
        sort: 'default'
    };
    
    // 重置页码
    currentPage = 1;
    
    // 执行搜索
    searchDoctors();
}

// 更新筛选参数
function updateFilterParams(paramName, value, isChecked) {
    if (isChecked) {
        if (!searchParams[paramName].includes(value)) {
            searchParams[paramName].push(value);
        }
    } else {
        const index = searchParams[paramName].indexOf(value);
        if (index > -1) {
            searchParams[paramName].splice(index, 1);
        }
    }
}

// 搜索医生
async function searchDoctors() {
    try {
        showLoading(true);
        
        // 构建查询参数
        const queryParams = new URLSearchParams();
        
        if (searchParams.keyword) queryParams.append('search', searchParams.keyword);
        if (searchParams.hospital) queryParams.append('hospital', searchParams.hospital);
        if (searchParams.department) queryParams.append('department', searchParams.department);
        if (searchParams.region) queryParams.append('region', searchParams.region);
        
        // 添加筛选参数
        searchParams.levels.forEach(level => {
            queryParams.append('hospital_level', level);
        });
        
        searchParams.titles.forEach(title => {
            queryParams.append('title', title);
        });
        
        // 添加排序参数
        if (searchParams.sort !== 'default') {
            queryParams.append('ordering', getSortOrdering(searchParams.sort));
        }
        
        // 添加分页参数
        queryParams.append('page', currentPage);
        queryParams.append('page_size', pageSize);
        
        // 发送请求
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/doctors/search/?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('搜索医生失败');
        
        const data = await response.json();
        doctors = data.results || [];
        totalPages = Math.ceil(data.count / pageSize) || 1;
        
        // 渲染结果
        renderDoctors();
        renderPagination();
        
        showLoading(false);
    } catch (error) {
        console.error('搜索医生失败:', error);
        showToast('搜索失败，请稍后重试', 'error');
        showLoading(false);
    }
}

// 获取排序参数
function getSortOrdering(sortType) {
    const sortMap = {
        'rating': '-average_rating',
        'review_count': '-review_count',
        'fee': 'fee'
    };
    
    return sortMap[sortType] || '';
}

// 渲染医生列表
function renderDoctors() {
    if (!doctorsListElement) return;
    
    if (doctors.length === 0) {
        doctorsListElement.innerHTML = '';
        if (noResultsElement) {
            noResultsElement.style.display = 'block';
        }
        return;
    }
    
    if (noResultsElement) {
        noResultsElement.style.display = 'none';
    }
    
    const doctorsHtml = doctors.map(doctor => {
        const hospital = hospitals.find(h => h.id === doctor.hospital);
        const department = departments.find(d => d.id === doctor.department);
        
        return `
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
                
                ${doctor.bio ? `
                    <div class="doctor-bio">
                        ${doctor.bio.length > 100 ? doctor.bio.substring(0, 100) + '...' : doctor.bio}
                    </div>
                ` : ''}
                
                ${doctor.specialties ? `
                    <div class="doctor-tags">
                        ${doctor.specialties.split(',').slice(0, 3).map(tag => 
                            `<span class="doctor-tag">${tag.trim()}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                
                <div class="doctor-actions">
                    <div>
                        <div class="hospital-info">
                            <i class="bi bi-hospital"></i> ${hospital ? hospital.name : '未知医院'}
                            ${hospital && hospital.level ? `(${hospital.level})` : ''}
                        </div>
                        <div class="schedule-info">
                            <i class="bi bi-calendar-check"></i> 可预约
                        </div>
                    </div>
                    <button class="book-btn" data-doctor-id="${doctor.id}">
                        立即预约
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    doctorsListElement.innerHTML = doctorsHtml;
    
    // 添加预约按钮事件
    const bookButtons = doctorsListElement.querySelectorAll('.book-btn');
    bookButtons.forEach(button => {
        button.addEventListener('click', function() {
            const doctorId = this.getAttribute('data-doctor-id');
            bookAppointment(doctorId);
        });
    });
}

// 渲染分页
function renderPagination() {
    if (!paginationNavElement) return;
    
    if (totalPages <= 1) {
        paginationNavElement.innerHTML = '';
        return;
    }
    
    let paginationHtml = '<ul class="pagination">';
    
    // 上一页
    paginationHtml += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // 页码
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>
        `;
        
        if (startPage > 2) {
            paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
        
        paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
            </li>
        `;
    }
    
    // 下一页
    paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    paginationHtml += '</ul>';
    paginationNavElement.innerHTML = paginationHtml;
    
    // 添加分页点击事件
    const pageLinks = paginationNavElement.querySelectorAll('.page-link:not(.disabled)');
    pageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== currentPage) {
                currentPage = page;
                searchDoctors();
            }
        });
    });
}

// 预约医生
function bookAppointment(doctorId) {
    // 跳转到预约页面
    window.location.href = `/appointment-booking/?doctor=${doctorId}`;
}

// 显示加载状态
function showLoading(show) {
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    if (show && doctorsListElement) {
        doctorsListElement.style.display = 'none';
    } else if (!show && doctorsListElement) {
        doctorsListElement.style.display = 'block';
    }
}

// 生成星级评分
function generateStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="bi bi-star-fill"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="bi bi-star-half"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="bi bi-star"></i>';
    }
    
    return stars;
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加样式
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = type === 'success' ? '#28a745' : 
                                  type === 'error' ? '#dc3545' : 
                                  type === 'warning' ? '#ffc107' : '#17a2b8';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    toast.style.zIndex = '9999';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}