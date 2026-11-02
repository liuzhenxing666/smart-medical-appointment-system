# 智慧医疗预约平台

基于 **Django REST Framework + 微信小程序** 的医疗预约挂号系统。提供医院与医生检索、排班预约、收藏评价、地图导航与个性化推荐，配套 PC 端演示页面和完整的系统设计文档。

> 本项目为课程实践 / 教学演示项目，包含后端 API、微信小程序、网页端与文档四部分。

---

## 功能模块

| 模块 | 能力 |
|---|---|
| 用户认证 | 手机号注册登录、密码 / 验证码登录、JWT 鉴权、个人资料编辑、头像 |
| 医院 | 列表分页、按等级 / 距离 / 评分筛选排序、关键词搜索、详情、收藏 |
| 医生 | 按科室 / 职称筛选、详情、擅长标签、7 天排班查看、收藏 |
| 预约挂号 | 选择日期与时段、科室类型、患者信息、提交预约、取消预约、确认到院 |
| 评价 | 医生评分分布、评价列表 |
| 推荐 | 基于浏览与预约行为的推荐接口（numpy / pandas） |
| 地图导航 | 定位、附近医院、路线规划入口 |
| 数据采集 | web_crawler 模块采集与清洗医院数据 |

## 技术栈

**后端**
- Django 5.1.2、Django REST Framework 3.15.2
- SimpleJWT（JWT 认证）、django-filter、django-cors-headers
- SQLite（开发默认）/ PostgreSQL（生产可切换）
- Redis + Celery（异步任务，可选）
- numpy 2.2.6、pandas 2.2.3、beautifulsoup4（推荐与采集）
- Pillow、whitenoise、gunicorn

**前端**
- 微信小程序：原生 WXML / WXSS / JavaScript
- 网页端：HTML + 原生 CSS / JS 模板

## 项目结构

```
.
├── smart_doctor/           # Django 配置与路由
├── users/                  # 用户与认证
├── hospitals/              # 医院
├── doctors/                # 医生与排班
├── appointments/           # 预约挂号
├── favorites/              # 收藏
├── reviews/                # 评价
├── location/               # 定位与导航
├── recommendation/         # 推荐系统
├── web_crawler/            # 数据采集
├── miniprogram/            # 小程序服务端接口
├── miniprogram-frontend/   # 微信小程序前端
├── hospital_booking/       # 网页端静态资源
├── web-frontend/           # 独立网页前端
├── templates/ static/      # 后端模板与静态资源
├── scripts/                # 数据与图标辅助脚本
├── 架构/                   # 系统设计文档（概述 / 需求 / 架构 / 数据库等）
├── 项目交付和测试总结文档/   # 开发与测试记录
├── requirements.txt
└── manage.py
```

## 快速开始

### 1. 后端

```bash
# 创建并激活虚拟环境
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（按需修改）
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux

# 初始化数据库
python manage.py migrate

# 创建管理员账号
python manage.py createsuperuser

# 启动服务
python manage.py runserver
```

- API 根地址：`http://127.0.0.1:8000/api/`
- 管理后台：`http://127.0.0.1:8000/admin/`

> 数据库文件未随仓库提供。首次运行后，请在管理后台录入医院、科室、医生与排班数据，即可在小程序端看到完整内容。

### 2. 微信小程序

1. 用「微信开发者工具」导入 `miniprogram-frontend` 目录
2. 修改 `miniprogram-frontend/app.js` 中的 `baseURL`：

```javascript
baseURL: 'http://127.0.0.1:8000/api/'
```

3. 本地调试时在开发者工具中勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
4. 编译预览

### 3. 网页端

直接打开 `web-frontend/index.html`，或访问后端提供的模板页面。

## API 概览

| 路径 | 说明 |
|---|---|
| `/api/users/` | 注册、登录、用户资料 |
| `/api/hospitals/` | 医院列表与详情 |
| `/api/doctors/` | 医生列表、详情与排班 |
| `/api/appointments/` | 预约创建、查询、取消 |
| `/api/favorites/` | 收藏管理 |
| `/api/reviews/` | 评价查询 |
| `/api/recommendation/` | 个性化推荐 |

## 文档

- `架构/01-项目概述文档.md` ～ `架构/08-Mermaid流程图文档.md`：需求、架构、数据库、模块设计
- `项目交付和测试总结文档/`：开发优化、测试与修复记录

## 已知限制

以下入口当前为轻量提示（`wx.showToast`），尚未接入完整页面或后端能力：

- 在线咨询、发布评价、预约详情、注册账号、找回密码
- 预约表单中的患者姓名 / 手机号等字段，后端模型尚未持久化

## 许可

本项目采用 [MIT License](LICENSE)。
