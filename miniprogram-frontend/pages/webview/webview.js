// WebView页面逻辑
Page({
  data: {
    url: '',
    title: '加载中...',
    loading: true,
    error: false,
    errorMessage: ''
  },

  onLoad(options) {
    // 获取传入的参数
    const { url, title } = options;
    
    if (!url) {
      this.setData({
        error: true,
        errorMessage: '缺少页面地址参数',
        loading: false
      });
      return;
    }

    // 解码URL
    const decodedUrl = decodeURIComponent(url);
    
    this.setData({
      url: decodedUrl,
      title: title || '网页'
    });

    // 记录页面访问
    this.logPageView(decodedUrl);
  },

  // WebView加载完成
  onWebViewLoad(e) {
    console.log('WebView加载完成', e);
    this.setData({
      loading: false
    });
  },

  // WebView加载错误
  onError(e) {
    console.error('WebView加载错误', e);
    this.setData({
      loading: false,
      error: true,
      errorMessage: '网络连接失败，请检查网络后重试'
    });
  },

  // 接收WebView消息
  onMessage(e) {
    console.log('收到WebView消息', e);
    
    const { data } = e.detail;
    
    // 处理不同类型的消息
    switch (data.type) {
      case 'close':
        wx.navigateBack();
        break;
      case 'share':
        this.handleShare(data);
        break;
      case 'login':
        this.handleLogin(data);
        break;
      default:
        console.log('未知消息类型', data.type);
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 重新加载
  retryLoad() {
    this.setData({
      loading: true,
      error: false
    });
    
    // 重新设置URL触发重新加载
    const currentUrl = this.data.url;
    this.setData({
      url: ''
    });
    
    setTimeout(() => {
      this.setData({
        url: currentUrl
      });
    }, 100);
  },

  // 处理分享
  handleShare(data) {
    const { title, desc, imageUrl, path } = data;
    
    wx.showShareMenu({
      withShareTicket: true
    });
    
    // 设置分享内容
    wx.updateShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('分享菜单更新成功');
      }
    });
  },

  // 处理登录
  handleLogin(data) {
    const { token, userInfo } = data;
    
    if (token) {
      // 保存登录信息
      wx.setStorageSync('token', token);
      wx.setStorageSync('userInfo', userInfo);
      
      // 发送登录成功事件
      this.triggerEvent('loginSuccess', { userInfo });
    }
  },

  // 记录页面访问
  logPageView(url) {
    const app = getApp();
    if (app && app.logPageView) {
      app.logPageView({
        page: 'webview',
        url: url,
        title: this.data.title
      });
    }
  },

  // 页面显示
  onShow() {
    // 检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (!token) {
      // 未登录，可以显示登录提示
      console.log('用户未登录');
    }
  },

  // 页面卸载
  onUnload() {
    // 清理资源
    this.setData({
      url: '',
      loading: false,
      error: false
    });
  },

  // 用户分享
  onShareAppMessage() {
    return {
      title: this.data.title,
      path: `/pages/webview/webview?url=${encodeURIComponent(this.data.url)}&title=${this.data.title}`
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: this.data.title,
      imageUrl: '/assets/images/share.png'
    };
  }
})