// 医生管理页面JavaScript

// 全局变量
let currentDoctorId = null;
let doctorForm = null;
let doctorDataTable = null;
let currentHospitalId = null;

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeDoctorManagement();
});

function initializeDoctorManagement() {
    // 获取URL参数中的医院ID（如果是从医院管理页面跳转过来的）
    const urlParams = new URLSearchParams(window.location.search);
    currentHospitalId = urlParams.get('hospital_id');
    
    // 初始化表单
    doctorForm = document.getElementById('doctorForm');
    if (doctorForm) {
        doctorForm.addEventListener('submit', handleDoctorFormSubmit);
    }
    
    // 初始化数据表格
    initDoctorDataTable();
    
    // 加载医生列表
    loadDoctorList();
    
    // 加载医院选项
    loadHospitalOptions();
    
    // 初始化事件监听器
    initEventListeners();
}

// 初始化事件监听器
function initEventListeners() {
    // 添加医生按钮
    const addDoctorBtn = document.getElementById('addDoctorBtn');
    if (addDoctorBtn) {
        addDoctorBtn.addEventListener('click', showAddDoctorModal);
    }
    
    // 搜索框
    const searchInput = document.getElementById('doctorSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleDoctorSearch, 300));
    }
    
    // 筛选器
    const filterSelect = document.getElementById('doctorFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', applyDoctorFilter);
    }
    
    // 医院筛选
    const hospitalFilter = document.getElementById('hospitalFilter');
    if (hospitalFilter) {
        hospitalFilter.addEventListener('change', applyDoctorFilter);
    }
    
    // 模态框关闭按钮
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // 排班管理按钮
    const scheduleBtn = document.getElementById('manageScheduleBtn');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', showScheduleModal);
    }
}

// 初始化医生数据表格
function initDoctorDataTable() {
    doctorDataTable = document.getElementById('doctorDataTable');
    if (!doctorDataTable) return;
    
    // 这里可以使用第三方表格库如DataTables，或者自定义实现
    // 为了简单起见，我们使用原生JavaScript
}

