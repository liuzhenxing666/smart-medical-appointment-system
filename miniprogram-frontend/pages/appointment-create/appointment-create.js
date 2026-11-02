// pages/appointment-create/appointment-create.js
const app = getApp()
const { getDoctorAvatar } = require('../../utils/util')

const APPOINTMENT_TYPES = ['门诊', '专家门诊', '急诊', '复诊']
const TYPE_TO_API = {
  '门诊': 'regular',
  '专家门诊': 'regular',
  '急诊': 'emergency',
  '复诊': 'follow_up'
}

// 预约创建页面
Page({
  data: {
    doctor: null,
    hospital: null,
    doctorAvatar: '',
    avatarFailed: false,
    departmentName: '',
    departmentId: null,
    selectedDate: null,
    selectedTime: null,
    selectedStartTime: null,
    selectedTimeSlot: null,
    selectedScheduleId: null,
    scheduleDays: [],
    availableTimes: [],
    appointmentTypes: APPOINTMENT_TYPES,
    typeIndex: 0,
    appointmentType: APPOINTMENT_TYPES[0],
    patientName: '',
    patientPhone: '',
    patientAge: '',
    patientGender: '',
    genderOptions: ['男', '女'],
    genderIndex: 0,
    description: '',
    isSubmitting: false,
    loading: true,
    loadError: false,
    loadingTimes: false
  },

  onLoad: function (options) {
    console.log('预约页面加载参数:', options)

    if (options.doctorId) {
      if (options.scheduleId) {
        this.preferredScheduleId = options.scheduleId
      }
      this.loadDoctorInfo(options.doctorId)
    } else {
      wx.showToast({
        title: '缺少医生ID',
        icon: 'none'
      })
      wx.navigateBack()
    }
  },

  // 加载医生信息
  loadDoctorInfo: function (doctorId) {
    this.setData({ loading: true })

    wx.request({
      url: `${app.globalData.baseURL}doctors/${doctorId}/`,
      method: 'GET',
      success: (res) => {
        console.log('医生信息:', res.data)

        if (res.statusCode === 200) {
          // 兼容直接返回、包装返回与分页返回三种格式
          let doctorData = res.data

          if (doctorData && doctorData.data && typeof doctorData.data === 'object') {
            if (doctorData.data.results && Array.isArray(doctorData.data.results)) {
              doctorData = doctorData.data.results.find(d => d.id === doctorId)
            } else {
              doctorData = doctorData.data
            }
          }

          if (doctorData && doctorData.id) {
            const hospitalInfo = doctorData.hospital_obj || {
              id: doctorData.hospital,
              name: doctorData.hospital_name || ''
            }

            this.setData({
              doctor: doctorData,
              doctorAvatar: getDoctorAvatar(doctorData),
              hospital: hospitalInfo,
              departmentName: doctorData.department_name ||
                (doctorData.department_obj && doctorData.department_obj.name) || '',
              departmentId: doctorData.department ||
                (doctorData.department_obj && doctorData.department_obj.id) || null,
              loading: false
            })

            this.generateScheduleDays()
          } else {
            wx.showToast({
              title: '获取医生信息失败',
              icon: 'none'
            })
            this.setData({ loading: false, loadError: true })
          }
        } else {
          wx.showToast({
            title: '获取医生信息失败',
            icon: 'none'
          })
          this.setData({ loading: false, loadError: true })
        }
      },
      fail: (error) => {
        console.error('加载医生信息失败:', error)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
        this.setData({ loading: false, loadError: true })
      }
    })
  },

  // 医生头像加载失败
  onImageError: function () {
    this.setData({ avatarFailed: true })
  },

  // 生成排班日期
  generateScheduleDays: function () {
    const days = []
    const today = new Date()

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      days.push({
        date: dateStr,
        dayName: i === 0 ? '今天' : (i === 1 ? '明天' : weekDays[date.getDay()]),
        dayNumber: date.getDate(),
        isToday: i === 0,
        isAvailable: true
      })
    }

    this.setData({
      scheduleDays: days
    })
  },

  // 选择日期
  selectDay: function (e) {
    const date = e.currentTarget.dataset.date
    if (!date) return

    this.setData({
      selectedDate: date,
      selectedTime: null,
      selectedStartTime: null,
      selectedTimeSlot: null,
      selectedScheduleId: null,
      availableTimes: []
    })

    this.loadAvailableTimes(date)
  },

  // 加载可用时间段
  loadAvailableTimes: function (date) {
    this.setData({ loadingTimes: true })

    wx.request({
      url: `${app.globalData.baseURL}doctors/${this.data.doctor.id}/schedules/`,
      method: 'GET',
      data: { date: date },
      success: (res) => {
        console.log('时间段数据:', res.data)

        if (res.statusCode === 200) {
          // 兼容包装格式、分页格式与数组格式
          let scheduleData = res.data

          if (scheduleData && scheduleData.data && typeof scheduleData.data === 'object') {
            scheduleData = scheduleData.data.results && Array.isArray(scheduleData.data.results)
              ? scheduleData.data.results
              : scheduleData.data
          } else if (scheduleData && scheduleData.results && Array.isArray(scheduleData.results)) {
            scheduleData = scheduleData.results
          }

          if (!Array.isArray(scheduleData)) {
            scheduleData = scheduleData ? [scheduleData] : []
          }

          // 后端排班按星期几配置（0=周一 ... 6=周日），需把日期换算为同一口径
          const parts = date.split('-').map(Number)
          const dateObj = new Date(parts[0], parts[1] - 1, parts[2])
          const jsWeekday = dateObj.getDay()
          const backendWeekday = jsWeekday === 0 ? 6 : jsWeekday - 1

          const now = new Date()
          const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
          const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

          const times = scheduleData
            .filter(schedule => Number(schedule.weekday) === backendWeekday && schedule.is_available !== false)
            .map(schedule => {
              const startTime = schedule.start_time ? String(schedule.start_time).substring(0, 5) : ''
              const endTime = schedule.end_time ? String(schedule.end_time).substring(0, 5) : ''
              const max = Number(schedule.max_appointments) || 0
              const current = Number(schedule.current_appointments) || 0
              const remaining = max > 0 ? Math.max(0, max - current) : null
              const isPast = date === nowDate && startTime <= nowTime
              const isAvailable = !isPast && (remaining === null || remaining > 0)

              let statusText = ''
              if (isPast) {
                statusText = '已过时'
              } else if (remaining === 0) {
                statusText = '已约满'
              } else if (remaining !== null && remaining <= 3) {
                statusText = `余 ${remaining}`
              }

              return {
                time: startTime && endTime ? `${startTime}-${endTime}` : startTime,
                scheduleId: schedule.id,
                startTime: startTime,
                timeSlot: schedule.time_slot || '',
                remaining: remaining,
                isAvailable: isAvailable,
                statusText: statusText
              }
            })
            .filter(item => item.time)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))

          this.setData({
            availableTimes: times,
            loadingTimes: false
          })

          // 医生详情页带入的排班优先选中
          if (this.preferredScheduleId) {
            const matched = times.find(item => item.scheduleId === this.preferredScheduleId && item.isAvailable)
            if (matched) {
              this.setData({
                selectedTime: matched.time,
                selectedStartTime: matched.startTime,
                selectedTimeSlot: matched.timeSlot,
                selectedScheduleId: matched.scheduleId
              })
              this.preferredScheduleId = null
            }
          }
        } else {
          this.setData({
            availableTimes: [],
            loadingTimes: false
          })

          wx.showToast({
            title: '获取时间段失败',
            icon: 'none'
          })
        }
      },
      fail: (error) => {
        console.error('加载时间段失败:', error)
        this.setData({
          availableTimes: [],
          loadingTimes: false
        })

        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 选择时间
  selectTime: function (e) {
    const time = e.currentTarget.dataset.time
    const scheduleId = e.currentTarget.dataset.scheduleId

    const matched = this.data.availableTimes.find(item =>
      item.scheduleId === scheduleId && item.time === time
    )

    if (!matched) return

    if (!matched.isAvailable) {
      wx.showToast({
        title: '该时段不可预约',
        icon: 'none'
      })
      return
    }

    this.setData({
      selectedTime: matched.time,
      selectedStartTime: matched.startTime,
      selectedTimeSlot: matched.timeSlot,
      selectedScheduleId: matched.scheduleId
    })
  },

  // 表单输入
  onInputChange: function (e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value

    this.setData({
      [field]: value
    })
  },

  // 选择就诊类型
  onTypeChange: function (e) {
    const index = Number(e.detail.value)
    const label = APPOINTMENT_TYPES[index] || APPOINTMENT_TYPES[0]

    this.setData({
      typeIndex: index,
      appointmentType: label
    })
  },

  // 选择性别
  onGenderChange: function (e) {
    const index = Number(e.detail.value)

    this.setData({
      genderIndex: index,
      patientGender: index === 0 ? '男' : '女'
    })
  },

  // 表单验证
  validateForm: function () {
    if (!this.data.selectedDate) {
      wx.showToast({
        title: '请选择就诊日期',
        icon: 'none'
      })
      return false
    }

    if (!this.data.selectedTime) {
      wx.showToast({
        title: '请选择就诊时间',
        icon: 'none'
      })
      return false
    }

    if (!this.data.selectedScheduleId) {
      console.error('排班ID缺失，选择的时间:', this.data.selectedTime)
      wx.showToast({
        title: '请选择有效的就诊时间段',
        icon: 'none'
      })
      return false
    }

    if (!this.data.patientName.trim()) {
      wx.showToast({
        title: '请输入患者姓名',
        icon: 'none'
      })
      return false
    }

    if (!this.data.patientPhone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      })
      return false
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(this.data.patientPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return false
    }

    if (!this.data.patientAge) {
      wx.showToast({
        title: '请输入患者年龄',
        icon: 'none'
      })
      return false
    }

    if (!this.data.patientGender) {
      wx.showToast({
        title: '请选择患者性别',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 提交预约
  submitAppointment: function () {
    if (!this.validateForm()) {
      return
    }

    this.setData({ isSubmitting: true })

    const doctor = this.data.doctor
    const hospitalId = (this.data.hospital && this.data.hospital.id) || doctor.hospital
    const fee = Number(doctor.consultation_fee) || 0

    // 保留原表单字段，同时补齐后端创建预约所需字段
    const appointmentData = {
      doctor: doctor.id,
      hospital: hospitalId,
      department: this.data.departmentId,
      appointment_date: this.data.selectedDate,
      appointment_time: this.data.selectedStartTime,
      time_slot: this.data.selectedTimeSlot,
      appointment_type: TYPE_TO_API[this.data.appointmentType] || 'regular',
      symptoms: this.data.description,
      appointment_fee: fee,
      consultation_fee: 0,
      schedule: this.data.selectedScheduleId,
      patient_name: this.data.patientName,
      patient_phone: this.data.patientPhone,
      patient_age: this.data.patientAge,
      patient_gender: this.data.patientGender,
      description: this.data.description
    }

    console.log('提交预约数据:', appointmentData)

    wx.request({
      url: `${app.globalData.baseURL}appointments/`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${app.globalData.token || ''}`
      },
      data: appointmentData,
      success: (res) => {
        console.log('预约提交结果:', res)

        if (res.statusCode === 201) {
          if (res.data && res.data.success === false) {
            wx.showToast({
              title: res.data.message || '预约失败',
              icon: 'none'
            })
          } else {
            wx.showToast({
              title: '预约成功',
              icon: 'success'
            })

            setTimeout(() => {
              wx.switchTab({
                url: '/pages/my-appointments/my-appointments'
              })
            }, 1500)
          }
        } else {
          console.error('预约失败:', res.data)
          const errorMessage = (res.data && (res.data.message ||
            (res.data.error && res.data.error.user_message))) || '预约失败，请重试'
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          })
        }

        this.setData({ isSubmitting: false })
      },
      fail: (error) => {
        console.error('预约提交失败:', error)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
        this.setData({ isSubmitting: false })
      }
    })
  },

  // 返回上一页
  goBack: function () {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  }
})
