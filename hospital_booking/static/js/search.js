// 搜索结果页面JavaScript

// 全局变量
let searchResults = {
    hospitals: [],
    doctors: [],
    departments: []
};
let searchQuery = '';
let currentPage = 1;
let pageSize = 10;
let totalResults = 0;
let isLoading = false;
let activeTab = 'all'; // 'all', 'hospitals', 'doctors', 'departments'

// DOM元素
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const resultsContainer = document.getElementById('results-container');
const paginationContainer = document.getElementById('pagination-container');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('no-results');
const resultsCountElement = document.getElementById('results-count');
const sortSelect = document.getElementById('sort-select');
const filterBtn = document.getElementById('filter-btn');
const filterModal = document.getElementById('filter-modal');
const closeFilterBtn = document.getElementById('close-filter-btn');
const applyFilterBtn = document.getElementById('apply-filter-btn');
const resetFilterBtn = document.getElementById('reset-filter-btn');
const hospitalLevelCheckboxes = document.querySelectorAll('input[name="hospital-level"]');
const departmentCheckboxes = document.querySelectorAll('input[name="department"]');

// API基础URL
const API_BASE_URL = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从URL参数获取搜索关键词
    const urlParams = new URLSearchParams(window.location.search);
    searchQuery = urlParams.get('q') || '';
    
    // 初始化页面
    initPage();
});

// 初始化页面
async function initPage() {
    // 设置搜索框的值
    if (searchInput) {
        searchInput.value = searchQuery;
    }
    
    // 如果有搜索关键词，执行搜索
    if (searchQuery) {
        await performSearch();
    } else {
        showNoResults('请输入搜索关键词');
    }
    
    // 初始化事件监听器
    initEventListeners();
}

// 执行搜索
async function performSearch(page = 1) {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    currentPage = page;
    
    try {
        // 构建搜索参数
        const searchParams = new URLSearchParams({
            q: searchQuery,
            page: currentPage,
            page_size: pageSize
        });
        
        // 添加排序参数
        if (sortSelect) {
            searchParams.append('sort', sortSelect.value);
        }
        
        // 添加筛选参数
        const selectedLevels = getSelectedValues(hospitalLevelCheckboxes);
        if (selectedLevels.length > 0) {
            searchParams.append('hospital_levels', selectedLevels.join(','));
        }
        
        const selectedDepartments = getSelectedValues(departmentCheckboxes);
        if (selectedDepartments.length > 0) {
            searchParams.append('departments', selectedDepartments.join(','));
        }
        
        // 执行搜索请求
        const response = await fetch(`${API_BASE_URL}/search/?${searchParams.toString()}`);
        if (!response.ok) {
            throw new Error('搜索失败');
        }
        
        const data = await response.json();
        searchResults = data.results || {
            hospitals: [],
            doctors: [],
            departments: []
        };
        
        totalResults = data.count || 0;
        
        // 渲染搜索结果
        renderSearchResults();
        
        // 渲染分页
        renderPagination();
        
        // 更新结果计数
        updateResultsCount();
        
        showLoading(false);
    } catch (error) {
        console.error('搜索失败:', error);
        showError('搜索失败，请重试');
        showLoading(false);
    } finally {
        isLoading = false;
    }
}

// 渲染搜索结果
function renderSearchResults() {
    if (!resultsContainer) return;
    
    let resultsHtml = '';
    
    // 根据当前活动的标签页渲染不同的结果
    switch (activeTab) {
        case 'hospitals':
            resultsHtml = renderHospitalResults();
            break;
        case 'doctors':
            resultsHtml = renderDoctorResults();
            break;
        case 'departments':
            resultsHtml = renderDepartmentResults();
            break;
        case 'all':
        default:
            resultsHtml = renderAllResults();
            break;
    }
    
    resultsContainer.innerHTML = resultsHtml;
    
    // 添加结果项点击事件
    addResultItemEvents();
}