// 加载医生列表
function loadDoctorList() {
    const container = document.getElementById('doctorListContainer');
    if (!container) return;
    
    showLoading(container);
    
    let url = `${API_BASE_URL}/doctors/`;
    if (currentHospitalId) {
        url += `?hospital_id=${currentHospitalId}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderDoctorTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">暂无医生数据</p>';
            }
        })
        .catch(error => {
            console.error('加载医生列表失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 加载医院选项
function loadHospitalOptions() {
    const hospitalSelect = document.getElementById('doctorHospital');
    if (!hospitalSelect) return;
    
    fetch(`${API_BASE_URL}/hospitals/`)
        .then(response => response.json())
        .then(data => {
            hospitalSelect.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(hospital => {
                    const option = document.createElement('option');
                    option.value = hospital.id;
                    option.textContent = hospital.name;
                    
                    // 如果有当前医院ID，设置为默认选中
                    if (currentHospitalId && hospital.id == currentHospitalId) {
                        option.selected = true;
                    }
                    
                    hospitalSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('加载医院列表失败:', error);
        });
}

// 渲染医生表格
function renderDoctorTable(doctors) {
    const container = document.getElementById('doctorListContainer');
    if (!container) return;
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>医生姓名</th>
            <th>职称</th>
            <th>所属医院</th>
            <th>科室</th>
            <th>联系电话</th>
            <th>状态</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    doctors.forEach(doctor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doctor.id}</td>
            <td>${doctor.name}</td>
            <td>${doctor.title || '未设置'}</td>
            <td>${doctor.hospital_name || '未设置'}</td>
            <td>${doctor.department || '未设置'}</td>
            <td>${doctor.phone || '未设置'}</td>
            <td><span class="status-badge ${doctor.is_active ? 'status-active' : 'status-inactive'}">${doctor.is_active ? '启用' : '禁用'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editDoctor(${doctor.id})">编辑</button>
                <button class="btn btn-sm btn-outline" onclick="manageDoctorSchedule(${doctor.id})">排班</button>
                <button class="btn btn-sm btn-danger" onclick="deleteDoctor(${doctor.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    container.appendChild(table);
}

// 显示添加医生模态框
function showAddDoctorModal() {
    const modal = document.getElementById('doctorModal');
    if (!modal) return;
    
    // 重置表单
    doctorForm.reset();
    document.getElementById('modalTitle').textContent = '添加医生';
    document.getElementById('doctorId').value = '';
    
    // 如果有当前医院ID，设置为默认选中
    if (currentHospitalId) {
        const hospitalSelect = document.getElementById('doctorHospital');
        if (hospitalSelect) {
            hospitalSelect.value = currentHospitalId;
        }
    }
    
    // 显示模态框
    modal.style.display = 'block';
}

// 编辑医生
function editDoctor(doctorId) {
    const modal = document.getElementById('doctorModal');
    if (!modal) return;
    
    // 设置当前编辑的医生ID
    currentDoctorId = doctorId;
    
    // 加载医生数据
    fetch(`${API_BASE_URL}/doctors/${doctorId}/`)
        .then(response => response.json())
        .then(doctor => {
            // 填充表单
            document.getElementById('modalTitle').textContent = '编辑医生';
            document.getElementById('doctorId').value = doctor.id;
            document.getElementById('doctorName').value = doctor.name || '';
            document.getElementById('doctorTitle').value = doctor.title || '';
            document.getElementById('doctorHospital').value = doctor.hospital_id || '';
            document.getElementById('doctorDepartment').value = doctor.department || '';
            document.getElementById('doctorPhone').value = doctor.phone || '';
            document.getElementById('doctorSpecialties').value = doctor.specialties ? doctor.specialties.join(', ') : '';
            document.getElementById('doctorExperience').value = doctor.experience || '';
            document.getElementById('doctorIntroduction').value = doctor.introduction || '';
            document.getElementById('doctorIsActive').checked = doctor.is_active;
            
            // 显示模态框
            modal.style.display = 'block';
        })
        .catch(error => {
            console.error('加载医生数据失败:', error);
            alert('加载医生数据失败，请稍后重试');
        });
}

// 管理医生排班
function manageDoctorSchedule(doctorId) {
    window.location.href = `/admin/doctor/${doctorId}/schedule`;
}

// 删除医生
function deleteDoctor(doctorId) {
    if (!confirm('确定要删除这个医生吗？此操作不可恢复！')) return;
    
    fetch(`${API_BASE_URL}/doctors/${doctorId}/`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => {
        if (response.ok) {
            alert('医生已删除');
            loadDoctorList();
        } else {
            throw new Error('删除失败');
        }
    })
    .catch(error => {
        console.error('删除医生失败:', error);
        alert('删除失败，请稍后重试');
    });
}

// 处理医生表单提交
function handleDoctorFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(doctorForm);
    const doctorData = {
        name: formData.get('name'),
        title: formData.get('title'),
        hospital_id: formData.get('hospital'),
        department: formData.get('department'),
        phone: formData.get('phone'),
        specialties: formData.get('specialties').split(',').map(s => s.trim()).filter(s => s),
        experience: formData.get('experience'),
        introduction: formData.get('introduction'),
        is_active: formData.get('is_active') === 'on'
    };
    
    const doctorId = formData.get('doctorId');
    const isEdit = doctorId && doctorId !== '';
    
    const url = isEdit ? 
        `${API_BASE_URL}/doctors/${doctorId}/` : 
        `${API_BASE_URL}/doctors/`;
    
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(doctorData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success || data.id) {
            alert(isEdit ? '医生信息已更新' : '医生添加成功');
            closeModal();
            loadDoctorList();
        } else {
            alert('操作失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('保存医生信息失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 搜索医生
function handleDoctorSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
        loadDoctorList();
        return;
    }
    
    const container = document.getElementById('doctorListContainer');
    if (!container) return;
    
    showLoading(container);
    
    let url = `${API_BASE_URL}/doctors/search/?q=${query}`;
    if (currentHospitalId) {
        url += `&hospital_id=${currentHospitalId}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderDoctorTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">未找到匹配的医生</p>';
            }
        })
        .catch(error => {
            console.error('搜索医生失败:', error);
            container.innerHTML = '<p class="error">搜索失败，请稍后重试</p>';
        });
}

