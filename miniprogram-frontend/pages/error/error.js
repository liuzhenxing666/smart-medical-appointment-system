// 错误页面逻辑
Page({
  data: {
    // 错误信息
    title: '页面加载失败',
    description: '网络连接异常，请检查网络后重试',
    errorDetails: '',
    
    // 按钮显示控制
    showRetry: true,
    showHome: true,
    showContact: true,
    showRelogin: false,
    showLogin: false,
    
    // 详情展开控制
    showDetails: false,
    detailsExpanded: false,
    
    // 错误类型
    errorType: 'network', // network, auth, server, not-found, validation, permission
    
    // 重试配置
    retryText: '重试',
    retryAction: null,
    
    // 页面来源
    fromPage: '',
    
    // 错误代码
    errorCode: '',
    
    // 时间戳
    timestamp: ''
  },

  onLoad(options) {
    const { type = 'network', description = '', fromPage = '', code = '' } = options
    
    // 设置错误类型和时间戳
    this.setData({
      errorType: type,
      description: description,
      fromPage: fromPage,
      errorCode: code,
      timestamp: new Date().toLocaleString('zh-CN')
    })
    
    // 根据错误类型配置页面
    this.configureErrorPage()
  },

  // 配置错误页面
  configureErrorPage() {
    const { errorType, description, errorCode } = this.data
    
    const configs = {
      'network': {
        title: '网络连接失败',
        description: description || '请检查网络连接后重试',
        showRetry: true,
        showHome: true,
        showContact: false,
        showLogin: false
      },
      'auth': {
        title: '身份验证失败',
        description: description || '请重新登录',
        showRetry: false,
        showHome: true,
        showContact: false,
        showLogin: true
      },
      'server': {
        title: '服务器错误',
        description: description || '服务器内部错误，请稍后重试',
        showRetry: true,
        showHome: true,
        showContact: true,
        showLogin: false
      },
      'not-found': {
        title: '页面不存在',
        description: description || '您访问的页面不存在',
        showRetry: false,
        showHome: true,
        showContact: false,
        showLogin: false
      },
      'validation': {
        title: '数据验证错误',
        description: description || '请检查输入的数据格式是否正确',
        showRetry: true,
        showHome: true,
        showContact: false,
        showLogin: false
      },
      'permission': {
        title: '权限不足',
        description: description || '您没有权限执行此操作',
        showRetry: false,
        showHome: true,
        showContact: true,
        showLogin: false
      }
    }
    
    const config = configs[errorType] || configs.network
    
    // 如果有错误代码，添加到描述中
    let finalDescription = config.description
    if (errorCode) {
      finalDescription = `${finalDescription}\n错误代码: ${errorCode}`
    }
    
    this.setData({
      title: config.title,
      description: finalDescription,
      showRetry: config.showRetry,
      showHome: config.showHome,
      showContact: config.showContact,
      showLogin: config.showLogin
    })
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: config.title
    })
  },

  // 解析错误参数
  parseErrorOptions(options) {
    const {
      type = 'network',
      title,
      description,
      details = '',
      fromPage = '',
      code = '',
      showRetry = true,
      showHome = true,
      showContact = true,
      showRelogin = false,
      retryText = '重试'
    } = options;

    // 根据错误类型设置默认值
    const errorConfigs = {
      network: {
        title: '网络连接失败',
        description: '请检查网络连接后重试',
        showRetry: true,
        showHome: true
      },
      auth: {
        title: '登录已过期',
        description: '请重新登录后继续操作',
        showRetry: false,
        showRelogin: true
      },
      server: {
        title: '服务器错误',
        description: '服务器暂时不可用，请稍后重试',
        showRetry: true,
        showHome: true
      },
      'not-found': {
        title: '页面不存在',
        description: '您访问的页面不存在或已被删除',
        showRetry: false,
        showHome: true
      }
    };

    const config = errorConfigs[type] || errorConfigs.network;

    this.setData({
      errorType: type,
      title: title || config.title,
      description: description || config.description,
      errorDetails: details,
      fromPage: fromPage,
      errorCode: code,
      showRetry: showRetry === 'true' || showRetry === true,
      showHome: showHome === 'true' || showHome === true,
      showContact: showContact === 'true' || showContact === true,
      showRelogin: showRelogin === 'true' || showRelogin === true,
      retryText: retryText,
      showDetails: !!details
    });

    // 设置重试操作
    this.setRetryAction(type, fromPage);
  },

  // 设置重试操作
  setRetryAction(type, fromPage) {
    const actions = {
      network: () => this.retryNetwork(),
      server: () => this.retryServer(),
      auth: () => this.handleAuthError(),
      'not-found': () => this.goHome()
    };

    this.data.retryAction = actions[type] || actions.network;
  },

  // 处理重试
  handleRetry() {
    if (this.data.retryAction) {
      this.data.retryAction();
    } else {
      this.defaultRetry();
    }
  },

  // 默认重试逻辑
  defaultRetry() {
    // 显示加载状态
    wx.showLoading({
      title: '重试中...',
      mask: true
    });

    // 模拟重试延迟
    setTimeout(() => {
      wx.hideLoading();
      
      if (this.data.fromPage) {
        // 返回来源页面
        wx.navigateBack({
          delta: 1
        });
      } else {
        // 刷新当前页面
        this.retryCurrentPage();
      }
    }, 1000);
  },

  // 重试网络错误
  retryNetwork() {
    wx.showLoading({
      title: '检查网络...',
      mask: true
    });

    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        wx.hideLoading();
        
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络未连接',
            icon: 'none'
          });
        } else {
          this.defaultRetry();
        }
      },
      fail: () => {
        wx.hideLoading();
        this.defaultRetry();
      }
    });
  },

  // 重试服务器错误
  retryServer() {
    wx.showLoading({
      title: '重新连接...',
      mask: true
    });

    // 模拟服务器检查
    setTimeout(() => {
      wx.hideLoading();
      this.defaultRetry();
    }, 1500);
  },

  // 处理认证错误
  handleAuthError() {
    // 清除登录状态
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    // 跳转到登录页面
    wx.redirectTo({
      url: '/pages/login/login'
    });
  },

  // 返回首页
  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 联系客服
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567'
    });
  },

  // 重新登录
  reLogin() {
    this.handleAuthError();
  },

  // 登录按钮处理
  onLogin() {
    // 清除用户信息
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('access_token')
    
    // 跳转到登录页面
    wx.redirectTo({
      url: '/pages/login/login'
    })
  },

  // 切换详情展开状态
  toggleDetails() {
    this.setData({
      detailsExpanded: !this.data.detailsExpanded
    });
  },

  // 重试当前页面
  retryCurrentPage() {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      if (currentPage.onLoad) {
        currentPage.onLoad(currentPage.options);
      }
    }
  },

  // 记录错误日志
  logError() {
    const errorLog = {
      type: this.data.errorType,
      code: this.data.errorCode,
      fromPage: this.data.fromPage,
      timestamp: Date.now(),
      details: this.data.errorDetails
    };

    console.error('页面错误:', errorLog);
    
    // 可以发送到错误监控服务
    this.reportError(errorLog);
  },

  // 报告错误到监控服务
  reportError(errorLog) {
    // 这里可以集成错误监控服务
    // 例如：Sentry, 腾讯云监控等
    
    const app = getApp();
    if (app && app.reportError) {
      app.reportError(errorLog);
    }
  },

  // 页面显示
  onShow() {
    // 可以在这里添加页面显示时的逻辑
  },

  // 页面卸载
  onUnload() {
    // 清理资源
  },

  // 用户分享
  onShareAppMessage() {
    return {
      title: '遇到问题？联系我们',
      path: '/pages/error/error'
    };
  }
})