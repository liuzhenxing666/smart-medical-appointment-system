# Web Crawler 服务

智能医生预约挂号系统的Web爬虫服务，负责从医院网站和API获取医生排班、医院信息等数据。

## 功能特性

### 1. 数据爬取功能
- **医院信息爬取**: 获取医院基本信息、科室列表
- **医生信息爬取**: 获取医生详细信息、职称、专业方向
- **排班数据爬取**: 获取医生排班时间、可预约时间段
- **实时数据更新**: 支持定时自动更新数据

### 2. 数据同步功能
- **主数据库同步**: 将爬虫数据同步到主数据库
- **增量同步**: 只同步变更的数据，提高效率
- **事务管理**: 保证数据同步的原子性
- **错误处理**: 完善的错误处理和重试机制

### 3. 监控和管理
- **统计监控**: 爬虫成功率、数据量统计
- **日志管理**: 详细的爬虫操作日志
- **管理界面**: Django Admin管理界面
- **API监控**: 实时监控API调用状态

## API接口

### 实时爬取API
- `GET /api/web-crawler/hospitals/` - 获取医院列表
- `GET /api/web-crawler/departments/` - 获取医院科室
- `GET /api/web-crawler/doctors/` - 获取科室医生

### 医生排班API
- `GET /api/web-crawler/schedules/` - 获取医生排班信息
- `GET /api/web-crawler/weekly-schedules/` - 获取医生一周排班
- `GET /api/web-crawler/available-slots/` - 获取可预约时间段

### 统计监控API
- `GET /api/web-crawler/stats/` - 爬虫统计信息
- `GET /api/web-crawler/stats/hospital/<hospital_name>/` - 医院详细统计
- `GET /api/web-crawler/stats/sync-status/` - 同步状态
- `POST /api/web-crawler/sync/trigger/` - 手动触发同步

## 使用方法

### 1. 环境配置

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑.env文件，配置数据库、Redis等
```

### 2. 数据同步

#### 同步指定医院
```bash
python manage.py sync_hospital_data --hospital "贵州医科大学附属医院"
```

#### 同步所有医院
```bash
python manage.py sync_hospital_data
```

#### 同步指定城市
```bash
python manage.py sync_hospital_data --city "贵阳"
```

### 3. 定时任务

服务支持Celery定时任务，自动执行以下任务：

- **每天凌晨2点**: 同步医院数据
- **每小时**: 同步医生排班数据  
- **每周日凌晨3点**: 清理过期数据

启动定时任务：
```bash
# 启动Celery worker
celery -A smart_doctor worker --loglevel=info

# 启动Celery beat（定时任务）
celery -A smart_doctor beat --loglevel=info
```

## 配置说明

### 爬虫配置
在`web_crawler/config.py`中配置：

```python
CRAWLER_CONFIG = {
    'REQUEST_TIMEOUT': 30,      # 请求超时时间
    'RETRY_COUNT': 3,           # 重试次数
    'MAX_CONCURRENT_REQUESTS': 5, # 最大并发请求数
}
```

### 数据源配置
支持多个医院数据源：

```python
HOSPITAL_SOURCES = {
    'default': {
        'base_url': 'https://api.example.com',
        'api_key': 'your-api-key',
    },
    'guizhou': {
        'base_url': 'https://guizhou-api.com',
        'api_key': 'guizhou-key',
    }
}
```

## 数据模型

### HospitalCrawlData
医院爬虫数据模型：
- `hospital_name`: 医院名称
- `city`: 所在城市
- `crawled_data`: 爬取的原始数据（JSON）
- `data_status`: 数据状态（active/inactive）
- `last_crawled`: 最后爬取时间

### CrawlLog
爬虫日志模型：
- `hospital_name`: 医院名称
- `crawl_type`: 爬虫类型（hospital/doctor/schedule）
- `status`: 爬虫状态（success/error）
- `start_time`: 开始时间
- `end_time`: 结束时间
- `error_message`: 错误信息

## 错误处理

服务提供完善的错误处理机制：

1. **网络错误**: 自动重试机制
2. **数据解析错误**: 详细的错误日志
3. **数据库错误**: 事务回滚机制
4. **业务逻辑错误**: 明确的错误码和提示

## 性能优化

### 缓存策略
- 医院列表缓存24小时
- 排班数据缓存30分钟
- 使用Redis作为缓存后端

### 并发控制
- 限制最大并发请求数
- 请求间隔控制
- 连接池管理

### 数据库优化
- 批量插入/更新操作
- 索引优化
- 查询优化

## 监控指标

### 爬虫指标
- 爬虫成功率
- 平均爬虫时间
- 数据更新频率
- 错误率统计

### 系统指标
- 内存使用情况
- CPU使用率
- 数据库连接数
- 缓存命中率

## 部署说明

### 开发环境
```bash
# 启动开发服务器
python manage.py runserver

# 启动Celery
celery -A smart_doctor worker --loglevel=info
celery -A smart_doctor beat --loglevel=info
```

### 生产环境
```bash
# 使用Gunicorn启动
gunicorn smart_doctor.wsgi:application --bind 0.0.0.0:8000

# 使用Supervisor管理进程
# 配置supervisor配置文件
```

## 故障排除

### 常见问题

1. **爬虫失败**
   - 检查网络连接
   - 验证API密钥
   - 查看错误日志

2. **数据同步失败**
   - 检查数据库连接
   - 验证数据格式
   - 查看同步日志

3. **定时任务不执行**
   - 检查Celery进程状态
   - 验证定时任务配置
   - 查看Beat日志

### 日志查看

日志文件位置：`logs/web_crawler.log`

```bash
# 查看实时日志
tail -f logs/web_crawler.log

# 搜索特定错误
grep "ERROR" logs/web_crawler.log
```

## 扩展开发

### 添加新的数据源

1. 在`services.py`中实现新的爬虫类
2. 在`config.py`中配置数据源信息
3. 在`sync_services.py`中添加同步逻辑

### 自定义爬虫逻辑

继承`BaseCrawler`类，实现以下方法：

```python
class CustomCrawler(BaseCrawler):
    def crawl_hospital_list(self, city):
        # 实现医院列表爬取
        pass
    
    def crawl_doctor_schedules(self, hospital_name, department=None):
        # 实现医生排班爬取
        pass
```

## 版本历史

- v1.0.0: 基础爬虫功能
- v1.1.0: 添加数据同步功能
- v1.2.0: 添加监控和管理界面
- v1.3.0: 性能优化和错误处理改进

## 联系方式

如有问题或建议，请联系开发团队。