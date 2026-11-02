// 医生列表页面逻辑
const app = getApp();

Page({
  data: {
    // 医生列表数据
    doctors: [],
    isLoading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    
    // 搜索和筛选条件
    searchKeyword: '',
    showFilters: false,
    selectedSpecialty: '',
    selectedHospitalIndex: -1,
    hospitalOptions: [],
    sortBy: 'average_rating', // 默认按评分排序
    
    // 分页参数
    page: 1,
    pageSize: 10,
    
    // 用户位置信息
    userLocation: {
      latitude: 26.5783, // 贵阳市中心纬度
      longitude: 106.7135 // 贵阳市中心经度
    }
  },

  onLoad(options) {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看医生信息',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          } else {
            // 不执行任何操作，让用户继续在当前页面操作
            console.log('用户取消登录，继续在当前页面');
          }
        }
      });
      // 不return，让页面继续加载，但显示空数据
      this.setData({
        isLoading: false
      });
    } else {
      // 获取医院选项
      this.loadHospitalOptions();
      
      // 加载医生列表
      this.loadDoctors();
      
      // 获取用户位置
      this.getUserLocation();
    }
  },

  onShow() {
    // 页面显示时刷新数据
    if (app.globalData.isLoggedIn) {
      this.setData({
        page: 1,
        doctors: [],
        hasMore: true
      });
      this.loadDoctors();
    }
  },

  // 获取用户位置
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail: (err) => {
        console.log('获取位置失败，使用默认位置:', err);
        // 使用默认的贵阳市中心位置
      }
    });
  },

  // 加载医院选项
  loadHospitalOptions() {
    wx.request({
      url: `${app.globalData.baseURL}hospitals/`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.results) {
          const hospitals = res.data.results.map(hospital => ({
            id: hospital.id,
            name: hospital.name
          }));
          
          // 添加"全部医院"选项
          hospitals.unshift({ id: 0, name: '全部医院' });
          
          this.setData({
            hospitalOptions: hospitals
          });
        }
      },
      fail: (err) => {
        console.error('加载医院选项失败:', err);
        // 使用默认医院选项
        this.setData({
          hospitalOptions: [
            { id: 0, name: '全部医院' },
            { id: 1, name: '贵州省中医医院' },
            { id: 2, name: '贵阳市第一人民医院' },
            { id: 3, name: '贵阳市中医医院' }
          ]
        });
      }
    });
  },

  // 加载医生列表
  loadDoctors(isRefresh = false) {
    if (this.data.isLoading || this.data.loadingMore) return;
    
    if (isRefresh) {
      this.setData({
        refreshing: true,
        page: 1,
        doctors: [],
        hasMore: true
      });
    } else {
      this.setData({
        isLoading: true,
        loadingMore: this.data.page > 1
      });
    }

    // 构建请求参数
    const params = {
      page: this.data.page,
      page_size: this.data.pageSize,
      ordering: `-${this.data.sortBy}` // 负号表示降序
    };

    // 添加搜索关键词
    if (this.data.searchKeyword) {
      params.search = this.data.searchKeyword;
    }

    // 添加科室筛选
    if (this.data.selectedSpecialty) {
      params.specialty = this.data.selectedSpecialty;
    }

    // 添加医院筛选
    if (this.data.selectedHospitalIndex > 0) {
      const selectedHospital = this.data.hospitalOptions[this.data.selectedHospitalIndex];
      if (selectedHospital) {
        params.hospital_id = selectedHospital.id;
      }
    }

    // 添加位置信息
    params.latitude = this.data.userLocation.latitude;
    params.longitude = this.data.userLocation.longitude;

    wx.request({
      url: `${app.globalData.baseURL}doctors/`,
      method: 'GET',
      data: params,
      header: {
        'Authorization': `Bearer ${app.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const newDoctors = res.data.results || [];
          
          // 处理医生数据，添加默认值
          const processedDoctors = newDoctors.map(doctor => ({
            ...doctor,
            // 姓名首字（用于文字头像徽标）
            initial: doctor.name ? doctor.name.charAt(0) : '医',
            // 头像URL处理
            avatar_url: doctor.avatar_url || '/assets/images/default-avatar.png',
            // 职称处理
            title: doctor.title || '主任医师',
            // 医院名称处理
            hospital_name: doctor.hospital_name || '贵州省中医医院',
            // 科室处理
            specialty: doctor.specialty || '中医内科',
            // 评分处理
            average_rating: doctor.average_rating || 4.8,
            // 经验处理
            experience: doctor.experience || 15,
            // 咨询次数处理
            consultation_count: doctor.consultation_count || 500,
            // 挂号费处理
            consultation_fee: doctor.consultation_fee || 30,
            // 是否可预约
            is_available: doctor.is_available !== false
          }));

          let updatedDoctors;
          if (isRefresh || this.data.page === 1) {
            updatedDoctors = processedDoctors;
          } else {
            updatedDoctors = [...this.data.doctors, ...processedDoctors];
          }

          this.setData({
            doctors: updatedDoctors,
            hasMore: newDoctors.length === this.data.pageSize,
            page: this.data.page + 1
          });
        } else {
          this.handleError(res, '加载医生列表失败');
        }
      },
      fail: (err) => {
        console.error('加载医生列表失败:', err);
        this.handleError(err, '网络错误，请检查网络连接');
        
        // 加载失败时使用模拟数据
        this.loadMockDoctors();
      },
      complete: () => {
        this.setData({
          isLoading: false,
          refreshing: false,
          loadingMore: false
        });
      }
    });
  },

  // 加载模拟医生数据
  loadMockDoctors() {
    const mockDoctors = [
      {
        id: 1,
        name: '张医生',
        initial: '张',
        title: '主任医师',
        hospital_name: '贵州省中医医院',
        specialty: '针灸科',
        average_rating: 4.9,
        experience: 20,
        consultation_count: 1200,
        consultation_fee: 50,
        is_available: true,
        avatar_url: '/images/doctor1.png'
      },
      {
        id: 2,
        name: '李医生',
        initial: '李',
        title: '副主任医师',
        hospital_name: '贵阳市中医医院',
        specialty: '推拿科',
        average_rating: 4.8,
        experience: 15,
        consultation_count: 800,
        consultation_fee: 40,
        is_available: true,
        avatar_url: '/images/doctor2.png'
      },
      {
        id: 3,
        name: '王医生',
        initial: '王',
        title: '主任医师',
        hospital_name: '贵州省中医医院',
        specialty: '中医内科',
        average_rating: 4.7,
        experience: 18,
        consultation_count: 1000,
        consultation_fee: 45,
        is_available: false,
        avatar_url: '/images/doctor3.png'
      },
      {
        id: 4,
        name: '陈医生',
        initial: '陈',
        title: '副主任医师',
        hospital_name: '贵阳市第一人民医院',
        specialty: '中医妇科',
        average_rating: 4.6,
        experience: 12,
        consultation_count: 600,
        consultation_fee: 35,
        is_available: true,
        avatar_url: '/images/doctor4.png'
      },
      {
        id: 5,
        name: '刘医生',
        initial: '刘',
        title: '主任医师',
        hospital_name: '贵州省中医医院',
        specialty: '中医儿科',
        average_rating: 4.8,
        experience: 16,
        consultation_count: 900,
        consultation_fee: 40,
        is_available: true,
        avatar_url: '/images/doctor5.png'
      }
    ];

    this.setData({
      doctors: mockDoctors,
      hasMore: false
    });
  },

  // 错误处理
  handleError(error, defaultMessage) {
    console.error('API请求错误:', error);
    
    let message = defaultMessage;
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.errMsg) {
      message = error.errMsg;
    }
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  // 下拉刷新
  onRefresh() {
    this.loadDoctors(true);
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.isLoading && !this.data.loadingMore) {
      this.loadDoctors();
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 搜索确认
  onSearchConfirm() {
    this.setData({
      page: 1,
      doctors: [],
      hasMore: true
    });
    this.loadDoctors();
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: '',
      page: 1,
      doctors: [],
      hasMore: true
    });
    this.loadDoctors();
  },

  // 显示筛选面板
  showFilter() {
    this.setData({
      showFilters: true
    });
  },

  // 隐藏筛选面板
  hideFilter() {
    this.setData({
      showFilters: false
    });
  },

  // 选择科室
  selectSpecialty(e) {
    const specialty = e.currentTarget.dataset.specialty;
    this.setData({
      selectedSpecialty: specialty
    });
  },

  // 选择医院
  onHospitalChange(e) {
    this.setData({
      selectedHospitalIndex: parseInt(e.detail.value)
    });
  },

  // 选择排序方式
  selectSort(e) {
    const sortBy = e.currentTarget.dataset.sort;
    this.setData({
      sortBy: sortBy
    });
  },

  // 重置筛选条件
  resetFilters() {
    this.setData({
      selectedSpecialty: '',
      selectedHospitalIndex: -1,
      sortBy: 'average_rating'
    });
  },

  // 应用筛选条件
  applyFilters() {
    this.hideFilter();
    this.setData({
      page: 1,
      doctors: [],
      hasMore: true
    });
    this.loadDoctors();
  },

  // 查看医生详情
  viewDoctorDetail(e) {
    const doctor = e.currentTarget.dataset.doctor;
    wx.navigateTo({
      url: `/pages/doctor-detail/doctor-detail?id=${doctor.id}`
    });
  },

  // 预约医生
  makeAppointment(e) {
    e.stopPropagation(); // 阻止事件冒泡
    const doctor = e.currentTarget.dataset.doctor;
    
    if (!doctor.is_available) {
      wx.showToast({
        title: '该医生暂不可预约',
        icon: 'none'
      });
      return;
    }

    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
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

    // 跳转到预约页面
    wx.navigateTo({
      url: `/pages/appointment-create/appointment-create?doctorId=${doctor.id}`
    });
  },

  // 阻止筛选面板内部的点击冒泡到遮罩
  stopBubble() {},

  // 头像加载错误处理
  onAvatarError(e) {
    console.error('医生头像加载失败:', e);
    // 可以设置默认头像
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});