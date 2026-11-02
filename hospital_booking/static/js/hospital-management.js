// 医院管理页面JavaScript

// 全局变量
let currentHospitalId = null;
let hospitalForm = null;
let hospitalDataTable = null;

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeHospitalManagement();
});

function initializeHospitalManagement() {
    // 初始化表单
    hospitalForm = document.getElementById('hospitalForm');
    if (hospitalForm) {
        hospitalForm.addEventListener('submit', handleHospitalFormSubmit);
    }
    
    // 初始化数据表格
    initHospitalDataTable();
    
    // 加载医院列表
    loadHospitalList();
    
    // 初始化事件监听器
    initEventListeners();
}

// 初始化事件监听器
function initEventListeners() {
    // 添加医院按钮
    const addHospitalBtn = document.getElementById('addHospitalBtn');
    if (addHospitalBtn) {
        addHospitalBtn.addEventListener('click', showAddHospitalModal);
    }
    
    // 搜索框
    const searchInput = document.getElementById('hospitalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleHospitalSearch, 300));
    }
    
    // 筛选器
    const filterSelect = document.getElementById('hospitalFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', applyHospitalFilter);
    }
    
    // 模态框关闭按钮
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
}

// 初始化医院数据表格
function initHospitalDataTable() {
    hospitalDataTable = document.getElementById('hospitalDataTable');
    if (!hospitalDataTable) return;
    
    // 这里可以使用第三方表格库如DataTables，或者自定义实现
    // 为了简单起见，我们使用原生JavaScript
}

// 加载医院列表
function loadHospitalList() {
    const container = document.getElementById('hospitalListContainer');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/hospitals/`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderHospitalTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">暂无医院数据</p>';
            }
        })
        .catch(error => {
            console.error('加载医院列表失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 渲染医院表格
function renderHospitalTable(hospitals) {
    const container = document.getElementById('hospitalListContainer');
    if (!container) return;
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>医院名称</th>
            <th>等级</th>
            <th>地址</th>
            <th>联系电话</th>
            <th>状态</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    hospitals.forEach(hospital => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${hospital.id}</td>
            <td>${hospital.name}</td>
            <td>${hospital.level || '未设置'}</td>
            <td>${hospital.address || '未设置'}</td>
            <td>${hospital.phone || '未设置'}</td>
            <td><span class="status-badge ${hospital.is_active ? 'status-active' : 'status-inactive'}">${hospital.is_active ? '启用' : '禁用'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editHospital(${hospital.id})">编辑</button>
                <button class="btn btn-sm btn-outline" onclick="viewHospitalDoctors(${hospital.id})">查看医生</button>
                <button class="btn btn-sm btn-danger" onclick="deleteHospital(${hospital.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    container.appendChild(table);
}

// 显示添加医院模态框
function showAddHospitalModal() {
    const modal = document.getElementById('hospitalModal');
    if (!modal) return;
    
    // 重置表单
    hospitalForm.reset();
    document.getElementById('modalTitle').textContent = '添加医院';
    document.getElementById('hospitalId').value = '';
    
    // 显示模态框
    modal.style.display = 'block';
}

// 编辑医院
function editHospital(hospitalId) {
    const modal = document.getElementById('hospitalModal');
    if (!modal) return;
    
    // 设置当前编辑的医院ID
    currentHospitalId = hospitalId;
    
    // 加载医院数据
    fetch(`${API_BASE_URL}/hospitals/${hospitalId}/`)
        .then(response => response.json())
        .then(hospital => {
            // 填充表单
            document.getElementById('modalTitle').textContent = '编辑医院';
            document.getElementById('hospitalId').value = hospital.id;
            document.getElementById('hospitalName').value = hospital.name || '';
            document.getElementById('hospitalLevel').value = hospital.level || '';
            document.getElementById('hospitalAddress').value = hospital.address || '';
            document.getElementById('hospitalPhone').value = hospital.phone || '';
            document.getElementById('hospitalDescription').value = hospital.description || '';
            document.getElementById('hospitalIsActive').checked = hospital.is_active;
            
            // 显示模态框
            modal.style.display = 'block';
        })
        .catch(error => {
            console.error('加载医院数据失败:', error);
            alert('加载医院数据失败，请稍后重试');
        });
}

// 查看医院医生
function viewHospitalDoctors(hospitalId) {
    window.location.href = `/admin/hospital/${hospitalId}/doctors`;
}

// 删除医院
function deleteHospital(hospitalId) {
    if (!confirm('确定要删除这个医院吗？此操作不可恢复！')) return;
    
    fetch(`${API_BASE_URL}/hospitals/${hospitalId}/`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => {
        if (response.ok) {
            alert('医院已删除');
            loadHospitalList();
        } else {
            throw new Error('删除失败');
        }
    })
    .catch(error => {
        console.error('删除医院失败:', error);
        alert('删除失败，请稍后重试');
    });
}

// 处理医院表单提交
function handleHospitalFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(hospitalForm);
    const hospitalData = {
        name: formData.get('name'),
        level: formData.get('level'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        description: formData.get('description'),
        is_active: formData.get('is_active') === 'on'
    };
    
    const hospitalId = formData.get('hospitalId');
    const isEdit = hospitalId && hospitalId !== '';
    
    const url = isEdit ? 
        `${API_BASE_URL}/hospitals/${hospitalId}/` : 
        `${API_BASE_URL}/hospitals/`;
    
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(hospitalData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success || data.id) {
            alert(isEdit ? '医院信息已更新' : '医院添加成功');
            closeModal();
            loadHospitalList();
        } else {
            alert('操作失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('保存医院信息失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 搜索医院
function handleHospitalSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
        loadHospitalList();
        return;
    }
    
    const container = document.getElementById('hospitalListContainer');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/hospitals/search/?q=${query}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderHospitalTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">未找到匹配的医院</p>';
            }
        })
        .catch(error => {
            console.error('搜索医院失败:', error);
            container.innerHTML = '<p class="error">搜索失败，请稍后重试</p>';
        });
}

// 应用医院筛选
function applyHospitalFilter() {
    const filterValue = document.getElementById('hospitalFilter').value;
    
    const container = document.getElementById('hospitalListContainer');
    if (!container) return;
    
    showLoading(container);
    
    let url = `${API_BASE_URL}/hospitals/`;
    if (filterValue !== 'all') {
        url += `?is_active=${filterValue === 'active'}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderHospitalTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">暂无符合条件的医院</p>';
            }
        })
        .catch(error => {
            console.error('加载医院列表失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('hospitalModal');
    if (modal) {
        modal.style.display = 'none';
    }
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