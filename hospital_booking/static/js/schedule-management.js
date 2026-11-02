// 医生排班管理页面JavaScript

// 全局变量
let currentDoctor = null;
let schedules = [];
let currentMonth = new Date();
let selectedDate = null;
let timeSlots = [
    { id: 1, name: '上午', periods: ['08:00-08:30', '08:30-09:00', '09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30', '11:30-12:00'] },
    { id: 2, name: '下午', periods: ['14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00', '17:00-17:30', '17:30-18:00'] }
];

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeScheduleManagement();
});

function initializeScheduleManagement() {
    // 获取URL参数中的医生ID
    const urlParams = new URLSearchParams(window.location.search);
    const doctorId = urlParams.get('doctor_id');
    
    if (doctorId) {
        loadDoctorInfo(doctorId);
        loadSchedules(doctorId);
    }
    
    // 初始化事件监听器
    initEventListeners();
    
    // 渲染日历
    renderCalendar();
}

// 初始化事件监听器
function initEventListeners() {
    // 月份切换按钮
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth.setMonth(currentMonth.getMonth() - 1);
            renderCalendar();
            loadSchedules(currentDoctor.id);
        });
    }
    
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            renderCalendar();
            loadSchedules(currentDoctor.id);
        });
    }
    
    // 批量设置排班按钮
    const batchScheduleBtn = document.getElementById('batchScheduleBtn');
    if (batchScheduleBtn) {
        batchScheduleBtn.addEventListener('click', openBatchScheduleModal);
    }
    
    // 保存批量排班按钮
    const saveBatchScheduleBtn = document.getElementById('saveBatchScheduleBtn');
    if (saveBatchScheduleBtn) {
        saveBatchScheduleBtn.addEventListener('click', saveBatchSchedule);
    }
    
    // 保存单个排班按钮
    const saveSingleScheduleBtn = document.getElementById('saveSingleScheduleBtn');
    if (saveSingleScheduleBtn) {
        saveSingleScheduleBtn.addEventListener('click', saveSingleSchedule);
    }
    
    // 删除排班按钮
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-schedule-btn')) {
            const scheduleId = event.target.dataset.scheduleId;
            deleteSchedule(scheduleId);
        }
    });
    
    // 复制排班按钮
    const copyScheduleBtn = document.getElementById('copyScheduleBtn');
    if (copyScheduleBtn) {
        copyScheduleBtn.addEventListener('click', openCopyScheduleModal);
    }
    
    // 保存复制排班按钮
    const saveCopyScheduleBtn = document.getElementById('saveCopyScheduleBtn');
    if (saveCopyScheduleBtn) {
        saveCopyScheduleBtn.addEventListener('click', saveCopySchedule);
    }
    
    // 导出排班按钮
    const exportScheduleBtn = document.getElementById('exportScheduleBtn');
    if (exportScheduleBtn) {
        exportScheduleBtn.addEventListener('click', exportSchedule);
    }
}

// 加载医生信息
function loadDoctorInfo(doctorId) {
    fetch(`${API_BASE_URL}/doctors/${doctorId}/`)
        .then(response => response.json())
        .then(data => {
            currentDoctor = data;
            renderDoctorInfo(data);
        })
        .catch(error => {
            console.error('加载医生信息失败:', error);
        });
}

// 渲染医生信息
function renderDoctorInfo(doctor) {
    const doctorName = document.getElementById('doctorName');
    if (doctorName) doctorName.textContent = doctor.name;
    
    const doctorTitle = document.getElementById('doctorTitle');
    if (doctorTitle) doctorTitle.textContent = doctor.title;
    
    const doctorHospital = document.getElementById('doctorHospital');
    if (doctorHospital) doctorHospital.textContent = doctor.hospital_name;
    
    const doctorSpecialties = document.getElementById('doctorSpecialties');
    if (doctorSpecialties) {
        doctorSpecialties.innerHTML = doctor.specialties.map(specialty => 
            `<span class="tag">${specialty}</span>`
        ).join('');
    }
}

