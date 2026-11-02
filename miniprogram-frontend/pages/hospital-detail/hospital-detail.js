// 医院详情页面
const app = getApp()

Page({
  data: {
    hospitalId: null,
    hospital: null,
    loading: true,
    error: null,
    isFavorited: false,
    isLoggedIn: false,
    userInfo: null
  },

  onLoad: function (options) {
    console.log('医院详情页面加载，参数:', options);
    
    // 检查用户是否登录
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    
    this.setData({
      isLoggedIn: !!(userInfo && token),
      userInfo: userInfo
    });
    
    if (options.id) {
      this.setData({
        hospitalId: options.id
      });
      this.loadHospitalDetail(options.id);
    } else {
      console.error('缺少医院ID参数');
      this.setData({
        loading: false,
        error: '缺少医院ID参数'
      });
    }
  },

  // 加载医院详情
  loadHospitalDetail: function (hospitalId) {
    console.log('开始加载医院详情，ID:', hospitalId);
    
    this.setData({
      loading: true,
      error: null
    });

    // 调用后端API获取医院详情
    wx.request({
      url: `${app.globalData.baseURL}hospitals/${hospitalId}/`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('API响应数据:', res);
        
        if (res.statusCode === 200 && res.data && res.data.success) {
          // 从API响应的data字段中提取医院数据
          let hospitalData = res.data.data;
          
          // 处理医院图片URL
          if (hospitalData.image_url) {
            if (!hospitalData.image_url.startsWith('http')) {
              if (hospitalData.image_url.startsWith('/media/')) {
                hospitalData.image_url = app.globalData.baseURL + hospitalData.image_url;
              } else if (hospitalData.image_url.startsWith('/')) {
                hospitalData.image_url = app.globalData.baseURL + hospitalData.image_url;
              }
            }
          }
          
          // 处理images数组中的图片URL
          if (hospitalData.images && hospitalData.images.length > 0) {
            hospitalData.images = hospitalData.images.map(img => {
              if (img.image && !img.image.startsWith('http')) {
                if (img.image.startsWith('/media/')) {
                  img.image = app.globalData.baseURL + img.image;
                } else if (img.image.startsWith('/')) {
                  img.image = app.globalData.baseURL + img.image;
                }
              }
              return img;
            });
          }
          
          // 确保必要字段存在
          if (!hospitalData.name) hospitalData.name = '未知医院';
          if (!hospitalData.level) hospitalData.level = '三级甲等';
          if (!hospitalData.address) hospitalData.address = '贵州省贵阳市南明区';
          if (!hospitalData.phone) hospitalData.phone = '0851-12345678';
          if (!hospitalData.description) hospitalData.description = '这是一家综合性中医医院，拥有先进的医疗设备和专业的医疗团队，致力于为患者提供高质量的中医医疗服务。';
          
          // 添加中医特色数据
          if (!hospitalData.specialties || hospitalData.specialties.length === 0) {
            hospitalData.specialties = ['针灸科', '推拿科', '中医内科', '中医外科', '中医妇科', '中医儿科'];
          }
          
          // 添加科室数据
          if (!hospitalData.departments || hospitalData.departments.length === 0) {
            hospitalData.departments = [
              { id: 1, name: '针灸科', description: '采用传统针灸疗法，治疗各种疾病' },
              { id: 2, name: '推拿科', description: '专业推拿按摩，缓解各种疼痛' },
              { id: 3, name: '中医内科', description: '治疗内科常见疾病' },
              { id: 4, name: '中医外科', description: '治疗外科疾病，促进伤口愈合' },
              { id: 5, name: '中医妇科', description: '调理妇科疾病，呵护女性健康' },
              { id: 6, name: '中医儿科', description: '儿童中医治疗，健康成长' }
            ];
          }
          
          // 添加医院环境图片
          if (!hospitalData.images || hospitalData.images.length === 0) {
            hospitalData.images = [
              { id: 1, image: 'http://127.0.0.1:8000/static/images/hospital1.jpg' },
              { id: 2, image: 'http://127.0.0.1:8000/static/images/hospital2.jpg' },
              { id: 3, image: 'http://127.0.0.1:8000/static/images/doctor1.jpg' }
            ];
          }
          
          // 标记为中医医院
          hospitalData.is_tcm = true;
          
          this.setData({
            hospital: hospitalData,
            loading: false,
            error: null
          });
          
          console.log('医院详情加载成功:', hospitalData);
          
          // 设置页面标题
          if (hospitalData.name) {
            wx.setNavigationBarTitle({
              title: hospitalData.name
            });
          }
          
          // 检查是否已收藏
          this.checkFavoriteStatus(hospitalId);
        } else {
          // API调用失败，使用模拟数据
          this.loadMockData(hospitalId);
        }
      },
      fail: (error) => {
        console.error('加载医院详情失败:', error);
        // API调用失败，使用模拟数据
        this.loadMockData(hospitalId);
      }
    });
  },

  // 加载模拟数据
  loadMockData: function(hospitalId) {
    console.log('使用模拟数据加载医院详情');
    
    const mockHospital = {
      id: hospitalId,
      name: '贵州省中医医院',
      level: '三级甲等',
      type: '中医医院',
      is_tcm: true,
      address: '贵州省贵阳市南明区市东路50号',
      phone: '0851-85611523',
      latitude: 26.5783,
      longitude: 106.7135,
      average_rating: 4.8,
      review_count: 256,
      doctor_count: 86,
      image_url: 'http://127.0.0.1:8000/static/images/hospital-detail.jpg',
      description: '贵州省中医医院成立于1956年，是贵州省唯一一所集医疗、教学、科研、预防、保健、康复为一体的省级综合性中医医院。医院占地面积5.2万平方米，建筑面积10.8万平方米，设有30个临床科室，15个医技科室，开放床位1000张。医院拥有国家级重点专科4个，省级重点专科8个，拥有一支高素质的专业技术队伍，其中高级职称人员200余人，博士、硕士研究生导师30余人。',
      specialties: ['针灸科', '推拿科', '中医内科', '中医外科', '中医妇科', '中医儿科', '中医皮肤科', '中医眼科'],
      departments: [
        { id: 1, name: '针灸科', description: '采用传统针灸疗法，治疗各种疾病' },
        { id: 2, name: '推拿科', description: '专业推拿按摩，缓解各种疼痛' },
        { id: 3, name: '中医内科', description: '治疗内科常见疾病' },
        { id: 4, name: '中医外科', description: '治疗外科疾病，促进伤口愈合' },
        { id: 5, name: '中医妇科', description: '调理妇科疾病，呵护女性健康' },
        { id: 6, name: '中医儿科', description: '儿童中医治疗，健康成长' }
      ],
      images: [
        { id: 1, image: 'http://127.0.0.1:8000/static/images/hospital1.jpg' },
        { id: 2, image: 'http://127.0.0.1:8000/static/images/hospital2.jpg' },
        { id: 3, image: 'http://127.0.0.1:8000/static/images/doctor1.jpg' }
      ]
    };
    
    this.setData({
      hospital: mockHospital,
      loading: false,
      error: null
    });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: mockHospital.name
    });
    
    // 检查是否已收藏
    this.checkFavoriteStatus(hospitalId);
  },

  // 检查收藏状态
  checkFavoriteStatus: function(hospitalId) {
    if (!this.data.isLoggedIn) return;
    
    // 从本地存储获取收藏列表
    let favorites = wx.getStorageSync('favorites') || [];
    const isFavorited = favorites.some(item => String(item.id) === String(hospitalId) && item.type === 'hospital');
    
    this.setData({
      isFavorited: isFavorited
    });
  },

  // 切换收藏状态
  toggleFavorite: function() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再进行收藏',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    const hospital = this.data.hospital;
    if (!hospital) return;
    
    // 从本地存储获取收藏列表
    let favorites = wx.getStorageSync('favorites') || [];
    const index = favorites.findIndex(item => String(item.id) === String(hospital.id) && item.type === 'hospital');
    
    if (index > -1) {
      // 已收藏，取消收藏
      favorites.splice(index, 1);
      this.setData({
        isFavorited: false
      });
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    } else {
      // 未收藏，添加收藏
      favorites.push({
        id: hospital.id,
        type: 'hospital',
        name: hospital.name,
        image: hospital.image_url,
        time: new Date().getTime()
      });
      this.setData({
        isFavorited: true
      });
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      });
    }
    
    // 更新本地存储
    wx.setStorageSync('favorites', favorites);
  },

  // 重新加载
  retryLoad: function() {
    if (this.data.hospitalId) {
      this.loadHospitalDetail(this.data.hospitalId);
    }
  },

  // 图片加载错误处理：清空地址，由页面展示占位块
  onImageError: function (e) {
    console.warn('医院头图加载失败:', e.detail);
    
    if (this.data.hospital) {
      this.setData({
        'hospital.image_url': ''
      });
    }
  },

  // 预览图片
  previewImage: function(e) {
    const current = e.currentTarget.dataset.src;
    const hospital = this.data.hospital;
    
    if (hospital && hospital.images && hospital.images.length > 0) {
      const urls = hospital.images.map(item => item.image);
      
      wx.previewImage({
        current: current,
        urls: urls
      });
    }
  },

  // 导航到医院
  navigateToHospital: function () {
    const hospital = this.data.hospital;
    console.log('导航功能 - 医院数据:', hospital);
    console.log('导航功能 - 纬度:', hospital?.latitude, '经度:', hospital?.longitude);
    
    if (!hospital || !hospital.latitude || !hospital.longitude) {
      wx.showToast({
        title: '该医院暂无位置信息',
        icon: 'none'
      });
      return;
    }

    // 检查是否支持腾讯地图
    wx.getSystemInfo({
      success: (res) => {
        if (res.platform === 'devtools') {
          // 开发工具中显示提示
          wx.showModal({
            title: '导航提示',
            content: '在开发工具中无法直接导航，请使用真机测试',
            showCancel: false
          });
          return;
        }

        // 使用微信内置地图
        wx.openLocation({
          latitude: parseFloat(hospital.latitude),
          longitude: parseFloat(hospital.longitude),
          name: hospital.name,
          address: hospital.address,
          scale: 18
        });
      }
    });
  },

  // 拨打电话
  callHospital: function () {
    const hospital = this.data.hospital;
    if (!hospital || !hospital.phone) {
      wx.showToast({
        title: '该医院暂无联系电话',
        icon: 'none'
      });
      return;
    }

    wx.makePhoneCall({
      phoneNumber: hospital.phone
    });
  },

  // 查看医院医生（医生列表为 tabBar 页面，使用 switchTab）
  viewDoctors: function () {
    wx.switchTab({
      url: '/pages/doctors/doctors'
    });
  },

  // 立即预约：先选择医生，再进入预约页
  makeAppointment: function() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再进行预约',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    const hospital = this.data.hospital;
    if (!hospital) return;
    
    wx.showModal({
      title: '选择医生',
      content: '预约挂号需先选择医生，是否前往医生列表？',
      confirmText: '去选择',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/doctors/doctors'
          });
        }
      }
    });
  },

  // 查看预约（我的预约为 tabBar 页面，使用 switchTab）
  viewAppointments: function() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看预约',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    wx.switchTab({
      url: '/pages/my-appointments/my-appointments'
    });
  },

  // 分享医院
  onShareAppMessage: function () {
    const hospital = this.data.hospital;
    if (!hospital) return {};
    
    return {
      title: hospital.name,
      path: `/pages/hospital-detail/hospital-detail?id=${hospital.id}`,
      imageUrl: hospital.image_url
    };
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  }
});