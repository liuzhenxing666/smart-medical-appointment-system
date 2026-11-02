// 用户端预约挂号页面JavaScript

// 全局变量
let currentDoctor = null;
let currentHospital = null;
let currentDepartment = null;
let selectedDate = null;
let selectedTimeSlot = null;
let selectedPeriod = '';
let timeSlots = [];
let availableDates = [];
let currentUser = null;

// API配置（后端路由前缀为 /api）
const API_BASE_URL = '/api';

// 兼容解包：后端统一响应格式为 {success, message, data}，裸JSON则原样返回
function unwrapApiData(data) {
    if (data && typeof data.success === 'boolean' && Object.prototype.hasOwnProperty.call(data, 'data')) {
        return data.data;
    }
    return data;
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAppointmentPage();
});

function initializeAppointmentPage() {
    // 检查用户登录状态
    checkUserLoginStatus();
    
    // 从URL参数获取医生ID
    const urlParams = new URLSearchParams(window.location.search);
    const doctorId = urlParams.get('doctor');
    
    if (doctorId) {
        loadDoctorDetail(doctorId);
    } else {
        // 如果没有医生ID，显示错误信息
        showError('未指定医生信息，请从医生列表页选择医生');
    }
    
    // 初始化事件监听器
    initEventListeners();
    
    // 初始化日期选择器
    initDatePicker();
}

// 检查用户登录状态
function checkUserLoginStatus() {
    // 从localStorage获取用户信息
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            currentUser = JSON.parse(userInfo);
        } catch (e) {
            console.error('解析用户信息失败:', e);
            localStorage.removeItem('userInfo');
        }
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 日期选择
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.addEventListener('change', handleDateChange);
    }
    
    // 时段选择
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('time-slot-btn')) {
            handleTimeSlotClick(event);
        }
    });
    
    // 预约表单提交
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentSubmit);
    }
    
    // 收藏按钮
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }
    
    // 患者信息切换
    const patientSelfRadio = document.getElementById('patientSelf');
    const patientOtherRadio = document.getElementById('patientOther');
    const patientOtherFields = document.getElementById('patientOtherFields');
    
    if (patientSelfRadio && patientOtherRadio && patientOtherFields) {
        patientSelfRadio.addEventListener('change', function() {
            patientOtherFields.style.display = 'none';
            // 填充当前用户信息
            fillCurrentUserPatientInfo();
        });
        
        patientOtherRadio.addEventListener('change', function() {
            patientOtherFields.style.display = 'block';
        });
    }
    
    // 病历模板选择
    const medicalHistoryTemplate = document.getElementById('medicalHistoryTemplate');
    const descriptionTextarea = document.getElementById('description');
    
    if (medicalHistoryTemplate && descriptionTextarea) {
        medicalHistoryTemplate.addEventListener('change', function() {
            const templateId = this.value;
            if (templateId) {
                loadMedicalHistoryTemplate(templateId);
            } else {
                descriptionTextarea.value = '';
            }
        });
    }
}

// 初始化日期选择器
function initDatePicker() {
    const dateInput = document.getElementById('appointmentDate');
    if (!dateInput) return;
    
    // 设置最小日期为今天
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 格式化为YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    dateInput.min = formatDate(tomorrow);
    
    // 设置最大日期为30天后
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    dateInput.max = formatDate(maxDate);
}

// 修正URL参数中可能混入的非法字符（如尾部斜杠）
function sanitizeId(id) {
    return (id || '').replace(/[^0-9a-fA-F-]/g, '');
}