// 加载排班数据
function loadSchedules(doctorId) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    
    fetch(`${API_BASE_URL}/schedules/?doctor_id=${doctorId}&year=${year}&month=${month}`)
        .then(response => response.json())
        .then(data => {
            schedules = data.results || [];
            updateCalendarWithSchedules();
        })
        .catch(error => {
            console.error('加载排班数据失败:', error);
        });
}

// 渲染日历
function renderCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 更新月份显示
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    if (currentMonthDisplay) {
        currentMonthDisplay.textContent = `${year}年${month + 1}月`;
    }
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    // 计算需要显示的天数
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();
    
    // 生成日历HTML
    let calendarHTML = '<div class="calendar-grid">';
    
    // 星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // 上月日期
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        calendarHTML += `<div class="calendar-day prev-month">${day}</div>`;
    }
    
    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateForAPI(date);
        const isToday = isDateToday(date);
        const isWeekend = isDateWeekend(date);
        
        calendarHTML += `
            <div class="calendar-day current-month ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" 
                 data-date="${dateStr}" onclick="selectDate('${dateStr}')">
                <div class="day-number">${day}</div>
                <div class="schedule-indicator" id="schedule-${dateStr}"></div>
            </div>
        `;
    }
    
    // 下月日期
    const totalCells = calendarHTML.split('</div>').length - 1 - 7; // 减去星期标题
    const remainingCells = 42 - totalCells; // 6行 × 7列
    
    for (let day = 1; day <= remainingCells; day++) {
        calendarHTML += `<div class="calendar-day next-month">${day}</div>`;
    }
    
    calendarHTML += '</div>';
    
    calendarContainer.innerHTML = calendarHTML;
}

// 更新日历中的排班指示器
function updateCalendarWithSchedules() {
    schedules.forEach(schedule => {
        const dateStr = schedule.date;
        const indicator = document.getElementById(`schedule-${dateStr}`);
        
        if (indicator) {
            if (schedule.morning_periods && schedule.morning_periods.length > 0) {
                indicator.innerHTML += '<div class="indicator morning">上午</div>';
            }
            
            if (schedule.afternoon_periods && schedule.afternoon_periods.length > 0) {
                indicator.innerHTML += '<div class="indicator afternoon">下午</div>';
            }
        }
    });
}

// 选择日期
function selectDate(dateStr) {
    selectedDate = dateStr;
    
    // 更新选中状态
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    const selectedDay = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }
    
    // 加载该日期的排班详情
    loadScheduleDetail(dateStr);
}

// 加载排班详情
function loadScheduleDetail(dateStr) {
    const schedule = schedules.find(s => s.date === dateStr);
    
    if (schedule) {
        renderScheduleDetail(schedule);
    } else {
        renderEmptyScheduleDetail(dateStr);
    }
}

