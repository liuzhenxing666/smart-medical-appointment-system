// 隐私政策页面
Page({
  data: {
    
  },

  onLoad(options) {
    console.log('隐私政策页面加载', options)
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 同意并返回
  agreeAndBack() {
    // 获取上一页实例
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    
    if (prevPage && prevPage.route === 'pages/login/login') {
      // 设置协议同意状态
      prevPage.setData({
        agreed: true
      })
      
      // 检查提交状态
      if (prevPage.checkSubmitStatus) {
        prevPage.checkSubmitStatus()
      }
    }
    
    wx.navigateBack()
  }
})