// 加载医生详情
function loadDoctorDetail(doctorId) {
    const doctorInfoContainer = document.getElementById('doctorInfoContainer');
    if (!doctorInfoContainer) return;

    doctorId = sanitizeId(doctorId);
    showLoading(doctorInfoContainer);

    fetch(`${API_BASE_URL}/doctors/${doctorId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('医生信息不存在');
            }
            return response.json();
        })
        .then(result => {
            const raw = unwrapApiData(result);
            currentDoctor = normalizeDoctor(raw);
            currentHospital = currentDoctor.hospital;
            currentDepartment = currentDoctor.department;

            renderDoctorInfo(currentDoctor);
            renderHospitalInfo(currentHospital);
            renderDepartmentInfo(currentDepartment);

            // 加载可用日期
            loadAvailableDates(doctorId);

            // 加载医生收藏状态
            if (currentUser) {
                checkFavoriteStatus(doctorId);
            }
        })
        .catch(error => {
            console.error('加载医生详情失败:', error);
            doctorInfoContainer.innerHTML = `
                <div class="error-message">
                    <i class="icon-error"></i>
                    <p>加载医生信息失败: ${error.message}</p>
                    <button class="btn btn-primary" onclick="window.history.back()">返回上一页</button>
                </div>
            `;
        });
}

// 将后端医生详情字段映射为前端渲染所需结构
function normalizeDoctor(d) {
    if (!d || typeof d !== 'object') return d;
    // 将排班数组转换为按星期索引的日历对象 {weekday: {morning: true, ...}}
    const scheduleMap = {};
    (d.schedules || []).forEach(s => {
        const wd = s.weekday;
        scheduleMap[wd] = scheduleMap[wd] || {};
        if (s.is_available !== false) {
            (s.time_slot === 'full_day' ? ['morning', 'afternoon'] : [s.time_slot])
                .forEach(p => { scheduleMap[wd][p] = true; });
        }
    });
    return {
        id: d.id,
        name: d.name,
        title: d.title,
        specialty: d.specialty,
        rating: d.average_rating || 0,
        review_count: d.review_count || 0,
        image: d.avatar_url || '',
        introduction: d.education || d.experience || '',
        expertise: d.expertise || d.specialty || '',
        experience: d.experience || '',
        consultation_fee: d.consultation_fee,
        is_available: d.is_available,
        hospital_name: d.hospital_name,
        department_name: d.department_name,
        hospital: d.hospital_obj || null,
        department: d.department_obj || null,
        schedule: scheduleMap
    };
}

// 加载可用日期
function loadAvailableDates(doctorId) {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
    
    showLoading(calendarContainer);
    
    fetch(`${API_BASE_URL}/doctors/${doctorId}/available_dates/`)
        .then(response => response.json())
        .then(result => {
            const data = unwrapApiData(result);
            availableDates = data.dates || [];
            renderCalendar(availableDates);
        })
        .catch(error => {
            console.error('加载可用日期失败:', error);
            calendarContainer.innerHTML = '<p class="error">加载可用日期失败，请稍后重试</p>';
        });
}

// 渲染医生信息
function renderDoctorInfo(doctor) {
    const doctorInfoContainer = document.getElementById('doctorInfoContainer');
    if (!doctorInfoContainer) return;
    
    doctorInfoContainer.innerHTML = `
        <div class="doctor-detail-header">
            <div class="doctor-avatar">
                <img src="${doctor.image || '/static/images/default-doctor.png'}" alt="${doctor.name}">
            </div>
            <div class="doctor-basic-info">
                <h2>${doctor.name} ${doctor.title}</h2>
                <div class="doctor-hospital">${doctor.hospital_name}</div>
                <div class="doctor-department">${doctor.department_name}</div>
                <div class="doctor-rating">
                    <div class="stars">
                        ${generateStarRating(doctor.rating)}
                    </div>
                    <span class="rating-score">${doctor.rating.toFixed(1)}</span>
                    <span class="review-count">(${doctor.review_count}条评价)</span>
                </div>
                <div class="doctor-tags">
                    ${doctor.specialties ? doctor.specialties.map(spec => `<span class="tag">${spec}</span>`).join('') : ''}
                </div>
                <div class="doctor-actions">
                    <button id="favoriteBtn" class="btn btn-outline">
                        <i class="icon-heart"></i> 收藏
                    </button>
                    <button class="btn btn-primary" onclick="scrollToAppointment()">立即预约</button>
                </div>
            </div>
        </div>
        
        <div class="doctor-detail-content">
            <div class="detail-section">
                <h3>医生介绍</h3>
                <p>${doctor.introduction || '暂无介绍'}</p>
            </div>
            
            <div class="detail-section">
                <h3>擅长领域</h3>
                <p>${doctor.expertise || '暂无信息'}</p>
            </div>
            
            <div class="detail-section">
                <h3>执业经历</h3>
                <p>${doctor.experience || '暂无信息'}</p>
            </div>
            
            <div class="detail-section">
                <h3>出诊信息</h3>
                <div class="schedule-info">
                    ${renderScheduleInfo(doctor.schedule)}
                </div>
            </div>
        </div>
    `;
}

// 渲染排班信息
function renderScheduleInfo(schedule) {
    if (!schedule) return '<p>暂无排班信息</p>';
    
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const periods = ['morning', 'afternoon', 'evening'];
    const periodNames = { morning: '上午', afternoon: '下午', evening: '晚上' };
    
    let scheduleHtml = '<div class="schedule-table">';
    
    weekDays.forEach((day, index) => {
        const daySchedule = schedule[index] || {};
        let dayHtml = `<div class="schedule-day">
            <div class="day-name">${day}</div>
            <div class="day-periods">`;
        
        periods.forEach(period => {
            const isActive = daySchedule[period];
            dayHtml += `<div class="period ${isActive ? 'active' : 'inactive'}">${periodNames[period]}</div>`;
        });
        
        dayHtml += `</div></div>`;
        scheduleHtml += dayHtml;
    });
    
    scheduleHtml += '</div>';
    return scheduleHtml;
}

// 渲染医院信息
function renderHospitalInfo(hospital) {
    const hospitalInfoContainer = document.getElementById('hospitalInfoContainer');
    if (!hospitalInfoContainer) return;
    
    hospitalInfoContainer.innerHTML = `
        <div class="hospital-card">
            <div class="hospital-header">
                <h3>${hospital.name}</h3>
                <div class="hospital-level">${hospital.level}</div>
            </div>
            <div class="hospital-info">
                <div class="info-item">
                    <i class="icon-location"></i>
                    <span>${hospital.address}</span>
                </div>
                <div class="info-item">
                    <i class="icon-phone"></i>
                    <span>${hospital.phone}</span>
                </div>
                <div class="info-item">
                    <i class="icon-time"></i>
                    <span>${hospital.working_hours || '暂无信息'}</span>
                </div>
            </div>
            <div class="hospital-actions">
                <button class="btn btn-outline" onclick="showHospitalMap(${hospital.latitude || 0}, ${hospital.longitude || 0})">
                    <i class="icon-map"></i> 查看地图
                </button>
                <button class="btn btn-outline" onclick="callHospital('${hospital.phone}')">
                    <i class="icon-phone"></i> 联系医院
                </button>
            </div>
        </div>
    `;
}

// 渲染科室信息
function renderDepartmentInfo(department) {
    const departmentInfoContainer = document.getElementById('departmentInfoContainer');
    if (!departmentInfoContainer || !department) return;
    
    departmentInfoContainer.innerHTML = `
        <div class="department-card">
            <div class="department-header">
                <h3>${department.name}</h3>
            </div>
            <div class="department-info">
                <div class="info-item">
                    <i class="icon-location"></i>
                    <span>位置: ${department.location || '暂无信息'}</span>
                </div>
                <div class="info-item">
                    <i class="icon-phone"></i>
                    <span>电话: ${department.phone || '暂无信息'}</span>
                </div>
            </div>
        </div>
    `;
}

// 渲染日历
function renderCalendar(dates) {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
    
    if (dates.length === 0) {
        calendarContainer.innerHTML = '<p class="no-data">暂无可预约日期</p>';
        return;
    }
    
    // 获取当前月份
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 创建日历HTML
    let calendarHtml = `
        <div class="appointment-calendar">
            <div class="calendar-header">
                <h3>选择预约日期</h3>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekdays">
                    <div class="weekday">日</div>
                    <div class="weekday">一</div>
                    <div class="weekday">二</div>
                    <div class="weekday">三</div>
                    <div class="weekday">四</div>
                    <div class="weekday">五</div>
                    <div class="weekday">六</div>
                </div>
                <div class="calendar-days">
    `;
    
    // 获取月份第一天
    const firstDay = new Date(currentYear, currentMonth, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // 添加空白日期
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarHtml += '<div class="calendar-day empty"></div>';
    }
    
    // 获取月份天数
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // 添加日期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = formatDateForAPI(date);
        const isAvailable = dates.includes(dateStr);
        const isPast = date < now;
        const isToday = isSameDay(date, now);
        
        calendarHtml += `
            <div class="calendar-day ${isAvailable ? 'available' : ''} ${isPast ? 'past' : ''} ${isToday ? 'today' : ''}" 
                 data-date="${dateStr}"
                 ${isAvailable ? `onclick="selectDate('${dateStr}')"` : ''}>
                <div class="day-number">${day}</div>
                ${isAvailable ? '<div class="available-indicator">可约</div>' : ''}
                ${isToday ? '<div class="today-indicator">今天</div>' : ''}
            </div>
        `;
    }
    
    calendarHtml += `
                </div>
            </div>
        </div>
    `;
    
    calendarContainer.innerHTML = calendarHtml;
}

// 选择日期
function selectDate(dateStr) {
    selectedDate = dateStr;
    selectedTimeSlot = null;
    
    // 更新日期输入框
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.value = dateStr;
    }
    
    // 更新日历中的选中状态
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    const selectedDay = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }
    
    // 加载该日期的可用时段
    loadTimeSlots(dateStr, currentDoctor.id);
}

// 处理日期变化
function handleDateChange(event) {
    const dateStr = event.target.value;
    if (dateStr) {
        selectDate(dateStr);
    } else {
        selectedDate = null;
        selectedTimeSlot = null;
        clearTimeSlots();
    }
}

// 加载可用时段
function loadTimeSlots(date, doctorId) {
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    if (!timeSlotsContainer) return;
    
    showLoading(timeSlotsContainer);
    
    fetch(`${API_BASE_URL}/doctors/${doctorId}/time_slots/?date=${date}`)
        .then(response => response.json())
        .then(result => {
            const data = unwrapApiData(result);
            timeSlots = data.time_slots || [];
            renderTimeSlots(timeSlots);
        })
        .catch(error => {
            console.error('加载时段失败:', error);
            timeSlotsContainer.innerHTML = '<p class="error">加载时段失败，请稍后重试</p>';
        });
}

// 渲染时段
function renderTimeSlots(slots) {
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    if (!timeSlotsContainer) return;
    
    if (slots.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="no-data">该日期暂无可预约时段</p>';
        return;
    }
    
    // 按时段分组
    const groupedSlots = groupSlotsByPeriod(slots);
    
    let slotsHtml = '<div class="time-slots-container">';
    
    Object.keys(groupedSlots).forEach(period => {
        slotsHtml += `
            <div class="time-period">
                <h4>${period}</h4>
                <div class="time-slots">
                    ${groupedSlots[period].map(slot => `
                        <button class="time-slot-btn ${slot.available ? '' : 'disabled'}"
                                data-time="${slot.time}"
                                data-period="${slot.period || ''}"
                                data-available="${slot.available}"
                                ${!slot.available ? 'disabled' : ''}>
                            ${slot.time}
                            ${slot.available ? `<span class="available-count">(${slot.available_count})</span>` : '<span class="full">已满</span>'}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    slotsHtml += '</div>';
    timeSlotsContainer.innerHTML = slotsHtml;
}

// 按时段分组
function groupSlotsByPeriod(slots) {
    const grouped = {
        '上午': [],
        '下午': [],
        '晚上': []
    };
    
    slots.forEach(slot => {
        const hour = parseInt(slot.time.split(':')[0]);
        
        if (hour < 12) {
            grouped['上午'].push(slot);
        } else if (hour < 18) {
            grouped['下午'].push(slot);
        } else {
            grouped['晚上'].push(slot);
        }
    });
    
    return grouped;
}

// 清空时段
function clearTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = '<p class="no-data">请先选择预约日期</p>';
    }
}

// 处理时段点击
function handleTimeSlotClick(event) {
    const button = event.target.closest('.time-slot-btn');
    if (!button) return;

    const time = button.dataset.time;
    const period = button.dataset.period;
    const available = button.dataset.available === 'true';

    if (!available) return;

    // 移除其他按钮的选中状态
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // 添加当前按钮的选中状态
    button.classList.add('selected');

    // 更新选中的时段
    selectedTimeSlot = time;
    selectedPeriod = period || '';

    // 更新预约表单中的时段值
    const timeSlotInput = document.getElementById('timeSlot');
    if (timeSlotInput) {
        timeSlotInput.value = time;
    }

    // 滚动到预约表单
    scrollToElement('appointmentForm');
}

// 填充当前用户患者信息
function fillCurrentUserPatientInfo() {
    if (!currentUser) return;
    
    const patientNameInput = document.getElementById('patientName');
    const patientPhoneInput = document.getElementById('patientPhone');
    const patientIdCardInput = document.getElementById('patientIdCard');
    
    if (patientNameInput) patientNameInput.value = currentUser.name || '';
    if (patientPhoneInput) patientPhoneInput.value = currentUser.phone || '';
    if (patientIdCardInput) patientIdCardInput.value = currentUser.id_card || '';
}

// 加载病历模板
function loadMedicalHistoryTemplate(templateId) {
    fetch(`${API_BASE_URL}/medical_history_templates/${templateId}/`)
        .then(response => response.json())
        .then(data => {
            const descriptionTextarea = document.getElementById('description');
            if (descriptionTextarea) {
                descriptionTextarea.value = data.content || '';
            }
        })
        .catch(error => {
            console.error('加载病历模板失败:', error);
        });
}

// 处理预约表单提交
function handleAppointmentSubmit(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    if (!selectedDate) {
        alert('请选择预约日期');
        return;
    }
    
    if (!selectedTimeSlot) {
        alert('请选择预约时段');
        return;
    }
    
    const formData = new FormData(event.target);
    
    // 验证表单
    if (!validateAppointmentForm(formData)) {
        return;
    }
    
    const appointmentData = {
        doctor: currentDoctor.id,
        hospital: currentHospital ? currentHospital.id : undefined,
        department: currentDepartment ? currentDepartment.id : undefined,
        appointment_date: selectedDate,
        appointment_time: selectedTimeSlot,
        time_slot: selectedPeriod,
        symptoms: formData.get('description') || '',
        patient_name: formData.get('patient_name'),
        patient_phone: formData.get('patient_phone'),
        patient_id_card: formData.get('patient_id_card'),
        is_self: formData.get('patient_type') === 'self'
    };
    
    submitAppointment(appointmentData);
}

// 验证预约表单
function validateAppointmentForm(formData) {
    const patientName = formData.get('patient_name');
    const patientPhone = formData.get('patient_phone');
    const patientIdCard = formData.get('patient_id_card');
    
    if (!patientName || patientName.trim() === '') {
        alert('请输入患者姓名');
        return false;
    }
    
    if (!patientPhone || !/^1[3-9]\d{9}$/.test(patientPhone)) {
        alert('请输入正确的手机号码');
        return false;
    }
    
    if (!patientIdCard || !/^\d{17}[\dXx]$/.test(patientIdCard)) {
        alert('请输入正确的身份证号码');
        return false;
    }
    
    return true;
}

// 提交预约
function submitAppointment(appointmentData) {
    const submitBtn = document.getElementById('submitAppointmentBtn');
    const originalText = submitBtn.textContent;
    
    // 显示加载状态
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    
    fetch(`${API_BASE_URL}/appointments/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(appointmentData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessModal(data);
        } else {
            alert('预约失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('预约失败:', error);
        alert('预约失败，请稍后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

// 显示成功模态框
function showSuccessModal(appointmentData) {
    const modal = document.createElement('div');
    modal.className = 'modal success-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="success-icon">
                <i class="icon-check-circle"></i>
            </div>
            <h2>预约成功</h2>
            <p>您已成功预约，请按时就诊。</p>
            <div class="appointment-info">
                <div class="info-row">
                    <span class="label">预约号:</span>
                    <span class="value">${appointmentData.appointment_no}</span>
                </div>
                <div class="info-row">
                    <span class="label">医生:</span>
                    <span class="value">${currentDoctor.name} ${currentDoctor.title}</span>
                </div>
                <div class="info-row">
                    <span class="label">医院:</span>
                    <span class="value">${currentHospital.name}</span>
                </div>
                <div class="info-row">
                    <span class="label">时间:</span>
                    <span class="value">${appointmentData.date} ${appointmentData.time_slot}</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="closeModal(this)">关闭</button>
                <button class="btn btn-primary" onclick="viewAppointmentDetail('${appointmentData.id}')">查看详情</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 自动关闭并跳转到预约详情
    setTimeout(() => {
        closeModal(modal.querySelector('.modal-actions button'));
        viewAppointmentDetail(appointmentData.id);
    }, 3000);
}

// 查看预约详情
function viewAppointmentDetail(appointmentId) {
    window.location.href = `/appointment-detail/?id=${appointmentId}`;
}

// 检查收藏状态
function checkFavoriteStatus(doctorId) {
    if (!currentUser) return;
    
    fetch(`${API_BASE_URL}/favorites/check/?doctor_id=${doctorId}`, {
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        updateFavoriteButton(data.is_favorite);
    })
    .catch(error => {
        console.error('检查收藏状态失败:', error);
    });
}

// 切换收藏状态
function toggleFavorite() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const favoriteBtn = document.getElementById('favoriteBtn');
    const isFavorite = favoriteBtn.classList.contains('favorited');
    
    const url = isFavorite 
        ? `${API_BASE_URL}/favorites/remove/`
        : `${API_BASE_URL}/favorites/add/`;
    
    const method = isFavorite ? 'DELETE' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            doctor_id: currentDoctor.id
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateFavoriteButton(!isFavorite);
            showToast(isFavorite ? '已取消收藏' : '收藏成功');
        } else {
            showToast('操作失败: ' + (data.message || '未知错误'), 'error');
        }
    })
    .catch(error => {
        console.error('收藏操作失败:', error);
        showToast('操作失败，请稍后重试', 'error');
    });
}

// 更新收藏按钮状态
function updateFavoriteButton(isFavorite) {
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (!favoriteBtn) return;
    
    if (isFavorite) {
        favoriteBtn.classList.add('favorited');
        favoriteBtn.innerHTML = '<i class="icon-heart-filled"></i> 已收藏';
    } else {
        favoriteBtn.classList.remove('favorited');
        favoriteBtn.innerHTML = '<i class="icon-heart"></i> 收藏';
    }
}

// 查看医院地图
function showHospitalMap(latitude, longitude) {
    if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        showToast('暂无地图信息', 'warning');
        return;
    }
    
    // 使用高德地图API
    const mapUrl = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(currentHospital.name)}`;
    window.open(mapUrl, '_blank');
}

// 拨打医院电话
function callHospital(phone) {
    if (!phone) {
        showToast('暂无联系电话', 'warning');
        return;
    }
    
    window.location.href = `tel:${phone}`;
}

// 滚动到预约区域
function scrollToAppointment() {
    scrollToElement('appointmentSection');
}

// 显示登录模态框
function showLoginModal() {
    // 创建登录模态框
    const modal = document.createElement('div');
    modal.className = 'modal login-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>请先登录</h3>
                <button class="modal-close" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <p>您需要登录后才能进行预约操作</p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal(this)">取消</button>
                    <button class="btn btn-primary" onclick="goToLogin()">去登录</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 跳转到登录页面
function goToLogin() {
    // 保存当前页面URL，登录后可以返回
    localStorage.setItem('redirectUrl', window.location.href);
    window.location.href = '/login/';
}

// 关闭模态框
function closeModal(element) {
    const modal = element.closest('.modal');
    if (modal) {
        modal.remove();
    }
}

// 显示提示消息
function showToast(message, type = 'success') {
    // 创建提示元素
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
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 显示加载状态
function showLoading(container) {
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
        </div>
    `;
}

// 显示错误信息
function showError(message) {
    const doctorInfoContainer = document.getElementById('doctorInfoContainer');
    if (doctorInfoContainer) {
        doctorInfoContainer.innerHTML = `
            <div class="error-message">
                <i class="icon-error"></i>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.history.back()">返回上一页</button>
            </div>
        `;
    } else {
        showToast(message, 'error');
    }
}

// 滚动到指定元素
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

// 格式化日期为API需要的格式
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 判断是否为同一天
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 格式化日期显示
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}