// 预约管理页面JavaScript

// 全局变量
let currentAppointmentId = null;
let appointmentDataTable = null;
let appointmentFilter = {
    status: 'all',
    date: 'all',
    hospital: 'all',
    doctor: 'all'
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAppointmentManagement();
});

function initializeAppointmentManagement() {
    // 初始化数据表格
    initAppointmentDataTable();
    
    // 加载预约列表
    loadAppointmentList();
    
    // 加载筛选选项
    loadFilterOptions();
    
    // 初始化事件监听器
    initEventListeners();
}

// 初始化事件监听器
function initEventListeners() {
    // 筛选器
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
    }
    
    const hospitalFilter = document.getElementById('hospitalFilter');
    if (hospitalFilter) {
        hospitalFilter.addEventListener('change', applyFilters);
    }
    
    const doctorFilter = document.getElementById('doctorFilter');
    if (doctorFilter) {
        doctorFilter.addEventListener('change', applyFilters);
    }
    
    // 搜索框
    const searchInput = document.getElementById('appointmentSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleAppointmentSearch, 300));
    }
    
    // 导出按钮
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAppointments);
    }
    
    // 批量操作按钮
    const batchConfirmBtn = document.getElementById('batchConfirmBtn');
    if (batchConfirmBtn) {
        batchConfirmBtn.addEventListener('click', batchConfirmAppointments);
    }
    
    const batchCancelBtn = document.getElementById('batchCancelBtn');
    if (batchCancelBtn) {
        batchCancelBtn.addEventListener('click', batchCancelAppointments);
    }
    
    // 全选复选框
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
    }
}

// 初始化预约数据表格
function initAppointmentDataTable() {
    appointmentDataTable = document.getElementById('appointmentDataTable');
    if (!appointmentDataTable) return;
    
    // 这里可以使用第三方表格库如DataTables，或者自定义实现
    // 为了简单起见，我们使用原生JavaScript
}

// 加载预约列表
function loadAppointmentList() {
    const container = document.getElementById('appointmentListContainer');
    if (!container) return;
    
    showLoading(container);
    
    // 构建查询参数
    const params = new URLSearchParams();
    
    if (appointmentFilter.status !== 'all') {
        params.append('status', appointmentFilter.status);
    }
    
    if (appointmentFilter.date !== 'all') {
        params.append('date_filter', appointmentFilter.date);
    }
    
    if (appointmentFilter.hospital !== 'all') {
        params.append('hospital_id', appointmentFilter.hospital);
    }
    
    if (appointmentFilter.doctor !== 'all') {
        params.append('doctor_id', appointmentFilter.doctor);
    }
    
    let url = `${API_BASE_URL}/appointments/`;
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderAppointmentTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">暂无预约数据</p>';
            }
        })
        .catch(error => {
            console.error('加载预约列表失败:', error);
            container.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
        });
}

