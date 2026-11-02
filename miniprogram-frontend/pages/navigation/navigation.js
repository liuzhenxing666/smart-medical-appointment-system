// pages/navigation/navigation.js
const app = getApp()
const { getImageUrl, showError, showConfirm } = require('../../utils/util')

// 医院导航页面
Page({
  data: {
    // 地图相关数据
    mapCenter: {
      latitude: 26.647661,
      longitude: 106.630153
    },
    mapScale: 14,
    markers: [],
    polyline: [],
    
    // 医院数据
    hospitals: [],
    filteredHospitals: [],
    
    // 搜索相关
    searchKeyword: '',
    
    // 路线规划相关
    selectedHospital: null,
    routeMode: null,
    routeDistance: '',
    routeDuration: '',
    
    // 用户位置
    userLocation: null,
    
    // 加载状态
    loading: false,
    error: null,
    locationError: false
  },

  onLoad: function(options) {
    console.log('导航页面加载，参数:', options)
    
    // 确保app全局对象存在
    if (!app) {
      console.error('全局app对象不存在')
      this.setData({ loading: false })
      return
    }
    
    // 初始化页面
    this.initPage()
  },

  onShow: function() {
    console.log('导航页面显示')
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 如果医院数据为空，重新加载
    if (!this.data.hospitals || this.data.hospitals.length === 0) {
      console.log('医院数据为空，重新加载')
      this.initPage()
    } else {
      // 确保加载状态为false
      if (this.data.loading) {
        console.log('加载状态为true，重置为false')
        this.setData({ loading: false })
      }
    }
  },

  // 初始化页面
  async initPage() {
    console.log('开始初始化导航页面')
    
    try {
      // 设置加载状态
      this.setData({ loading: true })
      
      // 先获取用户位置
      let userLocation = this.data.userLocation
      if (!userLocation) {
        try {
          userLocation = await this.getUserLocation()
          console.log('获取用户位置成功:', userLocation)
        } catch (err) {
          console.warn('获取用户位置失败，使用默认位置:', err)
          userLocation = {
            latitude: 39.904989,
            longitude: 116.405285
          }
        }
      }
      
      // 设置地图中心点
      this.setData({
        mapCenter: userLocation,
        userLocation: userLocation
      })
      
      // 加载医院数据
      try {
        const hospitals = await this.loadHospitals()
        console.log('加载医院数据成功，数量:', hospitals.length)
        
        // 初始化地图标记
        this.initMapMarkers()
        
      } catch (error) {
        console.error('加载医院数据失败:', error)
        // 即使医院数据加载失败，也要确保地图标记初始化
        this.initMapMarkers()
      }
      
    } catch (error) {
      console.error('页面初始化失败:', error)
      this.handleError(error)
    } finally {
      // 确保加载状态被关闭
      this.setData({ loading: false })
      console.log('导航页面初始化完成，加载状态已关闭')
    }
  },

  // 获取用户位置
  getUserLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          console.log('获取用户位置成功:', res)
          
          const userLocation = {
            latitude: res.latitude,
            longitude: res.longitude
          }
          
          this.setData({
            mapCenter: userLocation,
            userLocation: userLocation
          })
          
          // 更新全局用户位置
          app.globalData.userLocation = userLocation
          
          resolve(userLocation)
        },
        fail: (error) => {
          console.warn('获取用户位置失败:', error)
          this.setData({ locationError: true })
          
          // 使用默认位置（贵阳）
          const defaultLocation = {
            latitude: 26.647661,
            longitude: 106.630153
          }
          
          this.setData({
            mapCenter: defaultLocation,
            userLocation: defaultLocation
          })
          
          // 显示位置获取失败提示
          const errMsg = error.errMsg || ''
          if (errMsg.includes('auth deny') || errMsg.includes('auth denied')) {
            showConfirm('请授权位置权限以使用导航功能', '位置权限提示').then((confirmed) => {
              if (!confirmed) return

              wx.openSetting({
                success: (res) => {
                  if (res.authSetting['scope.userLocation']) {
                    this.getUserLocation()
                  }
                }
              })
            })
          }
          
          resolve(defaultLocation)
        }
      })
    })
  },

  // 加载医院数据
  async loadHospitals() {
    try {
      console.log('开始加载医院数据')
      const result = await app.request({
        url: 'hospitals/',
        method: 'GET'
      })
      
      console.log('医院数据API响应:', result)
      
      let hospitals = []
      
      // 处理API响应数据结构
      if (result && typeof result === 'object') {
        if (result.success !== undefined && result.data) {
          hospitals = result.data.results || result.data
        } else if (Array.isArray(result)) {
          hospitals = result
        } else if (result.results) {
          hospitals = result.results
        }
      }
      
      if (Array.isArray(hospitals) && hospitals.length > 0) {
        // 处理医院数据
        const processedHospitals = hospitals.map(hospital => {
          // 处理图片URL
          if (hospital.image_url) {
            hospital.image_url = getImageUrl(hospital.image_url, '', 'hospital')
          }
          
          // 计算距离（如果有用户位置）
          if (this.data.userLocation && hospital.latitude && hospital.longitude) {
            hospital.distance = this.calculateDistance(
              this.data.userLocation.latitude,
              this.data.userLocation.longitude,
              parseFloat(hospital.latitude),
              parseFloat(hospital.longitude)
            ).toFixed(1)
          }
          
          return hospital
        })
        
        this.setData({
          hospitals: processedHospitals,
          filteredHospitals: processedHospitals
        })
        
        console.log('处理后的医院数据:', processedHospitals)
        return processedHospitals
      } else {
        console.error('医院数据格式异常或为空:', result)
        // 使用模拟数据作为降级方案
        const mockHospitals = this.getMockHospitals()
        this.setData({
          hospitals: mockHospitals,
          filteredHospitals: mockHospitals
        })
        console.log('使用模拟医院数据:', mockHospitals)
        return mockHospitals
      }
      
    } catch (error) {
      console.error('加载医院数据失败:', error)
      // 使用模拟数据作为降级方案
      const mockHospitals = this.getMockHospitals()
      this.setData({
        hospitals: mockHospitals,
        filteredHospitals: mockHospitals
      })
      console.log('使用模拟医院数据:', mockHospitals)
      return mockHospitals
    }
  },
  
  // 获取模拟医院数据（降级方案）
  getMockHospitals() {
    return [
      {
        id: 1,
        name: "北京协和医院",
        address: "北京市东城区东单帅府园1号",
        latitude: 39.914170,
        longitude: 116.414200,
        image_url: "../../images/hospital-default.png",
        level: "三级甲等",
        rating: 4.8
      },
      {
        id: 2,
        name: "北京同仁医院",
        address: "北京市东城区东交民巷1号",
        latitude: 39.904200,
        longitude: 116.407400,
        image_url: "../../images/hospital-default.png",
        level: "三级甲等",
        rating: 4.7
      },
      {
        id: 3,
        name: "北京人民医院",
        address: "北京市西城区西直门南大街11号",
        latitude: 39.929500,
        longitude: 116.363200,
        image_url: "../../images/hospital-default.png",
        level: "三级甲等",
        rating: 4.6
      }
    ]
  },

  // 初始化地图标记
  initMapMarkers() {
    console.log('开始初始化地图标记')
    const hospitals = this.data.hospitals || []
    console.log('医院数据数量:', hospitals.length)
    
    if (hospitals.length === 0) {
      console.warn('没有医院数据，无法创建地图标记')
      return
    }
    
    const markers = hospitals.map((hospital, index) => {
      // 确保医院有有效的经纬度
      if (!hospital.latitude || !hospital.longitude) {
        console.warn('医院缺少经纬度数据:', hospital.name)
        return null
      }
      
      return {
        id: hospital.id,
        latitude: parseFloat(hospital.latitude),
        longitude: parseFloat(hospital.longitude),
        title: hospital.name,
        iconPath: '../../images/hospital-marker.png',
        width: 40,
        height: 40,
        callout: {
          content: hospital.name,
          color: '#333',
          fontSize: 14,
          borderRadius: 8,
          padding: 8,
          display: 'ALWAYS'
        }
      }
    }).filter(marker => marker !== null)
    
    // 添加用户位置标记
    if (this.data.userLocation) {
      markers.unshift({
        id: 'user',
        latitude: this.data.userLocation.latitude,
        longitude: this.data.userLocation.longitude,
        iconPath: '../../images/location-marker.png',
        width: 30,
        height: 30
      })
    }
    
    console.log('创建地图标记数量:', markers.length)
    this.setData({ markers })
  },

  // 计算两点间距离（公里）
  calculateDistance(lat1, lng1, lat2, lng2) {
    const rad = (d) => d * Math.PI / 180.0
    
    const radLat1 = rad(lat1)
    const radLat2 = rad(lat2)
    const a = radLat1 - radLat2
    const b = rad(lng1) - rad(lng2)
    
    let distance = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
    
    distance = distance * 6378.137 // 地球半径
    distance = Math.round(distance * 10000) / 10000
    
    return distance
  },

  // 添加重试初始化方法
  retryInit() {
    console.log('重试初始化导航页面')
    this.setData({
      hospitals: [],
      filteredHospitals: [],
      markers: []
    })
    this.initPage()
  },

  // 处理错误并显示重试按钮
  handleError(error) {
    console.error('导航页面错误:', error)
    this.setData({ 
      loading: false,
      error: error.message || '页面加载失败'
    })
    
    wx.showModal({
      title: '加载失败',
      content: '页面加载失败，是否重试？',
      confirmText: '重试',
      success: (res) => {
        if (res.confirm) {
          this.retryInit()
        }
      }
    })
  },

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ searchKeyword: keyword })
    this.filterHospitals(keyword)
  },

  // 清空搜索
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.filterHospitals('')
  },

  // 过滤医院列表
  filterHospitals(keyword) {
    if (!keyword) {
      this.setData({ filteredHospitals: this.data.hospitals })
      return
    }
    
    const filtered = this.data.hospitals.filter(hospital => 
      hospital.name.includes(keyword) || 
      (hospital.address && hospital.address.includes(keyword))
    )
    
    this.setData({ filteredHospitals: filtered })
  },

  // 选择医院
  selectHospital(e) {
    const hospital = e.currentTarget.dataset.hospital
    console.log('选择医院:', hospital)
    
    if (!hospital.latitude || !hospital.longitude) {
      showError('该医院暂无位置信息')
      return
    }
    
    this.setData({
      selectedHospital: hospital,
      routeMode: true,
      mapCenter: {
        latitude: parseFloat(hospital.latitude),
        longitude: parseFloat(hospital.longitude)
      },
      mapScale: 16
    })
  },

  // 关闭路线规划面板
  closeRoutePanel() {
    this.setData({
      selectedHospital: null,
      routeMode: null,
      routeDistance: '',
      routeDuration: ''
    })
  },

  // 路线规划
  planRoute(e) {
    const mode = e.currentTarget.dataset.mode
    const hospital = this.data.selectedHospital
    
    if (!hospital || !this.data.userLocation) {
      showError('无法进行路线规划')
      return
    }
    
    this.setData({ loading: true })
    
    // 调用后端路径规划API - 使用腾讯地图API
    wx.request({
      url: app.globalData.baseURL + 'location/tencent/route-planning/',
      method: 'GET',
      data: {
        origin: `${this.data.userLocation.longitude},${this.data.userLocation.latitude}`,
        destination: `${hospital.longitude},${hospital.latitude}`,
        type: mode
      },
      success: (res) => {
          console.log('路径规划API响应:', res)
          
          if (res.data && res.data.status === '1') {
            const routeData = res.data
            
            if (routeData.route && routeData.route.paths && routeData.route.paths.length > 0) {
              const route = routeData.route.paths[0]
              const distance = route.distance || 0
              const duration = route.duration || 0
              
              // 转换为可读格式
              const distanceText = (distance / 1000).toFixed(1) + '公里'
              const durationText = Math.round(duration / 60) + '分钟'
              
              this.setData({
                routeDistance: distanceText,
                routeDuration: durationText,
                loading: false
              })
              
              // 调用微信内置地图导航
              this.openMapNavigation(mode, hospital)
            } else {
              wx.showToast({
                title: '未找到可用路线',
                icon: 'none',
                duration: 2000
              })
              this.useSimulatedRoute(hospital, mode)
            }
          } else {
            console.error('路径规划API错误:', res)
            wx.showToast({
              title: res.data?.info || '路线规划失败，使用模拟数据',
              icon: 'none',
              duration: 2000
            })
            this.useSimulatedRoute(hospital, mode)
          }
        },
      fail: (err) => {
        console.error('路径规划API请求失败:', err);
        // 网络错误时使用模拟数据
        this.useSimulatedRoute(hospital, mode);
      }
    })
  },

  // 使用模拟路线规划数据（降级方案）
  useSimulatedRoute(hospital, mode) {
    const distance = this.calculateDistance(
      this.data.userLocation.latitude,
      this.data.userLocation.longitude,
      parseFloat(hospital.latitude),
      parseFloat(hospital.longitude)
    )
    
    // 根据出行方式计算预计时间
    let duration = ''
    switch (mode) {
      case 'driving':
        duration = Math.round(distance * 3) + '分钟' // 假设平均速度20km/h
        break
      case 'walking':
        duration = Math.round(distance * 15) + '分钟' // 假设步行速度4km/h
        break
      case 'transit':
        duration = Math.round(distance * 6) + '分钟' // 假设公交速度10km/h
        break
    }
    
    this.setData({
      routeDistance: distance.toFixed(1) + '公里',
      routeDuration: duration,
      loading: false
    })
    
    // 调用微信内置地图导航
    this.openMapNavigation(mode, hospital)
  },

  // 打开地图导航
  openMapNavigation(mode, hospital) {
    wx.openLocation({
      latitude: parseFloat(hospital.latitude),
      longitude: parseFloat(hospital.longitude),
      name: hospital.name,
      address: hospital.address,
      scale: 18
    })
  },

  // 定位到用户位置
  locateUser() {
    if (this.data.userLocation) {
      this.setData({
        mapCenter: this.data.userLocation,
        mapScale: 16,
        selectedHospital: null,
        routeMode: null
      })
    }
  },

  // 地图缩放
  zoomIn() {
    if (this.data.mapScale < 20) {
      this.setData({ mapScale: this.data.mapScale + 1 })
    }
  },

  zoomOut() {
    if (this.data.mapScale > 3) {
      this.setData({ mapScale: this.data.mapScale - 1 })
    }
  },

  // 地图区域变化
  onRegionChange(e) {
    console.log('地图区域变化:', e)
  },

  // 标记点点击
  onMarkerTap(e) {
    const markerId = e.markerId
    if (markerId === 'user') return // 用户位置标记不处理
    
    const hospital = this.data.hospitals.find(h => h.id === markerId)
    if (hospital) {
      this.selectHospital({ currentTarget: { dataset: { hospital } } })
    }
  },

  // 图片加载错误处理
  handleImageError(e) {
    console.warn('图片加载失败:', e.detail)
    
    const { type, index } = e.currentTarget.dataset
    const key = type === 'hospital' ? 'filteredHospitals' : 'hospitals'
    
    const hospitals = [...this.data[key]]
    if (hospitals[index]) {
      hospitals[index].image_url = '../../images/hospital-default.png'
      this.setData({ [key]: hospitals })
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      app.globalData.token = token
      app.globalData.userInfo = userInfo
      console.log('导航页面检测到用户已登录:', userInfo.nickname)
    }
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '医院导航 - 智慧医疗预约平台',
      path: '/pages/navigation/navigation'
    }
  }
})