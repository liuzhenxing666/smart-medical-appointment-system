// 用户端收藏页面JavaScript

// 全局变量
let favoriteDoctors = [];
let currentFilter = {
    specialty: 'all',
    hospital: 'all',
    sortBy: 'name'
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeMyFavorites();
});

function initializeMyFavorites() {
    // 检查用户登录状态
    if (!currentUser) {
        window.location.href = '/login/';
        return;
    }
    
    // 加载收藏列表
    loadFavoriteDoctors();
    
    // 加载筛选选项
    loadFilterOptions();
    
    // 初始化事件监听器
    initEventListeners();
}

// 初始化事件监听器
function initEventListeners() {
    // 搜索框
    const searchInput = document.getElementById('favoriteSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // 筛选器
    const specialtyFilter = document.getElementById('specialtyFilter');
    if (specialtyFilter) {
        specialtyFilter.addEventListener('change', applyFilters);
    }
    
    const hospitalFilter = document.getElementById('hospitalFilter');
    if (hospitalFilter) {
        hospitalFilter.addEventListener('change', applyFilters);
    }
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilters);
    }
    
    // 取消收藏按钮
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('remove-favorite-btn')) {
            const doctorId = event.target.dataset.doctorId;
            removeFavorite(doctorId);
        }
    });
    
    // 预约按钮
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('book-doctor-btn')) {
            const doctorId = event.target.dataset.doctorId;
            window.location.href = `/appointment-booking/?doctor=${doctorId}`;
        }
    });
}

