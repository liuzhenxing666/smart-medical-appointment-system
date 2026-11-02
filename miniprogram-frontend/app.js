// 小程序入口文件
const { buildUrl } = require('./utils/util')

App({
  // 全局数据
  globalData: {
    userInfo: null,
    token: null,
    baseURL: 'http://127.0.0.1:8000/api/', // 本地开发环境
    userLocation: null
  },

  onLaunch() {
    console.log('小程序启动')
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 获取用户位置（使用异步处理，避免阻塞启动）
    this.getUserLocation().catch(err => {
      console.warn('位置获取失败，但不影响小程序正常使用:', err)
      // 设置默认位置，确保功能可用
      if (!this.globalData.userLocation) {
        this.globalData.userLocation = {
          latitude: 39.9042,
          longitude: 116.4074
        }
      }
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      console.log('用户已登录:', userInfo.nickname)
    } else {
      console.log('用户未登录')
    }
  },

  // 获取用户位置
  getUserLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        altitude: true, // 获取海拔高度
        isHighAccuracy: true, // 高精度定位
        highAccuracyExpireTime: 3000, // 高精度定位超时时间
        success: (res) => {
          const location = {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy, // 定位精度（米）
            altitude: res.altitude // 海拔高度
          }
          this.globalData.userLocation = location
          console.log('获取位置成功:', location, '精度:', res.accuracy + '米')
          
          // 进行逆地理编码获取地址
          this.reverseGeocode(location)
          
          resolve(location)
        },
        fail: (err) => {
          console.error('获取位置失败:', err)
          // 检查是否为模拟器环境
          wx.getSystemInfo({
            success: (sysInfo) => {
              const isSimulator = sysInfo.platform === 'devtools'
              if (isSimulator) {
                console.log('模拟器环境位置获取受限，使用默认位置')
                // 使用更精确的默认位置（北京协和医院）
                const defaultLocation = {
                  latitude: 39.9086,
                  longitude: 116.3974,
                  accuracy: 50,
                  altitude: 44
                }
                this.globalData.userLocation = defaultLocation
                resolve(defaultLocation)
              } else {
                // 非模拟器环境，尝试重新获取位置
                console.log('尝试重新获取位置...')
                wx.showModal({
                  title: '定位失败',
                  content: '是否重新尝试获取位置？',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      // 重新获取位置
                      this.getUserLocation().then(resolve).catch(reject)
                    } else {
                      reject(err)
                    }
                  }
                })
              }
            }
          })
        }
      })
    })
  },

  // 逆地理编码
  reverseGeocode(location) {
    // 检查后端服务是否可用
    wx.request({
      url: `${this.globalData.baseURL}location/tencent/reverse-geocode/`,
      data: {
        location: `${location.longitude},${location.latitude}`
      },
      success: (res) => {
        if (res.data && res.data.success) {
          const address = res.data.data.regeocode.formatted_address
          console.log('逆地理编码成功:', address)
          
          // 保存地址信息
          if (this.globalData.userLocation) {
            this.globalData.userLocation.address = address
          }
        } else {
          console.warn('逆地理编码API返回格式错误，使用默认地址')
          this.setDefaultAddress(location)
        }
      },
      fail: (err) => {
        console.warn('逆地理编码失败，使用默认地址:', err)
        this.setDefaultAddress(location)
      }
    })
  },

  // 设置默认地址
  setDefaultAddress(location) {
    if (this.globalData.userLocation) {
      // 根据经纬度设置默认地址描述
      const defaultAddress = `纬度: ${location.latitude.toFixed(6)}, 经度: ${location.longitude.toFixed(6)}`
      this.globalData.userLocation.address = defaultAddress
      console.log('设置默认地址:', defaultAddress)
    }
  },

  // 微信登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            // 发送code到后端获取token
            wx.request({
              url: `${this.globalData.baseURL}users/auth/wechat-login/`,
              method: 'POST',
              data: {
                code: loginRes.code
              },
              success: (res) => {
                if (res.data.success) {
                  const { access_token, user } = res.data.data
                  
                  // 保存登录信息
                  this.globalData.token = access_token
                  this.globalData.userInfo = user
                  
                  wx.setStorageSync('token', access_token)
                  wx.setStorageSync('userInfo', user)
                  
                  console.log('登录成功:', user.nickname)
                  resolve({ token: access_token, user })
                } else {
                  reject(new Error(res.data.message))
                }
              },
              fail: (err) => {
                reject(err)
              }
            })
          } else {
            reject(new Error('获取code失败'))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  // 统一请求方法
  request(config) {
    return new Promise((resolve, reject) => {
      const { showLoading = true, loadingText = '加载中...' } = config
      
      // 获取当前页面路径
      const pages = getCurrentPages()
      const currentPage = pages.length > 0 ? pages[pages.length - 1].route : 'unknown'
      
      const { url, data, method = 'GET', timeout = 10000 } = config
      let loadingShown = false
      let timeoutTimer = null
      
      if (showLoading) {
        wx.showLoading({
          title: loadingText,
          mask: true
        })
        loadingShown = true
      }
      
      // 设置超时定时器
      timeoutTimer = setTimeout(() => {
        hideLoadingIfNeeded()
        reject(new Error('请求超时，请检查网络连接'))
      }, timeout)
      
      // 确保在任何情况下都能正确隐藏loading
      const hideLoadingIfNeeded = () => {
        if (loadingShown) {
          wx.hideLoading()
          loadingShown = false
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer)
          timeoutTimer = null
        }
      }
      
      // 添加超时保护，确保loading最终会被隐藏
      const timeoutId = setTimeout(() => {
        hideLoadingIfNeeded()
      }, 10000) // 10秒超时
      
      // 确保数据正确序列化
      let requestData = data
      let contentType = 'application/json'
      
      if (data && typeof data === 'object') {
        // 手动序列化数据，避免微信小程序自动序列化问题
        requestData = JSON.stringify(data)
      }
      
      // 构建完整的URL，避免双斜杠问题
      let finalUrl = url
      if (!url.startsWith('http')) {
        // 移除baseURL末尾的斜杠和url开头的斜杠，避免双斜杠
        const baseUrl = this.globalData.baseURL.replace(/\/$/, '')
        const cleanUrl = url.replace(/^\//, '')
        finalUrl = `${baseUrl}/${cleanUrl}`
      }
      
      wx.request({
        url: finalUrl,
        data: requestData,
        method: method,
        header: {
          'Content-Type': contentType,
          'Authorization': this.globalData.token ? `Bearer ${this.globalData.token}` : ''
        },
        dataType: 'json',
        responseType: 'text',
        success: (res) => {
          clearTimeout(timeoutId)
          
          if (res.statusCode === 200) {
            // 支持两种API响应格式：
            // 1. {success: true, data: {...}} - 自定义格式
            // 2. {count, next, previous, results} - Django REST Framework格式
            if (res.data.success !== undefined) {
              // 自定义格式
              if (res.data.success) {
                hideLoadingIfNeeded()
                resolve(res.data)
              } else {
                hideLoadingIfNeeded()
                // 使用setTimeout确保loading完全隐藏后再显示toast
                setTimeout(() => {
                  wx.showToast({
                    title: res.data.message || '请求失败',
                    icon: 'none'
                  })
                }, 100)
                reject(new Error(res.data.message))
              }
            } else if (res.data.results !== undefined) {
              // Django REST Framework格式 - 直接返回成功
              hideLoadingIfNeeded()
              resolve(res.data)
            } else {
              // 其他格式，也认为是成功
              hideLoadingIfNeeded()
              resolve(res.data)
            }
          } else if (res.statusCode === 401) {
            hideLoadingIfNeeded()
            // token过期或无效，清除登录状态并跳转到登录页
            this.globalData.token = null
            this.globalData.userInfo = null
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
            
            setTimeout(() => {
              wx.showModal({
                title: '登录已过期',
                content: '请重新登录',
                showCancel: false,
                success: () => {
                  wx.redirectTo({
                    url: '/pages/login/login'
                  })
                }
              })
            }, 100)
            reject(new Error('认证失败'))
          } else if (res.statusCode === 400) {
            hideLoadingIfNeeded()
            // 400错误，显示后端返回的具体错误信息
            let errorMessage = '请求参数错误'
            let showErrorPage = false
            
            if (res.data && res.data.error) {
              // 使用新的错误格式
              const errorData = res.data.error
              errorMessage = errorData.user_message || errorData.message || '请求参数错误'
              
              // 如果是验证错误，显示更详细的提示
              if (errorData.code === 'validation_error' && errorData.details) {
                const details = errorData.details
                if (typeof details === 'object') {
                  const fieldErrors = Object.values(details).flat()
                  if (fieldErrors.length > 0) {
                    errorMessage = fieldErrors.join('，')
                  }
                }
              }
            } else if (res.data && res.data.message) {
              errorMessage = res.data.message
            } else if (res.data && res.data.detail) {
              errorMessage = res.data.detail
            } else if (res.data && res.data.errors) {
              // 处理字段验证错误
              const errors = res.data.errors
              errorMessage = Object.values(errors).flat().join('，')
            } else if (res.data && res.data.non_field_errors) {
              // 处理非字段错误（如密码错误）
              errorMessage = res.data.non_field_errors.join('，')
            }
            
            // 如果错误信息过长，跳转到错误页面
            if (errorMessage.length > 50) {
              showErrorPage = true
            }
            
            if (showErrorPage) {
              // 跳转到错误页面显示详细错误信息
              wx.redirectTo({
                url: `/pages/error/error?type=server&description=${encodeURIComponent(errorMessage)}&fromPage=${encodeURIComponent(currentPage || 'unknown')}`
              })
            } else {
              setTimeout(() => {
                wx.showToast({
                  title: errorMessage,
                  icon: 'none',
                  duration: 3000
                })
              }, 100)
            }
            reject(new Error(errorMessage))
          } else if (res.statusCode >= 500) {
            hideLoadingIfNeeded()
            // 服务器错误，跳转到错误页面
            let errorMessage = '服务器内部错误，请稍后重试'
            if (res.data && res.data.error && res.data.error.user_message) {
              errorMessage = res.data.error.user_message
            }
            
            wx.redirectTo({
              url: `/pages/error/error?type=server&description=${encodeURIComponent(errorMessage)}&fromPage=${encodeURIComponent(currentPage || 'unknown')}`
            })
            reject(new Error(`服务器错误: ${res.statusCode}`))
          } else {
            hideLoadingIfNeeded()
            // 其他错误状态码
            const errorMessages = {
              401: '请先登录',
              403: '权限不足',
              404: '请求的资源不存在',
              405: '请求方法不被允许',
              429: '请求过于频繁，请稍后重试'
            }
            
            const message = errorMessages[res.statusCode] || `请求失败: ${res.statusCode}`
            
            setTimeout(() => {
              wx.showToast({
                title: message,
                icon: 'none',
                duration: 3000
              })
            }, 100)
            reject(new Error(`HTTP ${res.statusCode}: ${message}`))
          }
        },
        fail: (err) => {
          clearTimeout(timeoutId)
          hideLoadingIfNeeded()
          
          setTimeout(() => {
            wx.showToast({
              title: '网络请求失败',
              icon: 'none'
            })
          }, 100)
          reject(err)
        }
      })
    })
  },

  // 获取附近医院
  getNearbyHospitals(radius = 100) {
    if (!this.globalData.userLocation) {
      return Promise.reject(new Error('未获取到用户位置'))
    }
    
    const { latitude, longitude } = this.globalData.userLocation
    
    // 使用兼容微信小程序的URL构建函数
    const params = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString()
    }
    
    return this.request({
      url: '/hospitals/nearby/',
      data: params,
      method: 'GET',
      timeout: 15000 // 增加超时时间到15秒
    })
  },

  // 搜索医院或医生
  search(keyword, searchType = 'all') {
    return this.request({
      url: '/mini/search/',
      method: 'POST',
      data: {
        keyword: keyword,
        search_type: searchType
      },
      timeout: 15000 // 增加超时时间到15秒
    })
  },

  // 获取首页数据
  getHomeData() {
    let url = '/mini/home/'
    
    // 如果有用户位置信息，添加到查询参数
    if (this.globalData.userLocation) {
      const { latitude, longitude } = this.globalData.userLocation
      const params = {
        latitude: latitude.toString(),
        longitude: longitude.toString()
      }
      url = buildUrl(url, params)
    }
    
    return this.request({
      url: url,
      method: 'GET',
      timeout: 15000 // 增加超时时间到15秒
    })
  },

  // 退出登录
  logout() {
    this.globalData.token = null
    this.globalData.userInfo = null
    
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    
    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    })
  },

  // 获取天气数据
  getWeatherData(city) {
    // 构建带查询参数的URL - 使用高德地图API
    const url = buildUrl('/location/amap/weather/', { city: city })
    
    return this.request({
      url: url,
      method: 'GET',
      timeout: 10000
    })
  }
})