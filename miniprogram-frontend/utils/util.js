// 工具函数集合

// 格式化日期
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  const formats = {
    'YYYY-MM-DD': `${year}-${month}-${day}`,
    'YYYY-MM-DD HH:mm': `${year}-${month}-${day} ${hours}:${minutes}`,
    'YYYY-MM-DD HH:mm:ss': `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    'MM-DD': `${month}-${day}`,
    'HH:mm': `${hours}:${minutes}`,
    'HH:mm:ss': `${hours}:${minutes}:${seconds}`
  };
  
  return formats[format] || formats['YYYY-MM-DD'];
};

// 格式化时间间隔
const formatTimeAgo = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
};

// 格式化数字（千分位）
const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '0';
  
  const number = Number(num);
  if (isNaN(number)) return '0';
  
  const fixedNum = number.toFixed(decimals);
  const parts = fixedNum.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.join('.');
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 防抖函数
const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
};

// 节流函数
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 深拷贝
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
};

// 对象合并
const merge = (target, ...sources) => {
  sources.forEach(source => {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  });
  
  return target;
};

// 生成随机ID
const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// 验证手机号
const validatePhone = (phone) => {
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(phone);
};

// 验证邮箱
const validateEmail = (email) => {
  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return reg.test(email);
};

// 验证身份证号
const validateIdCard = (idCard) => {
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return reg.test(idCard);
};

// 验证URL
const validateUrl = (url) => {
  const reg = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
  return reg.test(url);
};

// 获取URL参数
const getUrlParams = (url) => {
  const params = {};
  const urlParts = url.split('?');
  
  if (urlParts.length > 1) {
    const queryString = urlParts[1];
    const pairs = queryString.split('&');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
  }
  
  return params;
};

// 处理图片URL，如果为空则返回默认图片
const getImageUrl = (imageUrl, defaultImage, type = 'hospital') => {
  if (imageUrl && imageUrl.trim() !== '') {
    // 如果已经是完整URL，直接返回
    if (imageUrl.startsWith('http')) {
      console.log('使用完整URL图片:', imageUrl);
      return imageUrl;
    }
    
    // 如果是相对路径，需要拼接完整的URL
    // 因为后端返回的图片路径是相对于媒体文件服务器的路径
    if (imageUrl.startsWith('/media/')) {
      // 媒体文件路径，需要拼接后端服务器地址
      const baseURL = 'http://127.0.0.1:8000';
      const fullUrl = baseURL + imageUrl;
      console.log('拼接媒体文件URL:', fullUrl);
      return fullUrl;
    } else if (imageUrl.startsWith('../../images/')) {
      // 本地图片路径，直接返回
      console.log('使用本地图片:', imageUrl);
      return imageUrl;
    }
    
    // 其他相对路径，直接返回
    console.log('使用相对路径图片:', imageUrl);
    return imageUrl;
  }
  
  // 根据类型返回不同的默认图片
  const defaultImages = {
    'hospital': '../../images/hospital-default.png',
    'doctor': '../../images/doctor-default.png',
    'avatar': '../../images/default-avatar.png',
    'banner': '../../images/banner1.jpg'
  };
  
  // 如果指定了默认图片，使用指定的
  if (defaultImage) {
    return defaultImage;
  }
  
  // 返回对应类型的默认图片
  return defaultImages[type] || defaultImages['hospital'];
};

// 增强的图片加载错误处理
const handleImageError = (e, type = 'hospital') => {
  console.warn(`图片加载失败:`, e.detail);
  
  const defaultImages = {
    'hospital': '../../images/hospital-default.png',
    'doctor': '../../images/doctor-default.png',
    'avatar': '../../images/default-avatar.png',
    'banner': '../../images/banner1.jpg'
  };
  
  // 设置默认图片
  e.currentTarget.src = defaultImages[type] || defaultImages['hospital'];
  
  // 标记图片加载失败
  e.currentTarget.dataset.loadError = 'true';
};

// 处理医院图片
const getHospitalImage = (hospital) => {
  if (!hospital) return '../../images/hospital-default.png';
  
  // 如果医院有图片，使用医院图片，并调用getImageUrl处理URL
  if (hospital.image && hospital.image.trim() !== '') {
    return getImageUrl(hospital.image, null, 'hospital');
  }
  
  // 使用随机医院环境图片作为默认
  const randomIndex = Math.floor(Math.random() * 8) + 1;
  return `../../images/hospital-env-${randomIndex}.jpg`;
};

// 处理医生头像
const getDoctorAvatar = (doctor) => {
  if (!doctor) return '../../images/doctor-default.png';
  
  // 如果医生有头像，使用医生头像，并调用getImageUrl处理URL
  if (doctor.avatar && doctor.avatar.trim() !== '') {
    return getImageUrl(doctor.avatar, null, 'doctor');
  }
  
  // 使用随机医生头像作为默认
  const randomIndex = Math.floor(Math.random() * 10) + 1;
  return `../../images/doctor-avatar-${randomIndex}.png`;
};

// 处理用户头像
const getUserAvatar = (user) => {
  if (!user) return '../../images/default-avatar.png';
  
  // 如果用户有头像，使用用户头像，并调用getImageUrl处理URL
  if (user.avatar && user.avatar.trim() !== '') {
    return getImageUrl(user.avatar, null, 'avatar');
  }
  
  // 使用默认用户头像
  return '../../images/default-avatar.png';
};

// 处理轮播图图片
const getBannerImage = (hospital, index) => {
  if (!hospital) return '../../images/banner1.jpg';
  
  // 如果医院有图片，使用医院图片，并调用getImageUrl处理URL
  if (hospital.image && hospital.image.trim() !== '') {
    return getImageUrl(hospital.image, null, 'banner');
  }
  
  // 使用轮播图默认图片（循环使用banner1-banner5）
  const bannerIndex = (index % 5) + 1;
  return `../../images/banner${bannerIndex}.jpg`;
};

// 构建URL查询字符串（兼容微信小程序，替代URLSearchParams）
const buildQueryString = (params) => {
  if (!params || typeof params !== 'object') {
    return '';
  }
  
  const queryParts = [];
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
    }
  });
  
  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
};

// 构建完整的URL（兼容微信小程序）
const buildUrl = (baseUrl, params) => {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = buildQueryString(params);
  return `${baseUrl}${queryString}`;
};

// 构建URL参数
const buildUrlParams = (params) => {
  const pairs = [];
  
  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    }
  }
  
  return pairs.length > 0 ? '?' + pairs.join('&') : '';
};

// 本地存储封装
const storage = {
  set: (key, value) => {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch (error) {
      console.error('存储失败:', error);
      return false;
    }
  },
  
  get: (key, defaultValue = null) => {
    try {
      const value = wx.getStorageSync(key);
      return value !== '' ? value : defaultValue;
    } catch (error) {
      console.error('读取存储失败:', error);
      return defaultValue;
    }
  },
  
  remove: (key) => {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (error) {
      console.error('删除存储失败:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      wx.clearStorageSync();
      return true;
    } catch (error) {
      console.error('清空存储失败:', error);
      return false;
    }
  }
};

// 显示加载提示
const showLoading = (title = '加载中...', mask = true) => {
  wx.showLoading({
    title,
    mask
  });
};

// 隐藏加载提示
const hideLoading = () => {
  wx.hideLoading();
};

// 显示成功提示
const showSuccess = (title = '操作成功', duration = 2000) => {
  wx.showToast({
    title,
    icon: 'success',
    duration
  });
};

// 显示错误提示
const showError = (title = '操作失败', duration = 2000) => {
  wx.showToast({
    title,
    icon: 'none',
    duration
  });
};

// 显示确认对话框
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
};

// 获取系统信息
const getSystemInfo = () => {
  return new Promise((resolve, reject) => {
    wx.getSystemInfo({
      success: resolve,
      fail: reject
    });
  });
};

// 检查网络状态
const checkNetwork = () => {
  return new Promise((resolve, reject) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType);
      },
      fail: reject
    });
  });
};

// 复制文本到剪贴板
const copyText = (text) => {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: resolve,
      fail: reject
    });
  });
};

// 获取当前位置
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject
    });
  });
};

// 计算两点间距离（米）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 格式化距离
const formatDistance = (distance) => {
  if (distance < 1000) {
    return Math.round(distance) + 'm';
  } else {
    return (distance / 1000).toFixed(1) + 'km';
  }
};

module.exports = {
  formatDate,
  formatTimeAgo,
  formatNumber,
  formatFileSize,
  debounce,
  throttle,
  deepClone,
  merge,
  generateId,
  validatePhone,
  validateEmail,
  validateIdCard,
  validateUrl,
  getUrlParams,
  buildQueryString,
  buildUrl,
  buildUrlParams,
  storage,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm,
  getSystemInfo,
  checkNetwork,
  copyText,
  getCurrentLocation,
  calculateDistance,
  formatDistance,
  getImageUrl,
  getHospitalImage,
  getDoctorAvatar,
  getUserAvatar,
  getBannerImage
};