// 应用医生筛选
function applyDoctorFilter() {
    const statusFilter = document.getElementById('doctorFilter').value;
    const hospitalFilter = document.getElementById('hospitalFilter').value;
    
    const container = document.getElementById('doctorListContainer');
    if (!container) return;
    
    showLoading(container);
    
    let url = `${API_BASE_URL}/doctors/`;
    const params = new URLSearchParams();
    
    if (statusFilter !== 'all') {
        params.append('is_active', statusFilter === 'active');
    }
    
    if (hospitalFilter !== 'all') {
        params.append('hospital_id', hospitalFilter);
    } else if (currentHospitalId) {
        params.append('hospital_id', currentHospitalId);
    }
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderDoctorTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">暂无符合条件的医生</p>';
            }
        })
        .catch(error => {
            console.error('加载医生列表失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 显示排班模态框
function showScheduleModal(doctorId) {
    const modal = document.getElementById('scheduleModal');
    if (!modal) return;
    
    // 设置当前医生ID
    currentDoctorId = doctorId;
    
    // 加载医生信息
    fetch(`${API_BASE_URL}/doctors/${doctorId}/`)
        .then(response => response.json())
        .then(doctor => {
            document.getElementById('scheduleDoctorName').textContent = doctor.name;
            document.getElementById('scheduleDoctorTitle').textContent = doctor.title;
            document.getElementById('scheduleDoctorHospital').textContent = doctor.hospital_name;
            
            // 加载排班数据
            loadDoctorSchedule(doctorId);
            
            // 显示模态框
            modal.style.display = 'block';
        })
        .catch(error => {
            console.error('加载医生信息失败:', error);
            alert('加载医生信息失败，请稍后重试');
        });
}

// 加载医生排班
function loadDoctorSchedule(doctorId) {
    const container = document.getElementById('scheduleContainer');
    if (!container) return;
    
    showLoading(container);
    
    fetch(`${API_BASE_URL}/doctors/${doctorId}/schedule/`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderScheduleTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">暂无排班数据</p>';
            }
        })
        .catch(error => {
            console.error('加载排班数据失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 渲染排班表格
function renderScheduleTable(schedules) {
    const container = document.getElementById('scheduleContainer');
    if (!container) return;
    
    const table = document.createElement('table');
    table.className = 'schedule-table';
    
    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>星期</th>
            <th>上午</th>
            <th>下午</th>
            <th>晚上</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    
    // 创建一周的排班数据
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dayMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7 };
    
    weekDays.forEach(day => {
        const daySchedule = schedules.find(s => s.day_of_week === dayMap[day]) || {
            day_of_week: dayMap[day],
            morning_available: false,
            afternoon_available: false,
            evening_available: false
        };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${day}</td>
            <td>
                <input type="checkbox" id="morning_${day}" ${daySchedule.morning_available ? 'checked' : ''} 
                    onchange="updateSchedule(${daySchedule.id || 'new'}, ${dayMap[day]}, 'morning', this.checked)">
            </td>
            <td>
                <input type="checkbox" id="afternoon_${day}" ${daySchedule.afternoon_available ? 'checked' : ''} 
                    onchange="updateSchedule(${daySchedule.id || 'new'}, ${dayMap[day]}, 'afternoon', this.checked)">
            </td>
            <td>
                <input type="checkbox" id="evening_${day}" ${daySchedule.evening_available ? 'checked' : ''} 
                    onchange="updateSchedule(${daySchedule.id || 'new'}, ${dayMap[day]}, 'evening', this.checked)">
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editTimeSlot(${daySchedule.id || 'new'}, ${dayMap[day]})">编辑时段</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

// 更新排班
function updateSchedule(scheduleId, dayOfWeek, period, isAvailable) {
    const url = scheduleId === 'new' ? 
        `${API_BASE_URL}/doctors/${currentDoctorId}/schedule/` : 
        `${API_BASE_URL}/doctors/${currentDoctorId}/schedule/${scheduleId}/`;
    
    const method = scheduleId === 'new' ? 'POST' : 'PUT';
    
    const data = {
        day_of_week: dayOfWeek,
        [`${period}_available`]: isAvailable
    };
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success || data.id) {
            console.log('排班更新成功');
            // 重新加载排班数据
            loadDoctorSchedule(currentDoctorId);
        } else {
            alert('排班更新失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('排班更新失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 编辑时段
function editTimeSlot(scheduleId, dayOfWeek) {
    // 这里可以实现编辑具体时段的功能，比如设置具体的开始和结束时间
    alert('编辑时段功能待实现');
}

// 关闭模态框
function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
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