// 渲染所有搜索结果
function renderAllResults() {
    let html = '';
    
    // 渲染医院结果
    if (searchResults.hospitals && searchResults.hospitals.length > 0) {
        html += `
            <div class="result-section">
                <h3 class="result-section-title">医院 (${searchResults.hospitals.length})</h3>
                <div class="hospitals-grid">
                    ${searchResults.hospitals.map(hospital => `
                        <div class="hospital-card result-item" data-type="hospital" data-id="${hospital.id}">
                            <div class="hospital-image">
                                <img src="${hospital.image || '/static/images/default-hospital.png'}" alt="${hospital.name}">
                            </div>
                            <div class="hospital-info">
                                <h4 class="hospital-name">${highlightSearchTerm(hospital.name, searchQuery)}</h4>
                                <div class="hospital-level">${hospital.level || '未知等级'}</div>
                                <div class="hospital-rating">
                                    <div class="stars">
                                        ${generateStars(hospital.average_rating || 0)}
                                    </div>
                                    <span class="rating-score">${hospital.average_rating?.toFixed(1) || '0.0'}</span>
                                </div>
                                <div class="hospital-address">${hospital.address || '暂无地址'}</div>
                                <div class="hospital-description">
                                    ${highlightSearchTerm(hospital.description || '', searchQuery)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 渲染医生结果
    if (searchResults.doctors && searchResults.doctors.length > 0) {
        html += `
            <div class="result-section">
                <h3 class="result-section-title">医生 (${searchResults.doctors.length})</h3>
                <div class="doctors-grid">
                    ${searchResults.doctors.map(doctor => `
                        <div class="doctor-card result-item" data-type="doctor" data-id="${doctor.id}">
                            <div class="doctor-avatar">
                                <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
                            </div>
                            <div class="doctor-info">
                                <h4 class="doctor-name">${highlightSearchTerm(doctor.name, searchQuery)}</h4>
                                <div class="doctor-title">${doctor.title || '医生'}</div>
                                <div class="doctor-hospital">${doctor.hospital_name || '未知医院'}</div>
                                <div class="doctor-department">${doctor.department_name || '未知科室'}</div>
                                <div class="doctor-rating">
                                    <div class="stars">
                                        ${generateStars(doctor.average_rating || 0)}
                                    </div>
                                    <span class="rating-score">${doctor.average_rating?.toFixed(1) || '0.0'}</span>
                                </div>
                                <div class="doctor-description">
                                    ${highlightSearchTerm(doctor.description || '', searchQuery)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 渲染科室结果
    if (searchResults.departments && searchResults.departments.length > 0) {
        html += `
            <div class="result-section">
                <h3 class="result-section-title">科室 (${searchResults.departments.length})</h3>
                <div class="departments-grid">
                    ${searchResults.departments.map(dept => `
                        <div class="department-card result-item" data-type="department" data-id="${dept.id}">
                            <div class="department-icon">
                                ${getDepartmentIcon(dept.name)}
                            </div>
                            <div class="department-info">
                                <h4 class="department-name">${highlightSearchTerm(dept.name, searchQuery)}</h4>
                                <div class="department-description">
                                    ${highlightSearchTerm(dept.description || '', searchQuery)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 如果没有任何结果
    if (!html) {
        html = `
            <div class="no-results">
                <p>没有找到与"${searchQuery}"相关的结果</p>
                <p>请尝试使用其他关键词或调整筛选条件</p>
            </div>
        `;
    }
    
    return html;
}

// 渲染医院搜索结果
function renderHospitalResults() {
    if (!searchResults.hospitals || searchResults.hospitals.length === 0) {
        return `
            <div class="no-results">
                <p>没有找到与"${searchQuery}"相关的医院</p>
                <p>请尝试使用其他关键词或调整筛选条件</p>
            </div>
        `;
    }
    
    return `
        <div class="hospitals-grid">
            ${searchResults.hospitals.map(hospital => `
                <div class="hospital-card result-item" data-type="hospital" data-id="${hospital.id}">
                    <div class="hospital-image">
                        <img src="${hospital.image || '/static/images/default-hospital.png'}" alt="${hospital.name}">
                    </div>
                    <div class="hospital-info">
                        <h4 class="hospital-name">${highlightSearchTerm(hospital.name, searchQuery)}</h4>
                        <div class="hospital-level">${hospital.level || '未知等级'}</div>
                        <div class="hospital-rating">
                            <div class="stars">
                                ${generateStars(hospital.average_rating || 0)}
                            </div>
                            <span class="rating-score">${hospital.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div class="hospital-address">${hospital.address || '暂无地址'}</div>
                        <div class="hospital-description">
                            ${highlightSearchTerm(hospital.description || '', searchQuery)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 渲染医生搜索结果
function renderDoctorResults() {
    if (!searchResults.doctors || searchResults.doctors.length === 0) {
        return `
            <div class="no-results">
                <p>没有找到与"${searchQuery}"相关的医生</p>
                <p>请尝试使用其他关键词或调整筛选条件</p>
            </div>
        `;
    }
    
    return `
        <div class="doctors-grid">
            ${searchResults.doctors.map(doctor => `
                <div class="doctor-card result-item" data-type="doctor" data-id="${doctor.id}">
                    <div class="doctor-avatar">
                        <img src="${doctor.avatar || '/static/images/default-doctor.png'}" alt="${doctor.name}">
                    </div>
                    <div class="doctor-info">
                        <h4 class="doctor-name">${highlightSearchTerm(doctor.name, searchQuery)}</h4>
                        <div class="doctor-title">${doctor.title || '医生'}</div>
                        <div class="doctor-hospital">${doctor.hospital_name || '未知医院'}</div>
                        <div class="doctor-department">${doctor.department_name || '未知科室'}</div>
                        <div class="doctor-rating">
                            <div class="stars">
                                ${generateStars(doctor.average_rating || 0)}
                            </div>
                            <span class="rating-score">${doctor.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div class="doctor-description">
                            ${highlightSearchTerm(doctor.description || '', searchQuery)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 渲染科室搜索结果
function renderDepartmentResults() {
    if (!searchResults.departments || searchResults.departments.length === 0) {
        return `
            <div class="no-results">
                <p>没有找到与"${searchQuery}"相关的科室</p>
                <p>请尝试使用其他关键词或调整筛选条件</p>
            </div>
        `;
    }
    
    return `
        <div class="departments-grid">
            ${searchResults.departments.map(dept => `
                <div class="department-card result-item" data-type="department" data-id="${dept.id}">
                    <div class="department-icon">
                        ${getDepartmentIcon(dept.name)}
                    </div>
                    <div class="department-info">
                        <h4 class="department-name">${highlightSearchTerm(dept.name, searchQuery)}</h4>
                        <div class="department-description">
                            ${highlightSearchTerm(dept.description || '', searchQuery)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 渲染分页
function renderPagination() {
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(totalResults / pageSize);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHtml = '<div class="pagination">';
    
    // 上一页按钮
    if (currentPage > 1) {
        paginationHtml += `<button class="page-btn" data-page="${currentPage - 1}">上一页</button>`;
    }
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHtml += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += '<span class="page-ellipsis">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        paginationHtml += `<button class="page-btn ${isActive}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<span class="page-ellipsis">...</span>';
        }
        paginationHtml += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        paginationHtml += `<button class="page-btn" data-page="${currentPage + 1}">下一页</button>`;
    }
    
    paginationHtml += '</div>';
    
    paginationContainer.innerHTML = paginationHtml;
    
    // 添加分页按钮点击事件
    const pageButtons = paginationContainer.querySelectorAll('.page-btn');
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page && page !== currentPage) {
                performSearch(page);
            }
        });
    });
}

// 更新结果计数
function updateResultsCount() {
    if (!resultsCountElement) return;
    
    let count = 0;
    switch (activeTab) {
        case 'hospitals':
            count = searchResults.hospitals?.length || 0;
            break;
        case 'doctors':
            count = searchResults.doctors?.length || 0;
            break;
        case 'departments':
            count = searchResults.departments?.length || 0;
            break;
        case 'all':
        default:
            count = totalResults;
            break;
    }
    
    resultsCountElement.textContent = `找到 ${count} 个结果`;
}

// 添加结果项点击事件
function addResultItemEvents() {
    const resultItems = resultsContainer.querySelectorAll('.result-item');
    resultItems.forEach(item => {
        item.addEventListener('click', function() {
            const type = this.dataset.type;
            const id = this.dataset.id;
            
            switch (type) {
                case 'hospital':
                    window.location.href = `/hospital-detail.html?id=${id}`;
                    break;
                case 'doctor':
                    window.location.href = `/doctor-detail.html?id=${id}`;
                    break;
                case 'department':
                    // 跳转到医院列表页面，并带上科室筛选参数
                    const departmentName = this.querySelector('.department-name')?.textContent || '';
                    window.location.href = `/hospital-list.html?department=${id}&name=${encodeURIComponent(departmentName)}`;
                    break;
            }
        });
    });
}

// 初始化事件监听器
function initEventListeners() {
    // 搜索按钮点击事件
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            searchQuery = searchInput.value.trim();
            if (!searchQuery) {
                showToast('请输入搜索关键词', 'warning');
                return;
            }
            
            // 更新URL参数
            const url = new URL(window.location);
            url.searchParams.set('q', searchQuery);
            url.searchParams.delete('page');
            window.history.replaceState({}, '', url);
            
            // 执行搜索
            performSearch(1);
        });
    }
    
    // 搜索框回车事件
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
    
    // 清除按钮点击事件
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            searchQuery = '';
            
            // 更新URL参数
            const url = new URL(window.location);
            url.searchParams.delete('q');
            window.history.replaceState({}, '', url);
            
            // 清空搜索结果
            showNoResults('请输入搜索关键词');
        });
    }
    
    // 标签页切换事件
    if (tabButtons) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 移除所有标签的active类
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // 添加当前标签的active类
                this.classList.add('active');
                
                // 更新当前活动标签
                activeTab = this.dataset.tab;
                
                // 重新渲染搜索结果
                renderSearchResults();
                updateResultsCount();
            });
        });
    }
    
    // 排序选择变化事件
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            performSearch(1);
        });
    }
    
    // 筛选按钮点击事件
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            if (filterModal) {
                filterModal.classList.add('show');
            }
        });
    }
    
    // 关闭筛选模态框
    if (closeFilterBtn) {
        closeFilterBtn.addEventListener('click', function() {
            if (filterModal) {
                filterModal.classList.remove('show');
            }
        });
    }
    
    // 应用筛选
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', function() {
            if (filterModal) {
                filterModal.classList.remove('show');
            }
            performSearch(1);
        });
    }
    
    // 重置筛选
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', function() {
            // 重置所有复选框
            hospitalLevelCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            departmentCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // 应用重置后的筛选
            if (filterModal) {
                filterModal.classList.remove('show');
            }
            performSearch(1);
        });
    }
}

// 工具函数
function highlightSearchTerm(text, term) {
    if (!text || !term) return text;
    
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

function getSelectedValues(checkboxes) {
    const values = [];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            values.push(checkbox.value);
        }
    });
    return values;
}

function showLoading(show) {
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showNoResults(message) {
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>${message}</p>
            </div>
        `;
    }
    
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
    
    if (resultsCountElement) {
        resultsCountElement.textContent = '找到 0 个结果';
    }
}

function showError(message) {
    showToast(message, 'error');
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