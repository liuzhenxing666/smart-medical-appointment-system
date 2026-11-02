// pages/index/index.js
const app = getApp()

Page({
  data: {
    // 位置
    currentLocation: '贵阳市',
    latitude: 26.647,
    longitude: 106.6302,

    // 轮播
    banners: [
      { id: 1, image: '/assets/images/banner-1.jpg', title: '中医特色诊疗服务' },
      { id: 2, image: '/assets/images/banner-2.jpg', title: '名医专家在线咨询' },
      { id: 3, image: '/assets/images/banner-3.jpg', title: '健康养生知识普及' }
    ],

    // 中医特色服务
    tcmServices: [
      { id: 1, name: '中医内科', short: '内' },
      { id: 2, name: '针灸推拿', short: '针' },
      { id: 3, name: '中药调理', short: '药' },
      { id: 4, name: '中医外科', short: '外' },
      { id: 5, name: '中医妇科', short: '妇' },
      { id: 6, name: '中医儿科', short: '儿' },
      { id: 7, name: '中医骨伤', short: '骨' },
      { id: 8, name: '中医养生', short: '养' }
    ],

    hotHospitals: [],
    recommendDoctors: [],
    healthArticles: [],
    loading: false
  },

  onLoad() {
    this.getLocation()
    this.loadHomeData()
  },

  onShow() {
    this.loadHomeData()
  },

  // ---------------- 位置 ----------------
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        })
      },
      fail: () => {
        console.log('获取位置失败，使用默认位置')
      }
    })
  },

  chooseLocation() {
    wx.showToast({
      title: '城市切换开发中',
      icon: 'none'
    })
  },

  // ---------------- 搜索 ----------------
  goToSearch() {
    wx.showToast({
      title: '搜索页开发中',
      icon: 'none'
    })
  },

  // ---------------- 轮播 ----------------
  onBannerTap(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({
      title: `活动详情 #${id}`,
      icon: 'none'
    })
  },

  // ---------------- 快捷入口 ----------------
  goToPage(e) {
    const page = e.currentTarget.dataset.page
    const routes = {
      hospitals: '/pages/hospitals/hospitals',
      doctors: '/pages/doctors/doctors',
      appointments: '/pages/my-appointments/my-appointments'
    }
    const url = routes[page]
    if (url) {
      wx.switchTab({ url })
    }
  },

  goToTCM() {
    wx.pageScrollTo({
      selector: '#tcm',
      duration: 300
    })
  },

  goToService(e) {
    const id = e.currentTarget.dataset.id
    const service = this.data.tcmServices.find((item) => item.id === id)
    wx.showToast({
      title: service ? service.name : '服务详情开发中',
      icon: 'none'
    })
  },

  // ---------------- 医院 ----------------
  goToHospitals() {
    wx.switchTab({ url: '/pages/hospitals/hospitals' })
  },

  goToHospitalDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/hospital-detail/hospital-detail?id=${id}`
    })
  },

  // ---------------- 医生 ----------------
  goToDoctors() {
    wx.switchTab({ url: '/pages/doctors/doctors' })
  },

  goToDoctorDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/doctor-detail/doctor-detail?id=${id}`
    })
  },

  quickAppointment(e) {
    const doctorId = e.currentTarget.dataset.id
    const token = wx.getStorageSync('token')

    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再预约',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' })
          }
        }
      })
      return
    }

    wx.navigateTo({
      url: `/pages/appointment-create/appointment-create?doctorId=${doctorId}`
    })
  },

  // ---------------- 资讯 ----------------
  goToArticles() {
    wx.showToast({
      title: '资讯列表开发中',
      icon: 'none'
    })
  },

  goToArticle(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({
      title: `资讯详情 #${id}`,
      icon: 'none'
    })
  },

  // ---------------- 数据加载 ----------------
  loadHomeData() {
    this.setData({ loading: true })
    this.loadHotHospitals()
      .then(() => this.loadRecommendDoctors())
      .then(() => this.loadHealthArticles())
      .finally(() => this.setData({ loading: false }))
  },

  loadHotHospitals() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.baseURL}hospitals/`,
        method: 'GET',
        data: { limit: 5, ordering: '-rating' },
        success: (res) => {
          const list = (res.statusCode === 200 && res.data.results) || []
          this.setData({
            hotHospitals: list.slice(0, 5).map((item) => ({
              id: item.id,
              name: item.name,
              level: item.level || '综合医院',
              image: item.image || item.logo || '',
              distance: item.distance || ''
            }))
          })
          resolve()
        },
        fail: () => {
          this.setData({ hotHospitals: [] })
          resolve()
        }
      })
    })
  },

  loadRecommendDoctors() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.baseURL}doctors/`,
        method: 'GET',
        data: { limit: 3, ordering: '-rating' },
        success: (res) => {
          const list = (res.statusCode === 200 && res.data.results) || []
          this.setData({
            recommendDoctors: list.slice(0, 3).map((item) => ({
              id: item.id,
              name: item.name || item.real_name || '',
              title: item.title || item.position || '',
              hospital: item.hospital_name || item.hospital || '',
              department: item.department_name || item.department || '',
              avatar: item.avatar || '',
              specialties: item.specialties || item.tags || []
            }))
          })
          resolve()
        },
        fail: () => {
          this.setData({ recommendDoctors: [] })
          resolve()
        }
      })
    })
  },

  loadHealthArticles() {
    return new Promise((resolve) => {
      // 健康资讯暂无后端接口，先使用占位内容
      this.setData({
        healthArticles: [
          {
            id: 1,
            title: '春季中医养生指南',
            description: '春季万物复苏，中医认为春季养肝为主，作息、饮食与情绪都需要随之调整。',
            image: 'http://127.0.0.1:8000/static/images/article1.jpg',
            publishDate: '2026-03-15'
          },
          {
            id: 2,
            title: '针灸治疗颈椎病的优势',
            description: '颈椎病是现代常见疾病，针灸作为中医特色疗法，在缓解症状方面具有独特优势。',
            image: 'http://127.0.0.1:8000/static/images/article2.jpg',
            publishDate: '2026-03-14'
          }
        ]
      })
      resolve()
    })
  },

  // ---------------- 交互 ----------------
  onPullDownRefresh() {
    this.loadHomeData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onShareAppMessage() {
    return {
      title: '智慧医疗预约平台',
      path: '/pages/index/index'
    }
  }
})
