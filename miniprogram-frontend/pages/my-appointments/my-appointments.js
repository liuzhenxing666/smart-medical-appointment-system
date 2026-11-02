// 我的预约页面逻辑
const app = getApp()
const { buildUrl, getDoctorAvatar } = require('../../utils/util')

const APPOINTMENT_TYPE_TEXT = {
  regular: '普通门诊',
  emergency: '急诊',
  follow_up: '复诊',
  consultation: '咨询',
  surgery: '手术',
  examination: '检查'
}

Page({
  data: {
    currentFilter: 'all', // all, upcoming, pending, history
    appointments: [],
    appointmentStats: {
      total: 0,
      upcoming: 0,
      pending: 0
    },
    loading: false,
    hasMore: false,
    currentPage: 1,
    pageSize: 10,
    // 状态配置，便于统一管理
    statusConfig: {
      'pending': { text: '待确认', class: 'status-pending' },
      'confirmed': { text: '待就诊', class: 'status-confirmed' },
      'completed': { text: '已完成', class: 'status-completed' },
      'cancelled': { text: '已取消', class: 'status-cancelled' },
      'expired': { text: '已过期', class: 'status-expired' },
      'no_show': { text: '未到诊', class: 'status-no_show' },
      'rescheduled': { text: '已改期', class: 'status-rescheduled' }
    }
  },

  onLoad(options) {
    // 进入页面时先应用筛选参数，数据统一在 onShow 中加载
    if (options.filter) {
      this.setData({
        currentFilter: options.filter
      })
    }
  },

  async onShow() {
    if (!this.checkLoginStatus()) {
      return
    }

    // 防止并发加载：如果已经在加载中，直接返回
    if (this.data.loading) {
      console.log('页面正在加载中，跳过本次onShow')
      return
    }

    wx.showLoading({
      title: '加载中...'
    })

    try {
      await this.loadAppointmentStats(false)
      await this.loadAppointments(false, false)
    } catch (error) {
      console.error('页面数据加载失败:', error)
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    if (!app.globalData.token) {
      const token = wx.getStorageSync('token')
      const userInfo = wx.getStorageSync('userInfo')

      if (token && userInfo) {
        app.globalData.token = token
        app.globalData.userInfo = userInfo
        return true
      }

      wx.hideLoading()

      wx.showModal({
        title: '提示',
        content: '请先登录查看预约记录',
        success: (res) => {
          if (res.confirm) {
            const pages = getCurrentPages()
            const currentPage = pages[pages.length - 1]
            const url = currentPage.route
            const options = currentPage.options || {}

            let redirectUrl = `/${url}`
            if (Object.keys(options).length > 0) {
              const params = Object.keys(options).map(key => `${key}=${options[key]}`).join('&')
              redirectUrl += `?${params}`
            }

            wx.redirectTo({
              url: `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}`
            })
          } else {
            wx.navigateBack()
          }
        }
      })
      return false
    }

    return true
  },

  // 加载预约统计
  async loadAppointmentStats(showLoading = true) {
    if (!this.checkLoginStatus()) {
      return
    }

    if (showLoading) {
      wx.showLoading({
        title: '加载中...'
      })
    }

    try {
      const result = await app.request({
        url: 'appointments/statistics/',
        showLoading: false
      })

      if (result.success) {
        // 后端统一返回 {success, message, data}，统计值在 data 中
        const statsData = result.data || {}
        const upcoming = statsData.upcoming !== undefined && statsData.upcoming !== null
          ? statsData.upcoming
          : (statsData.confirmed || 0)

        this.setData({
          appointmentStats: {
            total: statsData.total || 0,
            upcoming: upcoming,
            pending: statsData.pending || 0
          }
        })
      }
    } catch (error) {
      console.error('加载预约统计失败:', error)
    } finally {
      if (showLoading) {
        wx.hideLoading()
      }
    }
  },

  // 加载预约列表
  async loadAppointments(refresh = false, showLoading = true) {
    if (!this.checkLoginStatus()) {
      return
    }

    if (this.data.loading) {
      if (showLoading) {
        wx.hideLoading()
      }
      return
    }

    this.setData({
      loading: true
    })

    if (showLoading) {
      wx.showLoading({
        title: '加载中...'
      })
    }

    try {
      const page = refresh ? 1 : this.data.currentPage

      let url = 'appointments/'
      const params = {
        page: page,
        page_size: this.data.pageSize
      }

      switch (this.data.currentFilter) {
        case 'upcoming':
          params.status = 'confirmed'
          params.upcoming = true
          break
        case 'pending':
          params.status = 'pending'
          break
        case 'history':
          params.status = 'completed,cancelled'
          break
      }

      const result = await app.request({
        url: buildUrl(url, params),
        method: 'GET',
        showLoading: false
      })

      if (result.success) {
        // 兼容 {success, data:{results, next}} 与直接分页对象
        let responseData = result.data

        // 兼容个别接口把 data 与 message 参数写反的返回格式
        if (typeof responseData === 'string' && result.message && typeof result.message === 'object') {
          responseData = result.message
        }

        if (Array.isArray(responseData)) {
          responseData = { results: responseData, next: null }
        } else if (!responseData || responseData.results === undefined) {
          responseData = result.results !== undefined ? result : {}
        }

        const appointments = Array.isArray(responseData.results) ? responseData.results : []
        const hasMore = !!responseData.next

        // 数据去重：合并已有数据与新数据，按 id 保证唯一
        const combined = (refresh ? [] : this.data.appointments).concat(appointments)
        const seenIds = new Set()
        const uniqueAppointments = []

        combined.forEach(item => {
          if (!item) return
          const key = item.id !== undefined && item.id !== null ? item.id : item
          if (seenIds.has(key)) return
          seenIds.add(key)
          uniqueAppointments.push(item)
        })

        const processedAppointments = uniqueAppointments.map(item => ({
          ...item,
          doctor_avatar: getDoctorAvatar(item.doctor),
          doctor_initial: (item.doctor_name || '医').charAt(0),
          formatted_time: this.formatAppointmentTime(item),
          status_class: this.getStatusClass(item.status),
          status_text: this.getStatusText(item.status),
          appointment_type_display: APPOINTMENT_TYPE_TEXT[item.appointment_type] ||
            item.appointment_type || '普通门诊'
        }))

        this.setData({
          appointments: processedAppointments,
          hasMore: hasMore,
          currentPage: page
        })
      } else {
        wx.showToast({
          title: result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载预约列表失败:', error)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({
        loading: false
      })
      if (showLoading) {
        wx.hideLoading()
      }
    }
  },

  // 切换筛选条件
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter

    if (filter === this.data.currentFilter) return

    this.setData({
      currentFilter: filter,
      appointments: [],
      currentPage: 1,
      hasMore: false
    })

    this.loadAppointments(true, false)
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return

    this.setData({
      currentPage: this.data.currentPage + 1
    })

    this.loadAppointments(false, false)
  },

  // 查看预约详情（详情页暂未开放）
  viewAppointmentDetail() {
    wx.showToast({
      title: '预约详情功能暂未开放',
      icon: 'none'
    })
  },

  // 取消预约
  async cancelAppointment(e) {
    const appointmentId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个预约吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '取消中...'
          })

          try {
            const result = await app.request({
              url: `appointments/${appointmentId}/cancel/`,
              method: 'POST',
              showLoading: false
            })

            wx.hideLoading()

            if (result.success) {
              wx.showToast({
                title: '取消成功',
                icon: 'success'
              })

              setTimeout(() => {
                this.loadAppointmentStats(false)
                this.loadAppointments(true, false)
              }, 1000)
            } else {
              wx.showToast({
                title: result.message || '取消失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('取消预约失败:', error)
            wx.showToast({
              title: '网络错误，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 确认到达（后端暂未提供签到接口，提示到院签到方式）
  confirmArrival() {
    wx.showModal({
      title: '确认到达',
      content: '请携带预约信息到院，向分诊台出示预约号完成签到。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 写评价（评价页暂未开放）
  writeReview() {
    wx.showToast({
      title: '评价功能暂未开放',
      icon: 'none'
    })
  },

  // 快速预约：跳转医生列表
  quickAppointment() {
    wx.switchTab({
      url: '/pages/doctors/doctors'
    })
  },

  // 跳转到医生列表
  goToDoctors() {
    wx.switchTab({
      url: '/pages/doctors/doctors'
    })
  },

  // 获取状态文本
  getStatusText(status) {
    const config = this.data.statusConfig[status]
    return config ? config.text : (status || '未知状态')
  },

  // 获取状态样式类
  getStatusClass(status) {
    const config = this.data.statusConfig[status]
    return config ? config.class : 'status-default'
  },

  // 格式化预约时间
  formatAppointmentTime(appointment) {
    if (!appointment.appointment_date || !appointment.appointment_time) {
      return '时间待定'
    }

    const dateParts = String(appointment.appointment_date).split('-')
    const dateStr = dateParts.length === 3
      ? `${Number(dateParts[1])}月${Number(dateParts[2])}日`
      : appointment.appointment_date
    const timeStr = String(appointment.appointment_time).substring(0, 5)

    return `${dateStr} ${timeStr}`
  },

  // 处理图片加载错误
  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const appointments = this.data.appointments.slice()
    const target = appointments[index]

    if (!target) return

    target.avatar_error = true

    this.setData({
      appointments
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    Promise.all([
      this.loadAppointmentStats(false),
      this.loadAppointments(true, false)
    ]).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadMore()
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的医疗预约 - 便捷就医服务',
      path: '/pages/my-appointments/my-appointments'
    }
  }
})