// 加载收藏医生列表
function loadFavoriteDoctors() {
    const container = document.getElementById('favoritesContainer');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/favorites/doctors/`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        container.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            favoriteDoctors = data.results;
            renderFavoriteDoctors(favoriteDoctors);
        } else {
            container.innerHTML = '<div class="no-favorites"><p>暂无收藏的医生</p><a href="/appointment-search/" class="btn btn-primary">去找医生</a></div>';
        }
    })
    .catch(error => {
        console.error('加载收藏列表失败:', error);
        container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
    });
}

// 加载筛选选项
function loadFilterOptions() {
    // 加载专科选项
    loadSpecialtyOptions();
    
    // 加载医院选项
    loadHospitalOptions();
}

// 加载专科选项
function loadSpecialtyOptions() {
    const specialtySelect = document.getElementById('specialtyFilter');
    if (!specialtySelect) return;
    
    fetch(`${API_BASE_URL}/specialties/`)
        .then(response => response.json())
        .then(data => {
            // 保留"全部"选项
            const allOption = specialtySelect.querySelector('option[value="all"]');
            specialtySelect.innerHTML = '';
            specialtySelect.appendChild(allOption);
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(specialty => {
                    const option = document.createElement('option');
                    option.value = specialty.id;
                    option.textContent = specialty.name;
                    specialtySelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('加载专科列表失败:', error);
        });
}

// 加载医院选项
function loadHospitalOptions() {
    const hospitalSelect = document.getElementById('hospitalFilter');
    if (!hospitalSelect) return;
    
    fetch(`${API_BASE_URL}/hospitals/`)
        .then(response => response.json())
        .then(data => {
            // 保留"全部"选项
            const allOption = hospitalSelect.querySelector('option[value="all"]');
            hospitalSelect.innerHTML = '';
            hospitalSelect.appendChild(allOption);
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(hospital => {
                    const option = document.createElement('option');
                    option.value = hospital.id;
                    option.textContent = hospital.name;
                    hospitalSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('加载医院列表失败:', error);
        });
}

// 渲染收藏医生列表
function renderFavoriteDoctors(doctors) {
    const container = document.getElementById('favoritesContainer');
    if (!container) return;
    
    if (doctors.length === 0) {
        container.innerHTML = '<div class="no-favorites"><p>暂无收藏的医生</p><a href="/appointment-search/" class="btn btn-primary">去找医生</a></div>';
        return;
    }
    
    const doctorsHTML = doctors.map(doctor => renderFavoriteDoctorCard(doctor)).join('');
    container.innerHTML = `<div class="favorites-grid">${doctorsHTML}</div>`;
}

// 渲染收藏医生卡片
function renderFavoriteDoctorCard(doctor) {
    return `
        <div class="doctor-card favorite-card">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    <img src="${doctor.image || '/static/images/default-doctor.png'}" alt="${doctor.name}">
                </div>
                <div class="doctor-info">
                    <h3 class="doctor-name">${doctor.name}</h3>
                    <div class="doctor-title">${doctor.title}</div>
                    <div class="doctor-hospital">${doctor.hospital_name}</div>
                    <div class="doctor-rating">
                        <div class="stars">
                            ${generateStarRating(doctor.rating)}
                        </div>
                        <span class="rating-score">${doctor.rating.toFixed(1)}</span>
                        <span class="review-count">(${doctor.review_count}条评价)</span>
                    </div>
                </div>
                <div class="favorite-actions">
                    <button class="btn btn-outline remove-favorite-btn" data-doctor-id="${doctor.id}">
                        <i class="icon-heart-filled"></i> 取消收藏
                    </button>
                </div>
            </div>
            
            <div class="doctor-specialties">
                ${doctor.specialties.map(specialty => `<span class="tag">${specialty}</span>`).join('')}
            </div>
            
            <div class="doctor-introduction">
                <p>${doctor.introduction ? (doctor.introduction.length > 100 ? doctor.introduction.substring(0, 100) + '...' : doctor.introduction) : '暂无介绍'}</p>
            </div>
            
            <div class="doctor-footer">
                <button class="btn btn-outline" onclick="viewDoctorDetail(${doctor.id})">查看详情</button>
                <button class="btn btn-primary book-doctor-btn" data-doctor-id="${doctor.id}">立即预约</button>
            </div>
        </div>
    `;
}

// 生成星级评分
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="icon-star-full"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="icon-star-half"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="icon-star-empty"></i>';
    }
    
    return stars;
}

// 查看医生详情
function viewDoctorDetail(doctorId) {
    window.location.href = `/appointment-search/?doctor=${doctorId}`;
}

// 取消收藏
function removeFavorite(doctorId) {
    if (!confirm('确定要取消收藏这个医生吗？')) return;
    
    fetch(`${API_BASE_URL}/favorites/remove/`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            doctor_id: doctorId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('已取消收藏');
            
            // 从本地列表中移除
            favoriteDoctors = favoriteDoctors.filter(doctor => doctor.id !== doctorId);
            
            // 重新渲染列表
            renderFavoriteDoctors(favoriteDoctors);
        } else {
            alert('取消收藏失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('取消收藏失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 搜索收藏医生
function handleSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
        renderFavoriteDoctors(favoriteDoctors);
        return;
    }
    
    const filteredDoctors = favoriteDoctors.filter(doctor => {
        return (
            doctor.name.toLowerCase().includes(query.toLowerCase()) ||
            doctor.title.toLowerCase().includes(query.toLowerCase()) ||
            doctor.hospital_name.toLowerCase().includes(query.toLowerCase()) ||
            doctor.specialties.some(specialty => specialty.toLowerCase().includes(query.toLowerCase()))
        );
    });
    
    renderFavoriteDoctors(filteredDoctors);
}

// 应用筛选器
function applyFilters() {
    // 更新筛选条件
    const specialtyFilter = document.getElementById('specialtyFilter');
    if (specialtyFilter) {
        currentFilter.specialty = specialtyFilter.value;
    }
    
    const hospitalFilter = document.getElementById('hospitalFilter');
    if (hospitalFilter) {
        currentFilter.hospital = hospitalFilter.value;
    }
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        currentFilter.sortBy = sortSelect.value;
    }
    
    // 筛选和排序收藏医生
    let filteredDoctors = [...favoriteDoctors];
    
    // 按专科筛选
    if (currentFilter.specialty !== 'all') {
        filteredDoctors = filteredDoctors.filter(doctor => {
            return doctor.specialty_ids && doctor.specialty_ids.includes(parseInt(currentFilter.specialty));
        });
    }
    
    // 按医院筛选
    if (currentFilter.hospital !== 'all') {
        filteredDoctors = filteredDoctors.filter(doctor => {
            return doctor.hospital_id === parseInt(currentFilter.hospital);
        });
    }
    
    // 排序
    switch (currentFilter.sortBy) {
        case 'name':
            filteredDoctors.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'rating':
            filteredDoctors.sort((a, b) => b.rating - a.rating);
            break;
        case 'review_count':
            filteredDoctors.sort((a, b) => b.review_count - a.review_count);
            break;
        case 'hospital':
            filteredDoctors.sort((a, b) => a.hospital_name.localeCompare(b.hospital_name));
            break;
        case 'favorite_time':
            filteredDoctors.sort((a, b) => new Date(b.favorite_time) - new Date(a.favorite_time));
            break;
    }
    
    // 重新渲染列表
    renderFavoriteDoctors(filteredDoctors);
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