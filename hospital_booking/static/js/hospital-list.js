// 用户端医院列表页面JavaScript

// 全局变量
let hospitals = [];
let filteredHospitals = [];
let userLocation = null;
let map = null;
let markers = [];
let currentSort = 'distance'; // 默认按距离排序
let currentPage = 1;
let pageSize = 12;
let totalItems = 0;

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeHospitalList();
});

function initializeHospitalList() {
    // 初始化地图
    initMap();
    
    // 获取用户位置
    getUserLocation();
    
    // 加载医院数据
    loadHospitals();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载收藏列表
    loadFavorites();
}

// 初始化事件监听器
function initEventListeners() {
    // 搜索框
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // 筛选条件
    const levelFilter = document.getElementById('levelFilter');
    if (levelFilter) {
        levelFilter.addEventListener('change', applyFilters);
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    const regionFilter = document.getElementById('regionFilter');
    if (regionFilter) {
        regionFilter.addEventListener('change', applyFilters);
    }
    
    // 排序选项
    const sortOptions = document.querySelectorAll('.sort-option');
    sortOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除所有选中状态
            sortOptions.forEach(opt => opt.classList.remove('active'));
            
            // 添加当前选中状态
            this.classList.add('active');
            
            // 更新排序方式
            currentSort = this.dataset.sort;
            
            // 应用排序
            applySorting();
        });
    });
    
    // 视图切换
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有选中状态
            viewButtons.forEach(b => b.classList.remove('active'));
            
            // 添加当前选中状态
            this.classList.add('active');
            
            // 切换视图
            const viewType = this.dataset.view;
            switchView(viewType);
        });
    });
    
    // 地图视图按钮
    const mapViewBtn = document.getElementById('mapViewBtn');
    if (mapViewBtn) {
        mapViewBtn.addEventListener('click', toggleMapView);
    }
    
    // 收藏按钮（事件委托）
    const hospitalList = document.getElementById('hospitalList');
    if (hospitalList) {
        hospitalList.addEventListener('click', function(event) {
            if (event.target.classList.contains('favorite-btn')) {
                event.stopPropagation();
                const hospitalId = event.target.dataset.hospitalId;
                toggleFavorite(hospitalId, event.target);
            }
        });
    }
}

// 初始化地图
function initMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    // 创建地图实例
    map = new AMap.Map('mapContainer', {
        zoom: 12,
        center: [116.397428, 39.90923], // 默认北京坐标
        mapStyle: 'amap://styles/fresh' // 使用清新风格
    });
    
    // 添加地图控件
    map.addControl(new AMap.Scale());
    map.addControl(new AMap.ToolBar());
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
                
                // 更新地图中心
                if (map) {
                    map.setCenter([userLocation.lng, userLocation.lat]);
                    
                    // 添加用户位置标记
                    const userMarker = new AMap.Marker({
                        position: [userLocation.lng, userLocation.lat],
                        icon: new AMap.Icon({
                            size: new AMap.Size(25, 34),
                            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
                            imageSize: new AMap.Size(25, 34)
                        }),
                        title: '您的位置'
                    });
                    
                    map.add(userMarker);
                }
                
                // 重新加载医院数据（计算距离）
                loadHospitals();
            },
            error => {
                console.error('获取位置失败:', error);
                // 使用默认位置（北京）
                userLocation = {
                    lat: 39.90923,
                    lng: 116.397428
                };
            }
        );
    } else {
        // 浏览器不支持地理定位，使用默认位置
        userLocation = {
            lat: 39.90923,
            lng: 116.397428
        };
    }
}

// 加载医院数据
function loadHospitals() {
    // 显示加载状态
    showLoading(true);
    
    // 构建查询参数
    const params = new URLSearchParams();
    
    // 如果有用户位置，添加经纬度参数
    if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
    }
    
    // 发送请求
    fetch(`${API_BASE_URL}/hospitals/?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            hospitals = data.results || [];
            filteredHospitals = [...hospitals];
            totalItems = data.count || hospitals.length;
            
            // 应用当前筛选和排序
            applyFilters();
            
            // 渲染医院列表
            renderHospitalList();
            
            // 渲染地图标记
            renderMapMarkers();
        })
        .catch(error => {
            console.error('加载医院数据失败:', error);
            showError('加载医院数据失败，请稍后重试');
        })
        .finally(() => {
            showLoading(false);
        });
}

// 渲染医院列表
function renderHospitalList() {
    const hospitalList = document.getElementById('hospitalList');
    if (!hospitalList) return;
    
    // 计算分页
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageHospitals = filteredHospitals.slice(startIndex, endIndex);
    
    // 清空列表
    hospitalList.innerHTML = '';
    
    if (pageHospitals.length === 0) {
        hospitalList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-hospital"></i>
                </div>
                <h3>暂无医院数据</h3>
                <p>请尝试调整筛选条件</p>
            </div>
        `;
        return;
    }
    
    // 渲染医院卡片
    pageHospitals.forEach(hospital => {
        const hospitalCard = createHospitalCard(hospital);
        hospitalList.appendChild(hospitalCard);
    });
    
    // 渲染分页
    renderPagination();
}

