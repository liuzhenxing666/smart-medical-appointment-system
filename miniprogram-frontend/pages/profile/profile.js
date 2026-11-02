// 个人中心页面逻辑
const app = getApp()
const { getUserAvatar } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    appointmentStats: {
      total: 0,
      pending: 0,
      upcoming: 0,
      collections: 0,
      reviews: 0
    },
    currentTab: 'profile'
  },

  onLoad() {
    this.checkLoginStatus()
    this.loadUserStats()
  },

  onShow() {
    // 页面显示时重新检查登录状态和统计数据
    this.checkLoginStatus()
    this.loadUserStats()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      const userData = {
        ...userInfo,
        avatar: getUserAvatar(userInfo)
      }
      this.setData({
        userInfo: userData
      })
    } else {
      this.setData({
        userInfo: null
      })
    }
  },

  onImageError(e) {
    console.log('图片加载失败', e)
    const { userInfo } = this.data
    if (userInfo) {
      this.setData({
        'userInfo.avatar': '/assets/images/default-avatar.png'
      })
    }
  },

  // 加载用户统计数据
  async loadUserStats() {
    if (!app.globalData.token) {
      this.setData({
        appointmentStats: {
          total: 0,
          pending: 0,
          upcoming: 0,
          collections: 0,
          reviews: 0
        }
      })
      return
    }

    try {
      // 获取预约统计
      const appointmentResult = await app.request({
        url: 'appointments/statistics/'
      })

      // 获取收藏统计
      const collectionResult = await app.request({
        url: 'user/collections/stats/'
      })

      // 获取评价统计
      const reviewResult = await app.request({
        url: 'reviews/stats/'
      })

      const stats = {
        total: (appointmentResult.data && appointmentResult.data.total) || 0,
        pending: (appointmentResult.data && appointmentResult.data.pending) || 0,
        upcoming: (appointmentResult.data && appointmentResult.data.upcoming) || 0,
        collections: (collectionResult.data && collectionResult.data.total) || 0,
        reviews: (reviewResult.data && reviewResult.data.total) || 0
      }

      this.setData({
        appointmentStats: stats
      })
    } catch (error) {
      console.error('加载用户统计数据失败:', error)
    }
  },

  // 登录
  login() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 退出登录
  async logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用退出登录接口
            await app.request({
              url: '/auth/logout/',
              method: 'POST'
            })
          } catch (error) {
            console.error('退出登录失败:', error)
          } finally {
            // 清除本地存储
            app.globalData.token = null
            app.globalData.userInfo = null
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
            
            this.setData({
              userInfo: null,
              appointmentStats: {
                total: 0,
                pending: 0,
                upcoming: 0,
                collections: 0,
                reviews: 0
              }
            })
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }
        }
      }
    })
  },

  // 查看我的预约（我的预约是 tabBar 页面，需用 switchTab）
  viewMyAppointments() {
    if (!this.checkLogin()) return

    wx.switchTab({
      url: '/pages/my-appointments/my-appointments'
    })
  },

  // 查看即将就诊（携带筛选参数，tabBar 页面改用 reLaunch）
  viewUpcomingAppointments() {
    if (!this.checkLogin()) return

    wx.reLaunch({
      url: '/pages/my-appointments/my-appointments?filter=upcoming'
    })
  },

  // 查看历史记录
  viewHistoryAppointments() {
    if (!this.checkLogin()) return

    wx.reLaunch({
      url: '/pages/my-appointments/my-appointments?filter=history'
    })
  },

  // 我的收藏（功能未开放）
  viewMyCollections() {
    if (!this.checkLogin()) return

    wx.showToast({
      title: '我的收藏功能即将上线',
      icon: 'none'
    })
  },

  // 我的评价（功能未开放）
  viewMyReviews() {
    if (!this.checkLogin()) return

    wx.showToast({
      title: '我的评价功能即将上线',
      icon: 'none'
    })
  },

  // 健康档案（功能未开放）
  viewHealthRecords() {
    if (!this.checkLogin()) return

    wx.showToast({
      title: '健康档案功能即将上线',
      icon: 'none'
    })
  },

  // 咨询记录（功能未开放）
  viewConsultHistory() {
    if (!this.checkLogin()) return

    wx.showToast({
      title: '咨询记录功能即将上线',
      icon: 'none'
    })
  },

  // 编辑个人信息
  editProfile() {
    if (!this.checkLogin()) return

    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    })
  },

  // 更换手机号（功能未开放）
  changePhone() {
    if (!this.checkLogin()) return

    wx.showToast({
      title: '手机绑定功能即将上线',
      icon: 'none'
    })
  },

  // 系统设置（功能未开放）
  viewSettings() {
    wx.showToast({
      title: '系统设置功能即将上线',
      icon: 'none'
    })
  },

  // 帮助中心（功能未开放）
  viewHelp() {
    wx.showToast({
      title: '帮助中心功能即将上线',
      icon: 'none'
    })
  },

  // 关于我们（功能未开放）
  viewAbout() {
    wx.showToast({
      title: '关于我们功能即将上线',
      icon: 'none'
    })
  },

  // 快速预约：先进入医生列表选择医生
  quickAppointment() {
    if (!this.checkLogin()) return

    wx.switchTab({
      url: '/pages/doctors/doctors'
    })
    wx.showToast({
      title: '请选择医生后发起预约',
      icon: 'none'
    })
  },

  // 在线咨询（功能未开放）
  quickConsult() {
    if (!this.checkLogin()) return

    wx.showToast({
      title: '在线咨询功能即将上线',
      icon: 'none'
    })
  },

  // 紧急求助
  emergencyHelp() {
    wx.makePhoneCall({
      phoneNumber: '120'
    })
  },

  // 切换头像
  changeAvatar() {
    if (!this.checkLogin()) return
    
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
        
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: sourceType,
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0]
            this.uploadAvatar(tempFilePath)
          }
        })
      }
    })
  },

  // 上传头像
  async uploadAvatar(tempFilePath) {
    wx.showLoading({
      title: '上传中...'
    })

    try {
      const uploadResult = await app.request({
        url: '/user/avatar/',
        method: 'POST',
        filePath: tempFilePath,
        name: 'avatar'
      })

      if (uploadResult.success) {
        // 更新本地用户信息
        const userInfo = { ...this.data.userInfo, avatar: uploadResult.data.avatar_url }
        app.globalData.userInfo = userInfo
        wx.setStorageSync('userInfo', userInfo)
        
        this.setData({
          userInfo: userInfo
        })
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    
    if (tab === this.data.currentTab) return
    
    this.setData({
      currentTab: tab
    })

    // 根据标签页跳转到对应页面
    switch (tab) {
      case 'home':
        wx.switchTab({
          url: '/pages/index/index'
        })
        break
      case 'hospitals':
        wx.switchTab({
          url: '/pages/hospitals/hospitals'
        })
        break
      case 'doctors':
        wx.switchTab({
          url: '/pages/doctors/doctors'
        })
        break
      case 'profile':
        // 已经是当前页面，不需要跳转
        break
    }
  },

  // 检查登录状态
  checkLogin() {
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
      return false
    }
    return true
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '医疗预约小程序 - 便捷就医服务',
      path: '/pages/index/index'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '医疗预约小程序 - 便捷就医服务'
    }
  }
})