// 加载筛选选项
function loadFilterOptions() {
    // 加载医院选项
    loadHospitalOptions();
    
    // 加载医生选项
    loadDoctorOptions();
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

// 加载医生选项
function loadDoctorOptions() {
    const doctorSelect = document.getElementById('doctorFilter');
    if (!doctorSelect) return;
    
    fetch(`${API_BASE_URL}/doctors/`)
        .then(response => response.json())
        .then(data => {
            // 保留"全部"选项
            const allOption = doctorSelect.querySelector('option[value="all"]');
            doctorSelect.innerHTML = '';
            doctorSelect.appendChild(allOption);
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(doctor => {
                    const option = document.createElement('option');
                    option.value = doctor.id;
                    option.textContent = `${doctor.name} - ${doctor.hospital_name}`;
                    doctorSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('加载医生列表失败:', error);
        });
}

// 渲染预约表格
function renderAppointmentTable(appointments) {
    const container = document.getElementById('appointmentListContainer');
    if (!container) return;
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th><input type="checkbox" id="selectAll"></th>
            <th>预约编号</th>
            <th>患者姓名</th>
            <th>联系电话</th>
            <th>医院</th>
            <th>医生</th>
            <th>预约日期</th>
            <th>时段</th>
            <th>预约时间</th>
            <th>状态</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="appointment-checkbox" data-id="${appointment.id}"></td>
            <td>${appointment.id}</td>
            <td>${appointment.patient_name}</td>
            <td>${appointment.patient_phone}</td>
            <td>${appointment.hospital_name}</td>
            <td>${appointment.doctor_name}</td>
            <td>${appointment.date}</td>
            <td>${appointment.time_slot}</td>
            <td>${formatDateTime(appointment.created_at)}</td>
            <td><span class="appointment-status ${getStatusClass(appointment.status)}">${getStatusText(appointment.status)}</span></td>
            <td>
                ${getAppointmentActions(appointment)}
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    container.appendChild(table);
}

// 获取预约操作按钮
function getAppointmentActions(appointment) {
    let actions = '';
    
    switch (appointment.status) {
        case 'pending':
            actions = `
                <button class="btn btn-sm btn-primary" onclick="confirmAppointment(${appointment.id})">确认</button>
                <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetail(${appointment.id})">详情</button>
                <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${appointment.id})">取消</button>
            `;
            break;
        case 'confirmed':
            actions = `
                <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetail(${appointment.id})">详情</button>
                <button class="btn btn-sm btn-warning" onclick="completeAppointment(${appointment.id})">完成</button>
                <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${appointment.id})">取消</button>
            `;
            break;
        case 'completed':
            actions = `
                <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetail(${appointment.id})">详情</button>
                <button class="btn btn-sm btn-primary" onclick="viewAppointmentReview(${appointment.id})">查看评价</button>
            `;
            break;
        case 'cancelled':
            actions = `
                <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetail(${appointment.id})">详情</button>
            `;
            break;
    }
    
    return actions;
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
            loadAppointmentList();
        } else {
            alert('确认失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('确认预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 完成预约
function completeAppointment(appointmentId) {
    if (!confirm('确定要将这个预约标记为已完成吗？')) return;
    
    fetch(`${API_BASE_URL}/appointments/${appointmentId}/complete/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('预约已标记为完成');
            loadAppointmentList();
        } else {
            alert('操作失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('完成预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 取消预约
function cancelAppointment(appointmentId) {
    const reason = prompt('请输入取消原因（可选）:');
    
    fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            reason: reason
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('预约已取消');
            loadAppointmentList();
        } else {
            alert('取消失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('取消预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 查看预约详情
function viewAppointmentDetail(appointmentId) {
    window.location.href = `/admin/appointment/${appointmentId}`;
}

// 查看预约评价
function viewAppointmentReview(appointmentId) {
    window.location.href = `/admin/appointment/${appointmentId}/review`;
}

// 搜索预约
function handleAppointmentSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
        loadAppointmentList();
        return;
    }
    
    const container = document.getElementById('appointmentListContainer');
    if (!container) return;
    
    showLoading(container);
    
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('q', query);
    
    // 添加当前筛选条件
    if (appointmentFilter.status !== 'all') {
        params.append('status', appointmentFilter.status);
    }
    
    if (appointmentFilter.date !== 'all') {
        params.append('date_filter', appointmentFilter.date);
    }
    
    if (appointmentFilter.hospital !== 'all') {
        params.append('hospital_id', appointmentFilter.hospital);
    }
    
    if (appointmentFilter.doctor !== 'all') {
        params.append('doctor_id', appointmentFilter.doctor);
    }
    
    let url = `${API_BASE_URL}/appointments/search/?${params.toString()}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                renderAppointmentTable(data.results);
            } else {
                container.innerHTML = '<p class="no-data">未找到匹配的预约</p>';
            }
        })
        .catch(error => {
            console.error('搜索预约失败:', error);
            container.innerHTML = '<p class="error">搜索失败，请稍后重试</p>';
        });
}

// 应用筛选器
function applyFilters() {
    // 更新筛选条件
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        appointmentFilter.status = statusFilter.value;
    }
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        appointmentFilter.date = dateFilter.value;
    }
    
    const hospitalFilter = document.getElementById('hospitalFilter');
    if (hospitalFilter) {
        appointmentFilter.hospital = hospitalFilter.value;
    }
    
    const doctorFilter = document.getElementById('doctorFilter');
    if (doctorFilter) {
        appointmentFilter.doctor = doctorFilter.value;
    }
    
    // 重新加载预约列表
    loadAppointmentList();
}

// 全选/取消全选
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.appointment-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

// 批量确认预约
function batchConfirmAppointments() {
    const selectedIds = getSelectedAppointmentIds();
    
    if (selectedIds.length === 0) {
        alert('请先选择要操作的预约');
        return;
    }
    
    if (!confirm(`确定要确认选中的 ${selectedIds.length} 个预约吗？`)) return;
    
    fetch(`${API_BASE_URL}/appointments/batch_confirm/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            appointment_ids: selectedIds
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`已成功确认 ${data.confirmed_count} 个预约`);
            loadAppointmentList();
        } else {
            alert('批量确认失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('批量确认预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 批量取消预约
function batchCancelAppointments() {
    const selectedIds = getSelectedAppointmentIds();
    
    if (selectedIds.length === 0) {
        alert('请先选择要操作的预约');
        return;
    }
    
    const reason = prompt('请输入取消原因（可选）:');
    
    if (!confirm(`确定要取消选中的 ${selectedIds.length} 个预约吗？`)) return;
    
    fetch(`${API_BASE_URL}/appointments/batch_cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            appointment_ids: selectedIds,
            reason: reason
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`已成功取消 ${data.cancelled_count} 个预约`);
            loadAppointmentList();
        } else {
            alert('批量取消失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('批量取消预约失败:', error);
        alert('操作失败，请稍后重试');
    });
}

// 获取选中的预约ID
function getSelectedAppointmentIds() {
    const checkboxes = document.querySelectorAll('.appointment-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => parseInt(checkbox.dataset.id));
}

// 导出预约数据
function exportAppointments() {
    // 构建查询参数
    const params = new URLSearchParams();
    
    if (appointmentFilter.status !== 'all') {
        params.append('status', appointmentFilter.status);
    }
    
    if (appointmentFilter.date !== 'all') {
        params.append('date_filter', appointmentFilter.date);
    }
    
    if (appointmentFilter.hospital !== 'all') {
        params.append('hospital_id', appointmentFilter.hospital);
    }
    
    if (appointmentFilter.doctor !== 'all') {
        params.append('doctor_id', appointmentFilter.doctor);
    }
    
    let url = `${API_BASE_URL}/appointments/export/`;
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    // 创建下载链接
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    downloadLink.click();
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
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