// 渲染排班详情
function renderScheduleDetail(schedule) {
    const detailContainer = document.getElementById('scheduleDetailContainer');
    if (!detailContainer) return;
    
    let detailHTML = `
        <div class="schedule-detail">
            <div class="detail-header">
                <h3>${schedule.date} 排班详情</h3>
                <div class="detail-actions">
                    <button class="btn btn-outline" onclick="editSchedule('${schedule.date}')">编辑</button>
                    <button class="btn btn-danger" onclick="deleteSchedule('${schedule.id}')">删除</button>
                </div>
            </div>
            
            <div class="detail-content">
                <div class="schedule-period">
                    <h4>上午时段</h4>
                    <div class="time-slots">
    `;
    
    if (schedule.morning_periods && schedule.morning_periods.length > 0) {
        schedule.morning_periods.forEach(period => {
            detailHTML += `
                <div class="time-slot">
                    <span class="period-time">${period.time}</span>
                    <span class="period-status ${period.available ? 'available' : 'unavailable'}">
                        ${period.available ? '可预约' : '已约满'}
                    </span>
                    <span class="period-count">${period.booked_count}/${period.max_count}</span>
                </div>
            `;
        });
    } else {
        detailHTML += '<p>无排班</p>';
    }
    
    detailHTML += `
                    </div>
                </div>
                
                <div class="schedule-period">
                    <h4>下午时段</h4>
                    <div class="time-slots">
    `;
    
    if (schedule.afternoon_periods && schedule.afternoon_periods.length > 0) {
        schedule.afternoon_periods.forEach(period => {
            detailHTML += `
                <div class="time-slot">
                    <span class="period-time">${period.time}</span>
                    <span class="period-status ${period.available ? 'available' : 'unavailable'}">
                        ${period.available ? '可预约' : '已约满'}
                    </span>
                    <span class="period-count">${period.booked_count}/${period.max_count}</span>
                </div>
            `;
        });
    } else {
        detailHTML += '<p>无排班</p>';
    }
    
    detailHTML += `
                    </div>
                </div>
            </div>
        </div>
    `;
    
    detailContainer.innerHTML = detailHTML;
}

// 渲染空排班详情
function renderEmptyScheduleDetail(dateStr) {
    const detailContainer = document.getElementById('scheduleDetailContainer');
    if (!detailContainer) return;
    
    detailContainer.innerHTML = `
        <div class="schedule-detail empty">
            <div class="detail-header">
                <h3>${dateStr} 排班详情</h3>
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="addSchedule('${dateStr}')">添加排班</button>
                </div>
            </div>
            
            <div class="empty-state">
                <p>该日期暂无排班</p>
            </div>
        </div>
    `;
}

// 添加排班
function addSchedule(dateStr) {
    selectedDate = dateStr;
    openSingleScheduleModal();
}

// 编辑排班
function editSchedule(dateStr) {
    selectedDate = dateStr;
    const schedule = schedules.find(s => s.date === dateStr);
    
    if (schedule) {
        openSingleScheduleModal(schedule);
    }
}

