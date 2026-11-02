// 医生详情页面逻辑
const app = getApp()
const { getDoctorAvatar } = require('../../utils/util')

Page({
  data: {
    doctor: {},
    scheduleDays: [],
    currentDayIndex: 0,
    currentSchedule: [],
    reviews: [],
    reviewStats: {
      total: 0,
      average: 0,
      distribution: [
        { rating: 5, count: 0, percentage: 0 },
        { rating: 4, count: 0, percentage: 0 },
        { rating: 3, count: 0, percentage: 0 },
        { rating: 2, count: 0, percentage: 0 },
        { rating: 1, count: 0, percentage: 0 }
      ]
    },
    isCollected: false,
    isLoading: true,
    avatarText: '医'
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        doctorId: options.id
      })
      this.loadDoctorDetail()
      this.loadDoctorSchedule()
      this.loadDoctorReviews()
      this.checkCollectionStatus()
    } else {
      wx.showToast({
        title: '医生信息不存在',
        icon: 'none'
      })
      wx.navigateBack()
    }
  },

  // 加载医生详情
  async loadDoctorDetail() {
    try {
      this.setData({ isLoading: true })
      
      const result = await app.request({
        url: `doctors/${this.data.doctorId}/`
      })
      
      if (result.success) {
        // 处理医生头像URL
        const doctorData = {
          ...result.data,
          avatar: getDoctorAvatar(result.data)
        }
        
        this.setData({
          doctor: doctorData,
          avatarText: (doctorData.name || '医').charAt(0)
        })
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: result.data.name
        })
      }
    } catch (error) {
      console.error('加载医生详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 加载医生排班
  async loadDoctorSchedule() {
    try {
      const result = await app.request({
        url: `doctors/${this.data.doctorId}/schedules/`
      })
      
      if (result.success) {
        const schedules = result.data.results || []
        
        // 生成未来7天的排班日期
        const days = this.generateScheduleDays()
        
        // 匹配排班数据（基于星期几匹配）
        const scheduleDays = days.map(day => {
          // 获取当前日期的星期几（0=周日, 1=周一, ..., 6=周六）
          const dateObj = new Date(day.fullDate)
          const dayOfWeek = dateObj.getDay()  // 0=周日, 1=周一, ..., 6=周六
          
          // 后端使用0=周一, 6=周日，需要转换
          // 前端：0=周日, 1=周一, 2=周二, 3=周三, 4=周四, 5=周五, 6=周六
          // 后端：0=周一, 1=周二, 2=周三, 3=周四, 4=周五, 5=周六, 6=周日
          
          // 正确的映射关系：
          // 前端周日(0) -> 后端周日(6)
          // 前端周一(1) -> 后端周一(0)
          // 前端周二(2) -> 后端周二(1)
          // 前端周三(3) -> 后端周三(2)
          // 前端周四(4) -> 后端周四(3)
          // 前端周五(5) -> 后端周五(4)
          // 前端周六(6) -> 后端周六(5)
          
          let backendWeekday
          if (dayOfWeek === 0) {
            backendWeekday = 6  // 周日
          } else {
            backendWeekday = dayOfWeek - 1  // 周一至周六
          }
          
          // 调试信息
          console.log('日期:', day.fullDate, '前端星期:', dayOfWeek, '后端星期:', backendWeekday)
          console.log('匹配到的排班:', schedules.filter(schedule => schedule.weekday === backendWeekday))
          
          // 获取匹配的排班数据
          let daySchedules = schedules.filter(schedule => 
            schedule.weekday === backendWeekday
          ).map(schedule => ({
            ...schedule,
            available: schedule.current_appointments < schedule.max_appointments
          }))
          
          // 如果没有排班数据，创建一个默认的排班项，避免显示"暂无排班"
          if (daySchedules.length === 0) {
            daySchedules = [{
              id: `default-${day.fullDate}`,
              weekday: backendWeekday,
              period: '全天',
              time_slot: '全天 08:00-17:00',
              type: 'morning',
              start_time: '08:00',
              end_time: '17:00',
              max_appointments: 20,
              current_appointments: 0,
              price: 50,
              available: true,
              isDefault: true
            }]
          }
          
          return {
            ...day,
            schedules: daySchedules
          }
        })
        
        this.setData({
          scheduleDays: scheduleDays,
          currentSchedule: (scheduleDays[0] && scheduleDays[0].schedules) || []
        })
      }
    } catch (error) {
      console.error('加载医生排班失败:', error)
      // 如果加载失败，创建默认排班数据
      this.createDefaultSchedule()
    }
  },

  // 创建默认排班数据
  createDefaultSchedule() {
    const days = this.generateScheduleDays()
    const scheduleDays = days.map((day, index) => {
      const dateObj = new Date(day.fullDate)
      const dayOfWeek = dateObj.getDay()
      
      let backendWeekday
      if (dayOfWeek === 0) {
        backendWeekday = 6  // 周日
      } else {
        backendWeekday = dayOfWeek - 1  // 周一至周六
      }
      
      return {
        ...day,
        schedules: [{
          id: `default-${day.fullDate}`,
          weekday: backendWeekday,
          period: '全天',
          time_slot: '全天 08:00-17:00',
          type: 'morning',
          start_time: '08:00',
          end_time: '17:00',
          max_appointments: 20,
          current_appointments: 0,
          price: 50,
          available: true,
          isDefault: true
        }]
      }
    })
    
    this.setData({
      scheduleDays: scheduleDays,
      currentSchedule: (scheduleDays[0] && scheduleDays[0].schedules) || []
    })
  },

  // 生成未来7天的排班日期
  generateScheduleDays() {
    const days = []
    const today = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dayName = dayNames[date.getDay()]
      
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      
      days.push({
        day: dayName,
        date: `${month}-${day}`,
        fullDate: date.toISOString().split('T')[0]
      })
    }
    
    return days
  },

  // 选择日期
  selectDay(e) {
    const index = e.currentTarget.dataset.index
    const scheduleDay = this.data.scheduleDays[index]
    
    this.setData({
      currentDayIndex: index,
      currentSchedule: (scheduleDay && scheduleDay.schedules) || []
    })
  },

  // 加载医生评价
  async loadDoctorReviews() {
    try {
      const result = await app.request({
        url: `doctors/${this.data.doctorId}/reviews/`,
        data: { page_size: 3 }
      })
      
      if (result.success) {
        const reviews = (result.data.results || []).map(review => ({
          ...review,
          initial: (review.patient_name || '患').charAt(0)
        }))
        
        // 计算评价统计
        const stats = this.calculateReviewStats(reviews)
        
        this.setData({
          reviews: reviews,
          reviewStats: stats
        })
      }
    } catch (error) {
      console.error('加载医生评价失败:', error)
    }
  },

  // 计算评价统计
  calculateReviewStats(reviews) {
    const distribution = [
      { average_rating: 5, count: 0, percentage: 0 },
      { average_rating: 4, count: 0, percentage: 0 },
      { average_rating: 3, count: 0, percentage: 0 },
      { average_rating: 2, count: 0, percentage: 0 },
      { average_rating: 1, count: 0, percentage: 0 }
    ]
    
    let total = 0
    
    reviews.forEach(review => {
      const rating = Math.floor(review.average_rating)
      if (rating >= 1 && rating <= 5) {
        distribution[5 - rating].count++
        total++
      }
    })
    
    // 计算百分比
    distribution.forEach(item => {
      item.percentage = total > 0 ? (item.count / total) * 100 : 0
    })
    
    return {
      total: total,
      distribution: distribution
    }
  },

  // 检查收藏状态
  async checkCollectionStatus() {
    if (!app.globalData.token) return
    
    try {
      const result = await app.request({
        url: `user/collections/check_collection/?doctor_id=${this.data.doctorId}`,
        method: 'GET'
      })
      
      if (result.success) {
        this.setData({
          isCollected: result.data.is_collected || false
        })
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  },

  // 切换收藏状态
  async toggleCollect() {
    if (!app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }
    
    try {
      const action = this.data.isCollected ? 'delete' : 'add'
      const result = await app.request({
        url: 'user/collections/toggle_collection/',
        method: 'POST',
        data: {
          doctor_id: this.data.doctorId,
          action: action
        }
      })
      
      if (result.success) {
        this.setData({
          isCollected: !this.data.isCollected
        })
        
        wx.showToast({
          title: this.data.isCollected ? '收藏成功' : '取消收藏',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('操作收藏失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 开始在线咨询
  startConsult() {
    if (!app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }
    
    // 咨询页面尚未上线，先给出提示
    wx.showToast({
      title: '在线咨询功能暂未开放',
      icon: 'none'
    })
  },

  // 预约排班
  makeAppointment(e) {
    const schedule = e.currentTarget.dataset.schedule
    
    if (!schedule.available) {
      wx.showToast({
        title: '该时段已满',
        icon: 'none'
      })
      return
    }
    
    if (!app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }
    
    // 跳转到预约确认页面
    wx.navigateTo({
      url: `/pages/appointment-create/appointment-create?doctorId=${this.data.doctorId}&scheduleId=${schedule.id}`
    })
  },

  // 立即预约（不选择具体排班）
  makeAppointmentDirect() {
    if (!app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录才能预约医生',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/doctor-detail/doctor-detail')
            })
          }
        }
      })
      return
    }
    
    // 跳转到预约页面
    wx.navigateTo({
      url: `/pages/appointment-create/appointment-create?doctorId=${this.data.doctorId}`
    })
  },

  // 查看全部评价（评价列表页尚未上线）
  viewAllReviews() {
    wx.showToast({
      title: '更多评价功能暂未开放',
      icon: 'none'
    })
  },

  // 头像加载失败：回退为文字头像
  onImageError() {
    this.setData({
      'doctor.avatar': ''
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `${this.data.doctor.name}医生 - ${this.data.doctor.title}`,
      path: `/pages/doctor-detail/doctor-detail?id=${this.data.doctorId}`,
      imageUrl: this.data.doctor.avatar
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `${this.data.doctor.name}医生 - ${this.data.doctor.title}`,
      imageUrl: this.data.doctor.avatar
    }
  }
})