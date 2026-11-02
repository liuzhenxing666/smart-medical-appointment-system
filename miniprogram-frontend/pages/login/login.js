// 登录页面逻辑
const app = getApp()

Page({
  data: {
    loginType: 'password', // password: 密码登录, code: 验证码登录
    phone: '',
    password: '',
    code: '',
    countdown: 0, // 验证码倒计时
    agreed: false, // 是否同意协议
    canSubmit: false, // 是否可以提交
    statusTip: '', // 状态提示信息
    redirectUrl: '' // 登录后跳转的URL
  },

  onLoad(options) {
    // 如果有跳转参数，可以处理
    if (options.redirect) {
      this.setData({
        redirectUrl: options.redirect
      })
    }
  },

  onShow() {
    // 页面显示时检查是否已登录
    if (app.globalData.token) {
      this.redirectAfterLogin()
    }
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value
    this.setData({
      phone: phone
    })
    this.checkSubmitStatus()
  },

  // 密码输入
  onPasswordInput(e) {
    const password = e.detail.value
    this.setData({
      password: password
    })
    this.checkSubmitStatus()
  },

  // 验证码输入
  onCodeInput(e) {
    const code = e.detail.value
    this.setData({
      code: code
    })
    this.checkSubmitStatus()
  },

  // 协议同意状态改变
  onAgreementChange(e) {
    const agreed = e.detail.value.length > 0
    this.setData({
      agreed: agreed
    })
    this.checkSubmitStatus()
  },

  // 检查是否可以提交
  checkSubmitStatus() {
    const { phone, password, code, loginType } = this.data
    
    // 重置状态
    let canSubmit = false
    let statusTip = ''

    // 基础检查：手机号（暂时移除用户协议检查）
    if (!phone) {
      statusTip = '请输入手机号'
    } else if (phone.length < 11 || phone.length > 20) {
      statusTip = '手机号必须为11-20位数字'
    } else {
      // 登录类型检查
      if (loginType === 'password') {
        if (!password) {
          statusTip = '请输入密码'
        } else if (password.length < 6) {
          statusTip = '密码长度至少6位'
        } else {
          canSubmit = true
          statusTip = ''
        }
      } else {
        if (!code) {
          statusTip = '请输入验证码'
        } else if (code.length !== 6) {
          statusTip = '验证码必须为6位数字'
        } else {
          canSubmit = true
          statusTip = ''
        }
      }
    }

    console.log('提交状态检查:', {
      手机号: phone ? `${phone.substring(0, 3)}****${phone.substring(7)}` : '空',
      登录类型: loginType,
      密码长度: password ? password.length : 0,
      验证码长度: code ? code.length : 0,
      可提交: canSubmit,
      状态提示: statusTip
    })
    
    this.setData({
      canSubmit: canSubmit,
      statusTip: statusTip
    })
  },

  // 切换到验证码登录
  switchToCode() {
    if (this.data.loginType === 'code') return
    
    this.setData({
      loginType: 'code',
      password: '',
      code: ''
    })
    this.checkSubmitStatus()
  },

  // 切换到密码登录
  switchToPassword() {
    if (this.data.loginType === 'password') return
    
    this.setData({
      loginType: 'password',
      code: '',
      password: ''
    })
    this.checkSubmitStatus()
  },

  // 获取验证码
  async getCode() {
    const { phone } = this.data

    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    if (!this.validatePhone(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    // 暂时移除用户协议检查

    wx.showLoading({
      title: '发送中...'
    })

    try {
      const result = await app.request({
        url: 'auth/send-code/',
        method: 'POST',
        data: {
          phone: phone,
          type: 'login'
        }
      })

      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })

        // 开始倒计时
        this.startCountdown()
      } else {
        wx.showToast({
          title: result.message || '发送失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('发送验证码失败:', error)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
    }
  },

  // 开始倒计时
  startCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }

    this.setData({
      countdown: 60
    })

    this.countdownTimer = setInterval(() => {
      const countdown = this.data.countdown - 1

      if (countdown <= 0) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
        this.setData({
          countdown: 0
        })
      } else {
        this.setData({
          countdown: countdown
        })
      }
    }, 1000)
  },

  // 页面卸载时清理倒计时
  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  },

  // 验证手机号格式
  validatePhone(phone) {
    // 允许11-20位数字，以1开头
    const phoneRegex = /^1\d{10,19}$/
    return phoneRegex.test(phone)
  },

  // 登录
  async login() {
    const { phone, password, code, loginType, canSubmit } = this.data

    if (!canSubmit) {
      wx.showToast({
        title: this.data.statusTip || '请完善登录信息',
        icon: 'none'
      })
      return
    }

    if (!this.data.agreed) {
      wx.showToast({
        title: '请先阅读并同意用户协议和隐私政策',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '登录中...'
    })

    try {
      let loginData = {
        phone: phone
      }

      if (loginType === 'password') {
        loginData.password = password
      } else {
        loginData.code = code
      }

      const result = await app.request({
        url: 'users/auth/login/',
        method: 'POST',
        data: loginData
      })

      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 保存登录信息
        app.globalData.token = result.data.access_token
        app.globalData.userInfo = result.data.user

        // 保存到本地存储
        wx.setStorageSync('token', result.data.access_token)
        wx.setStorageSync('userInfo', result.data.user)

        console.log('登录成功，准备跳转，redirectUrl:', this.data.redirectUrl)
        
        // 登录成功后跳转
        this.redirectAfterLogin()
      } else {
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
    }
  },

  // 登录成功后跳转
  redirectAfterLogin() {
    const { redirectUrl } = this.data
    const tabPages = [
      '/pages/index/index',
      '/pages/hospitals/hospitals',
      '/pages/doctors/doctors',
      '/pages/my-appointments/my-appointments',
      '/pages/profile/profile'
    ]

    if (redirectUrl) {
      const path = redirectUrl.split('?')[0]

      // tabBar 页面只能用 switchTab 打开
      if (tabPages.indexOf(path) !== -1) {
        wx.switchTab({
          url: path
        })
        return
      }

      // 跳转到指定的页面
      wx.redirectTo({
        url: redirectUrl
      })
    } else {
      // 跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 跳转到注册页面（暂未开放）
  goToRegister() {
    wx.showToast({
      title: '注册功能即将上线，请使用手机号登录',
      icon: 'none'
    })
  },

  // 跳转到忘记密码页面（暂未开放）
  goToForgetPassword() {
    wx.showToast({
      title: '找回密码功能即将上线',
      icon: 'none'
    })
  },

  // 查看用户协议
  viewUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    })
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    })
  },

  // 微信登录 - 获取手机号
  onGetPhoneNumber(e) {
    console.log('微信登录获取手机号:', e)
    
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 用户同意授权
      const { code } = e.detail
      
      wx.showLoading({
        title: '登录中...'
      })
      
      // 调用微信登录
      app.wxLogin().then(result => {
        wx.hideLoading()
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 登录成功后跳转
        this.redirectAfterLogin()
      }).catch(error => {
        wx.hideLoading()
        console.error('微信登录失败:', error)
        wx.showToast({
          title: error.message || '微信登录失败',
          icon: 'none'
        })
      })
    } else {
      // 用户拒绝授权
      wx.showToast({
        title: '您拒绝了授权',
        icon: 'none'
      })
    }
  },

  // 快捷登录
  quickLogin() {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先阅读并同意用户协议和隐私政策',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '快捷登录',
      content: '请输入手机号进行快捷登录',
      editable: true,
      placeholderText: '请输入手机号',
      success: (res) => {
        if (res.confirm) {
          const phone = res.content
          
          if (!phone) {
            wx.showToast({
              title: '请输入手机号',
              icon: 'none'
            })
            return
          }
          
          if (!this.validatePhone(phone)) {
            wx.showToast({
              title: '请输入正确的手机号',
              icon: 'none'
            })
            return
          }
          
          wx.showLoading({
            title: '登录中...'
          })
          
          // 使用验证码登录方式
          app.request({
            url: 'auth/send-code/',
            method: 'POST',
            data: {
              phone: phone,
              type: 'login'
            }
          }).then(result => {
            if (result.success) {
              // 发送验证码成功，提示用户输入验证码
              wx.hideLoading()
              wx.showModal({
                title: '验证码已发送',
                content: '请输入收到的6位验证码',
                editable: true,
                placeholderText: '请输入验证码',
                success: (res2) => {
                  if (res2.confirm) {
                    const code = res2.content
                    
                    if (!code || code.length !== 6) {
                      wx.showToast({
                        title: '请输入正确的验证码',
                        icon: 'none'
                      })
                      return
                    }
                    
                    wx.showLoading({
                      title: '登录中...'
                    })
                    
                    // 使用验证码登录
                    app.request({
                      url: 'users/auth/login/',
                      method: 'POST',
                      data: {
                        phone: phone,
                        code: code
                      }
                    }).then(loginResult => {
                      wx.hideLoading()
                      
                      if (loginResult.success) {
                        wx.showToast({
                          title: '登录成功',
                          icon: 'success'
                        })
                        
                        // 保存登录信息
                        app.globalData.token = loginResult.data.access_token
                        app.globalData.userInfo = loginResult.data.user
                        
                        wx.setStorageSync('token', loginResult.data.access_token)
                        wx.setStorageSync('userInfo', loginResult.data.user)
                        
                        // 登录成功后跳转
                        this.redirectAfterLogin()
                      } else {
                        wx.showToast({
                          title: loginResult.message || '登录失败',
                          icon: 'none'
                        })
                      }
                    }).catch(loginError => {
                      wx.hideLoading()
                      console.error('快捷登录失败:', loginError)
                      wx.showToast({
                        title: '登录失败，请重试',
                        icon: 'none'
                      })
                    })
                  }
                }
              })
            } else {
              wx.hideLoading()
              wx.showToast({
                title: result.message || '发送验证码失败',
                icon: 'none'
              })
            }
          }).catch(error => {
            wx.hideLoading()
            console.error('发送验证码失败:', error)
            wx.showToast({
              title: '网络错误，请重试',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  // 游客模式体验
  enterAsGuest() {
    wx.showModal({
      title: '游客模式',
      content: '以游客身份体验小程序功能，部分功能可能受限',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 设置游客标识
          app.globalData.isGuest = true
          wx.setStorageSync('isGuest', true)
          
          wx.showToast({
            title: '已进入游客模式',
            icon: 'success'
          })
          
          // 跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          })
        }
      }
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '医疗预约小程序 - 便捷就医服务',
      path: '/pages/index/index'
    }
  }
})
