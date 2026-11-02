// 在线咨询页面逻辑
const app = getApp()
const { getDoctorAvatar } = require('../../utils/util')

Page({
  data: {
    doctor: {},
    message: '',
    messages: [],
    isSending: false,
    doctorId: ''
  },

  onLoad(options) {
    if (!this.checkLoginStatus()) {
      return
    }
    
    if (options.doctorId) {
      this.setData({
        doctorId: options.doctorId
      })
      this.loadDoctorDetail()
      this.loadChatHistory()
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
          doctor: doctorData
        })
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: `咨询${result.data.name}医生`
        })
      }
    } catch (error) {
      console.error('加载医生详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载聊天历史
  async loadChatHistory() {
    try {
      const result = await app.request({
        url: `consultations/chat_history/?doctor_id=${this.data.doctorId}`
      })
      
      if (result.success) {
        this.setData({
          messages: result.data || []
        })
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error)
    }
  },

  // 输入消息
  onMessageInput(e) {
    this.setData({
      message: e.detail.value
    })
  },

  // 发送消息
  async sendMessage() {
    if (!this.data.message.trim()) {
      wx.showToast({
        title: '请输入消息内容',
        icon: 'none'
      })
      return
    }

    this.setData({ isSending: true })

    try {
      const messageData = {
        doctor_id: this.data.doctorId,
        content: this.data.message.trim(),
        message_type: 'text'
      }
      
      const result = await app.request({
        url: 'consultations/send_message/',
        method: 'POST',
        data: messageData
      })
      
      if (result.success) {
        // 添加消息到列表
        const newMessage = {
          id: result.data.id,
          content: this.data.message.trim(),
          sender: 'patient',
          created_at: new Date().toISOString(),
          status: 'sent'
        }
        
        this.setData({
          messages: [...this.data.messages, newMessage],
          message: ''
        })
        
        // 滚动到底部
        this.scrollToBottom()
      } else {
        throw new Error(result.message || '发送失败')
      }
      
    } catch (error) {
      console.error('发送消息失败:', error)
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isSending: false })
    }
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery().select('.chat-container').boundingClientRect((rect) => {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.height,
            duration: 300
          })
        }
      }).exec()
    }, 100)
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 图片加载错误处理
  onImageError(e) {
    console.warn('医生头像加载失败:', e.detail);
    
    // 设置默认头像
    const doctor = this.data.doctor;
    doctor.avatar = '../../images/doctor-default.png';
    
    this.setData({
      doctor: doctor
    });
  },

  // 消息头像加载错误处理
  onMessageAvatarError(e) {
    console.warn('消息头像加载失败:', e.detail);
    const { sender } = e.currentTarget.dataset;
    
    if (sender === 'doctor') {
      const doctor = this.data.doctor;
      doctor.avatar = '../../images/doctor-default.png';
      this.setData({
        doctor: doctor
      });
    } else if (sender === 'user') {
      const userInfo = this.data.userInfo;
      if (userInfo) {
        userInfo.avatar = '../../images/default-avatar.png';
        this.setData({
          userInfo: userInfo
        });
      }
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (!token || !userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            // 保存当前页面路径，登录后跳转回来
            const pages = getCurrentPages()
            const currentPage = pages[pages.length - 1]
            const url = currentPage.route
            const options = currentPage.options
            
            // 构建重定向URL
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
    
    // 更新全局数据
    app.globalData.token = token
    app.globalData.userInfo = userInfo
    
    return true
  }
})