// 创建医院卡片
function createHospitalCard(hospital) {
    const card = document.createElement('div');
    card.className = 'hospital-card';
    
    // 计算距离
    const distance = hospital.distance ? `${hospital.distance.toFixed(1)}km` : '未知';
    
    // 检查是否已收藏
    const isFavorite = isHospitalFavorite(hospital.id);
    
    card.innerHTML = `
        <div class="hospital-image">
            <img src="${hospital.image || '/static/images/default-hospital.jpg'}" alt="${hospital.name}">
            <div class="hospital-level">${hospital.level}</div>
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-hospital-id="${hospital.id}">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="hospital-info">
            <h3 class="hospital-name">${hospital.name}</h3>
            <div class="hospital-address">
                <i class="fas fa-map-marker-alt"></i>
                <span>${hospital.address}</span>
            </div>
            <div class="hospital-meta">
                <div class="hospital-distance">
                    <i class="fas fa-route"></i>
                    <span>${distance}</span>
                </div>
                <div class="hospital-rating">
                    <i class="fas fa-star"></i>
                    <span>${hospital.rating || '暂无评分'}</span>
                </div>
            </div>
            <div class="hospital-tags">
                ${hospital.specialties ? hospital.specialties.slice(0, 3).map(specialty => 
                    `<span class="tag">${specialty}</span>`
                ).join('') : ''}
            </div>
            <div class="hospital-actions">
                <a href="/appointment-search/?hospital=${hospital.id}" class="btn btn-outline">查看详情</a>
                <a href="/appointment-search/?hospital=${hospital.id}" class="btn btn-primary">预约医生</a>
            </div>
        </div>
    `;
    
    return card;
}

// 渲染地图标记
function renderMapMarkers() {
    if (!map) return;
    
    // 清除现有标记
    markers.forEach(marker => map.remove(marker));
    markers = [];
    
    // 添加医院标记
    filteredHospitals.forEach(hospital => {
        if (hospital.latitude && hospital.longitude) {
            const marker = new AMap.Marker({
                position: [hospital.longitude, hospital.latitude],
                icon: new AMap.Icon({
                    size: new AMap.Size(25, 34),
                    image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
                    imageSize: new AMap.Size(25, 34)
                }),
                title: hospital.name
            });
            
            // 添加信息窗口
            const infoWindow = new AMap.InfoWindow({
                content: `
                    <div class="map-info-window">
                        <h4>${hospital.name}</h4>
                        <p>${hospital.address}</p>
                        <div class="info-window-actions">
                            <a href="/appointment-search/?hospital=${hospital.id}">查看详情</a>
                            <a href="/appointment-search/?hospital=${hospital.id}">预约医生</a>
                        </div>
                    </div>
                `,
                offset: new AMap.Pixel(0, -30)
            });
            
            marker.on('click', () => {
                infoWindow.open(map, marker.getPosition());
            });
            
            map.add(marker);
            markers.push(marker);
        }
    });
    
    // 调整地图视野以包含所有标记
    if (markers.length > 0) {
        map.setFitView(markers);
    }
}

// 搜索处理
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm) {
        filteredHospitals = hospitals.filter(hospital => 
            hospital.name.toLowerCase().includes(searchTerm) ||
            (hospital.address && hospital.address.toLowerCase().includes(searchTerm)) ||
            (hospital.specialties && hospital.specialties.some(specialty => 
                specialty.toLowerCase().includes(searchTerm)
            ))
        );
    } else {
        filteredHospitals = [...hospitals];
    }
    
    // 应用其他筛选条件
    applyFilters();
}

