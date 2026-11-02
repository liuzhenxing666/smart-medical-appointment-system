// 网络请求工具函数
const { buildUrl } = require('./util')

// 基础URL配置
// 微信开发者工具中，图片资源请求需要与API请求使用相同的基础URL
// 为了简化配置，统一使用localhost:8000
const BASE_URL = 'http://localhost:8000/api';

// 请求拦截器
const requestInterceptor = (config) => {
  // 添加认证token
  const token = wx.getStorageSync('token');
  if (token) {
    config.header = config.header || {};
    config.header['Authorization'] = `Bearer ${token}`;
  }
  
  // 添加时间戳防止缓存
  if (config.method === 'GET') {
    config.url += (config.url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
  }
  
  return config;
};

// 响应拦截器
const responseInterceptor = (response) => {
  const { statusCode, data } = response;
  
  if (statusCode === 200) {
    return data;
  } else if (statusCode === 401) {
    // 认证失败，清除token并跳转到登录页
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    wx.showModal({
      title: '登录已过期',
      content: '请重新登录',
      showCancel: false,
      success: () => {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    });
    
    throw new Error('认证失败');
  } else if (statusCode === 403) {
    wx.showToast({
      title: '无权限访问',
      icon: 'none'
    });
    throw new Error('无权限访问');
  } else if (statusCode >= 500) {
    wx.showToast({
      title: '服务器错误',
      icon: 'none'
    });
    throw new Error('服务器错误');
  } else {
    throw new Error(`请求失败: ${statusCode}`);
  }
};

// 错误处理
const errorHandler = (error) => {
  console.error('请求错误:', error);
  
  if (error.errMsg && error.errMsg.includes('network')) {
    wx.showToast({
      title: '网络连接失败',
      icon: 'none'
    });
    throw new Error('网络连接失败');
  }
  
  throw error;
};

// 基础请求方法
const request = (config) => {
  return new Promise((resolve, reject) => {
    // 应用请求拦截器
    const finalConfig = requestInterceptor(config);
    
    wx.request({
      ...finalConfig,
      success: (res) => {
        try {
          const result = responseInterceptor(res);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) => {
        try {
          errorHandler(error);
          reject(error);
        } catch (finalError) {
          reject(finalError);
        }
      }
    });
  });
};

// GET请求
const get = (url, data = {}, config = {}) => {
  let finalUrl = BASE_URL + url
  
  // 将GET请求参数构建为查询字符串 - 使用兼容微信小程序的URL构建函数
  if (Object.keys(data).length > 0) {
    finalUrl = buildUrl(finalUrl, data)
  }
  
  return request({
    url: finalUrl,
    method: 'GET',
    ...config
  })
};

// POST请求
const post = (url, data = {}, config = {}) => {
  return request({
    url: BASE_URL + url,
    data,
    method: 'POST',
    header: {
      'content-type': 'application/json',
      ...config.header
    },
    ...config
  });
};

// PUT请求
const put = (url, data = {}, config = {}) => {
  return request({
    url: BASE_URL + url,
    data,
    method: 'PUT',
    header: {
      'content-type': 'application/json',
      ...config.header
    },
    ...config
  });
};

// DELETE请求
const del = (url, data = {}, config = {}) => {
  return request({
    url: BASE_URL + url,
    data,
    method: 'DELETE',
    ...config
  });
};

// 上传文件
const upload = (url, filePath, formData = {}, config = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.uploadFile({
      url: BASE_URL + url,
      filePath,
      name: 'file',
      formData: {
        ...formData
      },
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        ...config.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (error) {
            reject(new Error('解析响应失败'));
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`));
        }
      },
      fail: (error) => {
        errorHandler(error);
        reject(error);
      }
    });
  });
};

// 下载文件
const download = (url, config = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.downloadFile({
      url: BASE_URL + url,
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        ...config.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          reject(new Error(`下载失败: ${res.statusCode}`));
        }
      },
      fail: (error) => {
        errorHandler(error);
        reject(error);
      }
    });
  });
};

// 批量请求
const all = (requests) => {
  return Promise.all(requests);
};

// 设置请求超时
const setRequestTimeout = (timeout) => {
  // 小程序原生不支持设置超时，这里只是记录配置
  console.log('设置请求超时:', timeout);
};

// 设置基础URL
const setBaseUrl = (baseUrl) => {
  BASE_URL = baseUrl;
};

module.exports = {
  request,
  get,
  post,
  put,
  del,
  upload,
  download,
  all,
  setRequestTimeout,
  setBaseUrl,
  BASE_URL
};