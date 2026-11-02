// 编辑个人资料页面
const app = getApp()

Page({
  data: {
    userInfo: {},
    name: '',
    age: '',
    gender: '',
    genderOptions: ['男', '女'],
    genderIndex: 0,
    isSubmitting: false
  },

  onLoad() {
    this.loadUserProfile()
  },

  // 加载用户信息
  async loadUserProfile() {
    try {
      const result = await app.request({
        url: 'profiles/me/'
      })
      
      if (result.success) {
        const user = result.data
        // 转换性别字段
        let genderIndex = 0
        if (user.gender === 'female') {
          genderIndex = 1
        }
        
        this.setData({
          userInfo: user,
          name: user.name || '',
          age: user.age || '',
          gender: user.gender || 'male',
          genderIndex: genderIndex
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({
      name: e.detail.value
    })
  },

  // 年龄输入
  onAgeInput(e) {
    this.setData({
      age: e.detail.value
    })
  },

  // 性别选择
  onGenderChange(e) {
    const index = e.detail.value
    const gender = index === 0 ? 'male' : 'female'
    this.setData({
      genderIndex: index,
      gender: gender
    })
  },

  // 保存个人资料
  async saveProfile() {
    if (!this.validateForm()) {
      return
    }
    
    this.setData({ isSubmitting: true })
    
    try {
      const profileData = {
        name: this.data.name,
        age: parseInt(this.data.age) || null,
        gender: this.data.gender
      }
      
      const result = await app.request({
        url: 'profiles/me/',
        method: 'PATCH',
        data: profileData
      })
      
      if (result.success) {
        // 更新全局用户信息
        const updatedUserInfo = {
          ...app.globalData.userInfo,
          name: this.data.name,
          age: parseInt(this.data.age) || null,
          gender: this.data.gender
        }
        
        app.globalData.userInfo = updatedUserInfo
        wx.setStorageSync('userInfo', updatedUserInfo)
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result.message || '保存失败')
      }
      
    } catch (error) {
      console.error('保存个人资料失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  // 表单验证
  validateForm() {
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return false
    }
    
    if (!this.data.age) {
      wx.showToast({
        title: '请输入年龄',
        icon: 'none'
      })
      return false
    }
    
    const ageNum = parseInt(this.data.age)
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      wx.showToast({
        title: '请输入有效年龄',
        icon: 'none'
      })
      return false
    }
    
    return true
  }
})