// 应用筛选条件
function applyFilters() {
    // 获取筛选值
    const levelFilter = document.getElementById('levelFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const regionFilter = document.getElementById('regionFilter');
    
    const level = levelFilter ? levelFilter.value : '';
    const category = categoryFilter ? categoryFilter.value : '';
    const region = regionFilter ? regionFilter.value : '';
    
    // 应用筛选
    let tempFiltered = [...filteredHospitals];
    
    if (level) {
        tempFiltered = tempFiltered.filter(hospital => hospital.level === level);
    }
    
    if (category) {
        tempFiltered = tempFiltered.filter(hospital => 
            hospital.category === category || 
            (hospital.specialties && hospital.specialties.includes(category))
        );
    }
    
    if (region) {
        tempFiltered = tempFiltered.filter(hospital => 
            hospital.region === region || 
            (hospital.address && hospital.address.includes(region))
        );
    }
    
    filteredHospitals = tempFiltered;
    
    // 应用排序
    applySorting();
    
    // 重置分页
    currentPage = 1;
    
    // 重新渲染列表
    renderHospitalList();
    
    // 重新渲染地图标记
    renderMapMarkers();
}

// 应用排序
function applySorting() {
    switch (currentSort) {
        case 'distance':
            if (userLocation) {
                filteredHospitals.sort((a, b) => {
                    const distanceA = a.distance || Infinity;
                    const distanceB = b.distance || Infinity;
                    return distanceA - distanceB;
                });
            }
            break;
        case 'rating':
            filteredHospitals.sort((a, b) => {
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                return ratingB - ratingA;
            });
            break;
        case 'name':
            filteredHospitals.sort((a, b) => {
                return a.name.localeCompare(b.name, 'zh-CN');
            });
            break;
    }
    
    // 重新渲染列表
    renderHospitalList();
}

// 切换视图
function switchView(viewType) {
    const hospitalList = document.getElementById('hospitalList');
    if (!hospitalList) return;
    
    // 移除所有视图类
    hospitalList.classList.remove('grid-view', 'list-view');
    
    // 添加当前视图类
    hospitalList.classList.add(`${viewType}-view`);
    
    // 重新渲染列表
    renderHospitalList();
}

// 切换地图视图
function toggleMapView() {
    const mapContainer = document.getElementById('mapContainer');
    const listContainer = document.getElementById('listContainer');
    const mapViewBtn = document.getElementById('mapViewBtn');
    
    if (!mapContainer || !listContainer || !mapViewBtn) return;
    
    const isMapVisible = mapContainer.style.display !== 'none';
    
    if (isMapVisible) {
        // 隐藏地图，显示列表
        mapContainer.style.display = 'none';
        listContainer.style.display = 'block';
        mapViewBtn.innerHTML = '<i class="fas fa-map"></i> 地图视图';
        mapViewBtn.classList.remove('active');
    } else {
        // 显示地图，隐藏列表
        mapContainer.style.display = 'block';
        listContainer.style.display = 'none';
        mapViewBtn.innerHTML = '<i class="fas fa-list"></i> 列表视图';
        mapViewBtn.classList.add('active');
        
        // 调整地图大小
        setTimeout(() => {
            if (map) {
                map.resize();
                map.setFitView(markers);
            }
        }, 100);
    }
}

// 切换收藏状态
function toggleFavorite(hospitalId, buttonElement) {
    if (!currentUser) {
        alert('请先登录');
        return;
    }
    
    const isFavorite = buttonElement.classList.contains('active');
    const url = isFavorite 
        ? `${API_BASE_URL}/favorites/remove/`
        : `${API_BASE_URL}/favorites/add/`;
    
    const method = isFavorite ? 'DELETE' : 'POST';
    
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            item_type: 'hospital',
            item_id: hospitalId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 切换按钮状态
            buttonElement.classList.toggle('active');
            
            // 更新本地收藏列表
            if (isFavorite) {
                userFavorites.hospitals = userFavorites.hospitals.filter(id => id !== hospitalId);
            } else {
                userFavorites.hospitals.push(hospitalId);
            }
        } else {
            alert(isFavorite ? '取消收藏失败' : '收藏失败');
        }
    })
    .catch(error => {
        console.error('操作收藏失败:', error);
        alert(isFavorite ? '取消收藏失败' : '收藏失败');
    });
}

// 检查医院是否已收藏
function isHospitalFavorite(hospitalId) {
    if (!currentUser || !userFavorites.hospitals) return false;
    return userFavorites.hospitals.includes(hospitalId);
}

// 加载收藏列表
function loadFavorites() {
    if (!currentUser) return;
    
    fetch(`${API_BASE_URL}/favorites/`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            userFavorites = {
                hospitals: data.hospitals || [],
                doctors: data.doctors || []
            };
            
            // 重新渲染列表以更新收藏状态
            renderHospitalList();
        }
    })
    .catch(error => {
        console.error('加载收藏列表失败:', error);
    });
}

// 渲染分页
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(totalItems / pageSize);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页
    paginationHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // 页码
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `
            <button class="pagination-btn" onclick="changePage(1)">1</button>
        `;
        
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i})">${i}</button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        
        paginationHTML += `
            <button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>
        `;
    }
    
    // 下一页
    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// 切换页面
function changePage(page) {
    const totalPages = Math.ceil(totalItems / pageSize);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    
    // 滚动到顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // 重新渲染列表
    renderHospitalList();
}

// 显示加载状态
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

// 显示错误信息
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}