// 打开单个排班模态框
function openSingleScheduleModal(schedule = null) {
    const modal = document.getElementById('singleScheduleModal');
    if (!modal) return;
    
    // 设置日期
    const dateInput = document.getElementById('singleScheduleDate');
    if (dateInput) dateInput.value = selectedDate;
    
    // 如果有排班数据，填充表单
    if (schedule) {
        // 填充上午时段
        const morningCheckboxes = document.querySelectorAll('input[name="morning_periods"]');
        morningCheckboxes.forEach(checkbox => {
            const time = checkbox.value;
            const period = schedule.morning_periods.find(p => p.time === time);
            checkbox.checked = !!period;
            
            const maxCountInput = document.getElementById(`morning_${time.replace(':', '_')}_count`);
            if (maxCountInput && period) {
                maxCountInput.value = period.max_count;
            }
        });
        
        // 填充下午时段
        const afternoonCheckboxes = document.querySelectorAll('input[name="afternoon_periods"]');
        afternoonCheckboxes.forEach(checkbox => {
            const time = checkbox.value;
            const period = schedule.afternoon_periods.find(p => p.time === time);
            checkbox.checked = !!period;
            
            const maxCountInput = document.getElementById(`afternoon_${time.replace(':', '_')}_count`);
            if (maxCountInput && period) {
                maxCountInput.value = period.max_count;
            }
        });
    } else {
        // 清空表单
        const allCheckboxes = modal.querySelectorAll('input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => checkbox.checked = false);
        
        const allCountInputs = modal.querySelectorAll('input[type="number"]');
        allCountInputs.forEach(input => input.value = '1');
    }
    
    modal.style.display = 'flex';
}

// 打开批量排班模态框
function openBatchScheduleModal() {
    const modal = document.getElementById('batchScheduleModal');
    if (modal) modal.style.display = 'flex';
}

// 打开复制排班模态框
function openCopyScheduleModal() {
    const modal = document.getElementById('copyScheduleModal');
    if (modal) modal.style.display = 'flex';
}

// 保存单个排班
function saveSingleSchedule() {
    const date = document.getElementById('singleScheduleDate').value;
    const morningPeriods = [];
    const afternoonPeriods = [];
    
    // 收集上午时段
    const morningCheckboxes = document.querySelectorAll('input[name="morning_periods"]:checked');
    morningCheckboxes.forEach(checkbox => {
        const time = checkbox.value;
        const maxCountInput = document.getElementById(`morning_${time.replace(':', '_')}_count`);
        const maxCount = maxCountInput ? parseInt(maxCountInput.value) : 1;
        
        morningPeriods.push({
            time,
            max_count: maxCount,
            available: true,
            booked_count: 0
        });
    });
    
    // 收集下午时段
    const afternoonCheckboxes = document.querySelectorAll('input[name="afternoon_periods"]:checked');
    afternoonCheckboxes.forEach(checkbox => {
        const time = checkbox.value;
        const maxCountInput = document.getElementById(`afternoon_${time.replace(':', '_')}_count`);
        const maxCount = maxCountInput ? parseInt(maxCountInput.value) : 1;
        
        afternoonPeriods.push({
            time,
            max_count: maxCount,
            available: true,
            booked_count: 0
        });
    });
    
    const scheduleData = {
        doctor_id: currentDoctor.id,
        date,
        morning_periods: morningPeriods,
        afternoon_periods: afternoonPeriods
    };
    
    // 显示加载状态
    const saveBtn = document.getElementById('saveSingleScheduleBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '保存中...';
    saveBtn.disabled = true;
    
    // 检查是否已存在该日期的排班
    const existingSchedule = schedules.find(s => s.date === date);
    const method = existingSchedule ? 'PUT' : 'POST';
    const url = existingSchedule 
        ? `${API_BASE_URL}/schedules/${existingSchedule.id}/`
        : `${API_BASE_URL}/schedules/`;
    
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(scheduleData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('排班保存成功');
            closeModal('singleScheduleModal');
            
            // 重新加载排班数据
            loadSchedules(currentDoctor.id);
            
            // 重新加载当前日期的详情
            if (selectedDate === date) {
                loadScheduleDetail(date);
            }
        } else {
            alert('保存失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('保存排班失败:', error);
        alert('保存失败，请稍后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    });
}

// 保存批量排班
function saveBatchSchedule() {
    const startDate = document.getElementById('batchStartDate').value;
    const endDate = document.getElementById('batchEndDate').value;
    const weekdays = Array.from(document.querySelectorAll('input[name="weekdays"]:checked')).map(cb => parseInt(cb.value));
    const morningEnabled = document.getElementById('batchMorningEnabled').checked;
    const afternoonEnabled = document.getElementById('batchAfternoonEnabled').checked;
    
    // 验证
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }
    
    if (weekdays.length === 0) {
        alert('请选择至少一个工作日');
        return;
    }
    
    if (!morningEnabled && !afternoonEnabled) {
        alert('请选择至少一个时段');
        return;
    }
    
    // 生成排班数据
    const schedules = generateBatchSchedules(startDate, endDate, weekdays, morningEnabled, afternoonEnabled);
    
    if (schedules.length === 0) {
        alert('根据所选条件，没有可设置的排班日期');
        return;
    }
    
    // 显示加载状态
    const saveBtn = document.getElementById('saveBatchScheduleBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '保存中...';
    saveBtn.disabled = true;
    
    // 发送批量排班请求
    fetch(`${API_BASE_URL}/schedules/batch/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            doctor_id: currentDoctor.id,
            schedules
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`成功设置${schedules.length}天的排班`);
            closeModal('batchScheduleModal');
            
            // 重新加载排班数据
            loadSchedules(currentDoctor.id);
        } else {
            alert('保存失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('保存批量排班失败:', error);
        alert('保存失败，请稍后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    });
}

// 生成批量排班数据
function generateBatchSchedules(startDate, endDate, weekdays, morningEnabled, afternoonEnabled) {
    const schedules = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 遍历日期范围
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        
        // 检查是否是选中的工作日
        if (weekdays.includes(dayOfWeek)) {
            const dateStr = formatDateForAPI(date);
            
            const morningPeriods = morningEnabled ? timeSlots[0].periods.map(time => ({
                time,
                max_count: 1,
                available: true,
                booked_count: 0
            })) : [];
            
            const afternoonPeriods = afternoonEnabled ? timeSlots[1].periods.map(time => ({
                time,
                max_count: 1,
                available: true,
                booked_count: 0
            })) : [];
            
            schedules.push({
                date: dateStr,
                morning_periods: morningPeriods,
                afternoon_periods: afternoonPeriods
            });
        }
    }
    
    return schedules;
}

// 保存复制排班
function saveCopySchedule() {
    const sourceMonth = document.getElementById('copySourceMonth').value;
    const targetMonth = document.getElementById('copyTargetMonth').value;
    const copyWeekdays = document.getElementById('copyWeekdays').checked;
    const copyTimeSlots = document.getElementById('copyTimeSlots').checked;
    
    // 验证
    if (!sourceMonth || !targetMonth) {
        alert('请选择源月份和目标月份');
        return;
    }
    
    if (sourceMonth === targetMonth) {
        alert('源月份和目标月份不能相同');
        return;
    }
    
    // 显示加载状态
    const saveBtn = document.getElementById('saveCopyScheduleBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '复制中...';
    saveBtn.disabled = true;
    
    // 发送复制排班请求
    fetch(`${API_BASE_URL}/schedules/copy/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
            doctor_id: currentDoctor.id,
            source_month: sourceMonth,
            target_month: targetMonth,
            copy_weekdays: copyWeekdays,
            copy_time_slots: copyTimeSlots
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`成功复制${data.copied_count}天的排班`);
            closeModal('copyScheduleModal');
            
            // 如果目标月份是当前显示的月份，重新加载
            const [targetYear, targetMonth] = targetMonth.split('-');
            if (currentMonth.getFullYear() === parseInt(targetYear) && 
                currentMonth.getMonth() === parseInt(targetMonth) - 1) {
                loadSchedules(currentDoctor.id);
            }
        } else {
            alert('复制失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('复制排班失败:', error);
        alert('复制失败，请稍后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    });
}

// 删除排班
function deleteSchedule(scheduleId) {
    if (!confirm('确定要删除这个排班吗？')) return;
    
    fetch(`${API_BASE_URL}/schedules/${scheduleId}/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${currentUser.token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('排班删除成功');
            
            // 从本地列表中移除
            schedules = schedules.filter(s => s.id !== scheduleId);
            
            // 更新日历
            updateCalendarWithSchedules();
            
            // 如果当前显示的是被删除的排班详情，清空详情
            const deletedSchedule = schedules.find(s => s.id === scheduleId);
            if (deletedSchedule && selectedDate === deletedSchedule.date) {
                renderEmptyScheduleDetail(selectedDate);
            }
        } else {
            alert('删除失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('删除排班失败:', error);
        alert('删除失败，请稍后重试');
    });
}

// 导出排班
function exportSchedule() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    
    window.open(`${API_BASE_URL}/schedules/export/?doctor_id=${currentDoctor.id}&year=${year}&month=${month}&token=${currentUser.token}`);
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 格式化日期为API格式
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    return `${year}-${month}-${day}`;
}

// 判断是否是今天
function isDateToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// 判断是否是周末
function isDateWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0是周日，6是周六
}

// 补零
function padZero(num) {
    return num < 10 ? `0${num}` : num;
}