// 医院列表页面逻辑
const app = getApp()

Page({
  data: {
    // 搜索相关
    searchValue: '',
    
    // 筛选相关
    filterPanelVisible: false,
    levelFilter: '',
    sortType: 'default',
    
    // 医院数据
    hospitals: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    
    // 位置信息
    latitude: 0,
    longitude: 0,
    city: '贵阳市',
    
    // 用户信息
    userInfo: null,
    isLoggedIn: false
  },

  onLoad: function (options) {
    // 检查登录状态
    this.checkLoginStatus()
    
    // 获取位置信息
    this.getLocation()
    
    // 如果有搜索参数，设置搜索值
    if (options.search) {
      this.setData({
        searchValue: options.search
      })
    }
    
    // 加载医院数据
    this.loadHospitals()
  },

  onShow: function () {
    // 检查登录状态
    this.checkLoginStatus()
  },

  onPullDownRefresh: function () {
    // 刷新数据
    this.setData({
      page: 1,
      hospitals: [],
      hasMore: true
    })
    this.loadHospitals()
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const userInfo = wx.getStorageSync('userInfo')
    const token = wx.getStorageSync('token')
    
    if (userInfo && token) {
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      })
    } else {
      this.setData({
        userInfo: null,
        isLoggedIn: false
      })
    }
  },

  // 获取位置信息
  getLocation: function () {
    const self = this
    
    wx.getLocation({
      type: 'gcj02',
      success: function (res) {
        self.setData({
          latitude: res.latitude,
          longitude: res.longitude
        })
        
        // 获取城市信息
        self.getCityName(res.latitude, res.longitude)
      },
      fail: function () {
        // 获取位置失败，使用默认位置
        console.log('获取位置失败，使用默认位置')
        self.setData({
          latitude: 26.5783,
          longitude: 106.7135,  // 贵阳市中心坐标
          city: '贵阳市'
        })
      }
    })
  },

  // 获取城市名称
  getCityName: function (latitude, longitude) {
    const self = this
    
    // 这里应该调用地图API获取城市名称，简化处理
    self.setData({
      city: '贵阳市'
    })
  },

  // 加载医院数据
  loadHospitals: function () {
    if (this.data.loading || !this.data.hasMore) return
    
    this.setData({ loading: true })
    
    const params = {
      page: this.data.page,
      page_size: this.data.pageSize,
      search: this.data.searchValue || '',
      level: this.data.levelFilter || '',
      sort: this.data.sortType,
      lat: this.data.latitude,
      lng: this.data.longitude
    }
    
    // 调用后端API
    wx.request({
      url: `${app.globalData.baseURL}hospitals/`,
      method: 'GET',
      data: params,
      success: (res) => {
        if (res.statusCode === 200) {
          // 处理APIResponse包装的数据格式
          const responseData = res.data.data || res.data
          const hospitals = responseData.results || responseData || []
          
          console.log('API响应数据:', res.data)
          console.log('解析后的医院数据:', hospitals)
          
          // 格式化医院数据
          const formattedHospitals = hospitals.map(hospital => {
            return {
              id: hospital.id,
              name: hospital.name,
              initial: hospital.name ? hospital.name.charAt(0) : '医',
              level: hospital.level || '未知',
              address: hospital.address,
              phone: hospital.phone,
              image: hospital.image || '/assets/images/default-hospital.png',
              tags: hospital.tags || [],
              rating: hospital.average_rating ? parseFloat(hospital.average_rating).toFixed(1) : 0,
              distance: hospital.distance ? `${hospital.distance}km` : '',
              departments: hospital.departments || []
            }
          })
          
          // 判断是否还有更多数据
          const hasMore = formattedHospitals.length === this.data.pageSize
          
          this.setData({
            hospitals: this.data.page === 1 ? formattedHospitals : [...this.data.hospitals, ...formattedHospitals],
            hasMore: hasMore,
            loading: false
          })
          
          // 停止下拉刷新
          if (this.data.page === 1) {
            wx.stopPullDownRefresh()
          }
        } else {
          this.loadError('获取医院列表失败')
        }
      },
      fail: () => {
        this.loadError('网络错误，请检查网络连接')
      }
    })
  },

  // 加载错误处理
  loadError: function (message) {
    this.setData({
      loading: false
    })
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
    
    // 停止下拉刷新
    wx.stopPullDownRefresh()
    
    // 如果是第一页加载失败，使用模拟数据
    if (this.data.page === 1 && this.data.hospitals.length === 0) {
      this.loadMockData()
    }
  },

  // 加载模拟数据
  loadMockData: function () {
    const mockHospitals = [
      {
        id: 1,
        name: '贵州中医药大学第一附属医院',
        initial: '贵',
        level: '三甲',
        address: '贵州省贵阳市云岩区宝山北路71号',
        phone: '0851-85611114',
        image: 'http://127.0.0.1:8000/static/images/hospital1.jpg',
        tags: ['中医', '三甲', '医保定点'],
        rating: '4.8',
        distance: '2.3km',
        departments: ['内科', '外科', '中医科', '针灸科']
      },
      {
        id: 2,
        name: '贵州省人民医院',
        initial: '贵',
        level: '三甲',
        address: '贵州省贵阳市南明区中山东路83号',
        phone: '0851-85922979',
        image: 'http://127.0.0.1:8000/static/images/hospital2.jpg',
        tags: ['综合', '三甲', '医保定点'],
        rating: '4.6',
        distance: '3.5km',
        departments: ['内科', '外科', '妇产科', '儿科']
      },
      {
        id: 3,
        name: '贵阳市第一人民医院',
        initial: '贵',
        level: '三甲',
        address: '贵州省贵阳市南明区博爱路97号',
        phone: '0851-85813716',
        image: 'http://127.0.0.1:8000/static/images/hospital3.jpg',
        tags: ['综合', '三甲', '医保定点'],
        rating: '4.5',
        distance: '4.2km',
        departments: ['内科', '外科', '急诊科', '眼科']
      }
    ]
    
    this.setData({
      hospitals: mockHospitals,
      hasMore: false,
      loading: false
    })
  },

  // 搜索输入
  onSearchInput: function (e) {
    this.setData({
      searchValue: e.detail.value
    })
  },

  // 搜索确认
  onSearch: function () {
    this.setData({
      page: 1,
      hospitals: [],
      hasMore: true
    })
    this.loadHospitals()
  },

  // 显示筛选面板
  showFilterPanel: function () {
    this.setData({
      filterPanelVisible: true
    })
  },

  // 隐藏筛选面板
  hideFilterPanel: function () {
    this.setData({
      filterPanelVisible: false
    })
  },

  // 医院等级筛选选择
  onLevelFilterSelect: function (e) {
    const level = e.currentTarget.dataset.level
    this.setData({
      levelFilter: level
    })
  },

  // 排序方式选择
  onSortSelect: function (e) {
    const sortType = e.currentTarget.dataset.type
    this.setData({
      sortType: sortType
    })
  },

  // 重置筛选
  resetFilter: function () {
    this.setData({
      levelFilter: '',
      sortType: 'default'
    })
  },

  // 确认筛选
  confirmFilter: function () {
    this.setData({
      page: 1,
      hospitals: [],
      hasMore: true,
      filterPanelVisible: false
    })
    this.loadHospitals()
  },

  // 加载更多
  loadMore: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadHospitals()
    }
  },

  // 点击医院卡片
  onHospitalTap: function (e) {
    const hospitalId = e.currentTarget.dataset.id
    
    wx.navigateTo({
      url: `/pages/hospital-detail/hospital-detail?id=${hospitalId}`
    })
  },

  // 阻止筛选面板内部的点击冒泡到遮罩
  stopBubble: function () {},

  // 图片加载错误
  onImageError: function (e) {
    // 可以设置默认图片
    console.log('图片加载失败', e)
  },

  // 重新加载
  retryLoad: function () {
    this.setData({
      page: 1,
      hospitals: [],
      hasMore: true
    })
    this.loadHospitals()
  }
})