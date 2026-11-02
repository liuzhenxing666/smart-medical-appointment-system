# 智慧医疗预约平台 - 微信小程序

## 项目简介

这是一个基于微信小程序的智慧医疗预约平台，为用户提供便捷的医院搜索、医生预约、健康管理等服务。

## 功能特性

### 🏥 核心功能
- **智能定位**: 自动获取用户位置，推荐附近医院
- **医院搜索**: 支持按名称、科室、距离搜索医院
- **医生查询**: 查看医生详细信息、排班和评价
- **在线预约**: 便捷的医生预约系统
- **个人中心**: 用户信息管理、预约记录查看

### 🎯 用户体验
- **响应式设计**: 适配不同尺寸设备
- **智能推荐**: 基于位置和用户偏好推荐医院
- **多种登录**: 支持微信一键登录、手机号登录
- **错误处理**: 完善的错误提示和重试机制

## 技术栈

- **前端**: 微信小程序原生开发
- **后端**: Django REST Framework
- **数据库**: SQLite (开发) / MySQL (生产)
- **部署**: 本地开发环境

## 项目结构

```
miniprogram-frontend/
├── pages/                    # 页面文件
│   ├── index/                # 首页
│   ├── hospitals/            # 医院列表
│   ├── doctors/             # 医生列表
│   ├── doctor-detail/       # 医生详情
│   ├── my-appointments/     # 我的预约
│   ├── profile/             # 个人中心
│   ├── login/               # 登录页面
│   ├── webview/             # WebView页面
│   └── error/               # 错误页面
├── utils/                   # 工具函数
│   ├── request.js           # 网络请求封装
│   └── util.js              # 通用工具函数
├── app.js                   # 小程序入口
├── app.json                 # 小程序配置
├── app.wxss                 # 全局样式
├── sitemap.json             # 页面索引
└── project.config.json      # 项目配置
```

## 快速开始

### 1. 环境准备

#### 后端环境
```bash
# 确保Python 3.8+环境
python --version

# 安装依赖
pip install -r requirements.txt

# 数据库迁移
python manage.py makemigrations
python manage.py migrate

# 创建超级用户
python manage.py createsuperuser

# 启动开发服务器
python manage.py runserver 0.0.0.0:8000
```

#### 前端环境
- 下载并安装微信开发者工具
- 申请小程序AppID（或使用测试号）

### 2. 导入项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择 `miniprogram-frontend` 目录
4. 输入AppID（测试号可跳过）
5. 点击"确定"导入

### 3. 配置修改

#### API配置
修改 `utils/request.js` 中的BASE_URL：
```javascript
// 开发环境
const BASE_URL = 'http://localhost:8000/api/miniprogram/';

// 生产环境
// const BASE_URL = 'https://your-domain.com/api/miniprogram/';
```

#### 小程序配置
在微信公众平台配置合法域名：
- request合法域名: `http://localhost:8000` (开发环境)
- uploadFile合法域名: `http://localhost:8000`
- downloadFile合法域名: `http://localhost:8000`

### 4. 运行测试

1. **启动后端服务**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

2. **编译小程序**
   - 在微信开发者工具中点击"编译"
   - 检查控制台是否有错误

3. **功能测试**
   - 测试首页定位功能
   - 测试医院搜索功能
   - 测试用户登录流程
   - 测试预约功能

## 页面说明

### 首页 (/pages/index/index)
- 位置定位和附近医院推荐
- 快捷功能入口
- 搜索框和分类导航

### 医院列表 (/pages/hospitals/hospitals)
- 医院搜索和筛选
- 距离排序和评分显示
- 分页加载功能

### 医生列表 (/pages/doctors/doctors)
- 医生搜索和科室筛选
- 医院筛选和排序
- 医生信息预览

### 医生详情 (/pages/doctor-detail/doctor-detail)
- 医生详细信息展示
- 排班信息和预约时间
- 患者评价和评分

### 我的预约 (/pages/my-appointments/my-appointments)
- 预约记录查看
- 预约状态管理
- 取消预约和评价功能

### 个人中心 (/pages/profile/profile)
- 用户信息管理
- 预约历史查看
- 设置和帮助中心

## API接口

### 认证相关
- `POST /api/miniprogram/auth/login/` - 微信登录
- `POST /api/miniprogram/auth/logout/` - 退出登录
- `GET /api/miniprogram/auth/profile/` - 获取用户信息

### 医院相关
- `GET /api/miniprogram/hospitals/` - 医院列表
- `GET /api/miniprogram/hospitals/{id}/` - 医院详情
- `GET /api/miniprogram/hospitals/nearby/` - 附近医院

### 医生相关
- `GET /api/miniprogram/doctors/` - 医生列表
- `GET /api/miniprogram/doctors/{id}/` - 医生详情
- `GET /api/miniprogram/doctors/schedule/` - 医生排班

### 预约相关
- `POST /api/miniprogram/appointments/` - 创建预约
- `GET /api/miniprogram/appointments/` - 预约列表
- `PUT /api/miniprogram/appointments/{id}/` - 更新预约
- `DELETE /api/miniprogram/appointments/{id}/` - 取消预约

## 开发指南

### 代码规范
- 使用ES6+语法特性
- 遵循微信小程序开发规范
- 保持代码注释清晰

### 样式规范
- 使用CSS变量定义设计系统
- 采用响应式设计
- 保持样式模块化

### 组件开发
- 遵循小程序组件规范
- 保持组件单一职责
- 提供完善的props和events

## 常见问题

### Q: 小程序无法获取位置
A: 检查小程序是否已授权位置权限，设备GPS是否开启

### Q: 网络请求失败
A: 检查BASE_URL配置，后端服务是否运行，网络连接是否正常

### Q: 页面白屏
A: 检查页面路径配置，组件引入是否正确，查看控制台错误信息

### Q: 数据加载失败
A: 检查API接口响应格式，验证数据解析逻辑

## 部署说明

### 开发环境
- 使用微信开发者工具进行调试
- 后端使用Django开发服务器
- 数据库使用SQLite

### 生产环境
- 小程序发布到微信平台
- 后端部署到云服务器
- 数据库使用MySQL
- 配置HTTPS和域名

## 更新日志

### v1.0.0 (2025-11-12)
- ✅ 完成基础页面架构
- ✅ 实现核心功能模块
- ✅ 优化用户体验
- ✅ 完善错误处理机制

## 联系方式

- 技术支持: tech-support@example.com
- 项目负责人: project-manager@example.com
- 问题反馈: feedback@example.com

---

**文档版本**: v1.0  
**最后更新**: 2025-11-12  
**维护团队**: 智慧医疗项目组