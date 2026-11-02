# 腾讯地图API配置指南

## 1. 获取腾讯地图API密钥

### 步骤1：注册腾讯地图开发者账号
1. 访问[腾讯地图开放平台](https://lbs.qq.com/)
2. 点击"注册"按钮，填写相关信息完成账号注册
3. 完成实名认证（需要上传身份证信息）

### 步骤2：创建应用并获取密钥
1. 登录腾讯地图开放平台
2. 进入"控制台"页面
3. 点击"创建应用"按钮
4. 填写应用名称、应用类型选择"Web服务"
5. 提交后，在应用详情页面可以看到"Key"值，这就是API密钥

### 步骤3：配置服务权限
1. 在应用详情页面，点击"设置"按钮
2. 勾选需要的服务权限：
   - 地理编码服务
   - 逆地理编码服务
   - 距离计算服务
   - 周边搜索服务
   - 路径规划服务
3. 保存设置

## 2. 配置项目环境变量

### 开发环境配置
在项目根目录的`.env`文件中添加以下配置：

```env
# 腾讯地图配置
TENCENT_MAP_API_KEY=你的腾讯地图API密钥
```

### 生产环境配置
在生产环境的`.env.production`文件中添加：

```env
# 腾讯地图配置
TENCENT_MAP_API_KEY=你的腾讯地图API密钥
```

## 3. 系统环境变量配置（可选）

### Windows系统
```cmd
# 设置临时环境变量
set TENCENT_MAP_API_KEY="你的腾讯地图API密钥"

# 设置永久环境变量
setx TENCENT_MAP_API_KEY "你的腾讯地图API密钥"
```

### Linux/Mac系统
```bash
# 设置临时环境变量
export TENCENT_MAP_API_KEY="你的腾讯地图API密钥"

# 设置永久环境变量（添加到~/.bashrc或~/.zshrc）
echo 'export TENCENT_MAP_API_KEY="你的腾讯地图API密钥"' >> ~/.bashrc
source ~/.bashrc
```

## 4. 验证配置

### 验证API密钥是否有效
```bash
# 使用curl命令测试地理编码API
curl "https://apis.map.qq.com/ws/geocoder/v1/?key=YOUR_KEY&address=北京市"
```

### 在Django项目中验证
```python
# 在Django shell中测试
python manage.py shell

# 导入腾讯地图客户端
from location.tencent_map_client import tencent_map_client

# 测试地理编码
result = tencent_map_client.geocode(address="北京市")
print(result)
```

## 5. API使用限制

### 免费版配额
- 地理编码：100万次/日
- 逆地理编码：100万次/日
- 距离计算：30万次/日
- 周边搜索：30万次/日
- 路径规划：30万次/日

### 付费版配额
- 可根据业务需求申请更高的配额
- 支持按需付费模式

## 6. 常见问题与解决方案

### 问题1：API调用失败，返回"key is invalid"
**解决方案**：
1. 检查API密钥是否正确
2. 确认应用是否已启用相应服务权限
3. 检查API密钥是否已过期

### 问题2：API调用频率过高被限制
**解决方案**：
1. 实施合理的缓存策略
2. 考虑升级到付费版
3. 优化API调用逻辑，减少不必要的请求

### 问题3：地理编码返回结果不准确
**解决方案**：
1. 尝试添加城市参数提高准确性
2. 使用更详细的地址信息
3. 考虑使用逆地理编码验证结果

## 7. 最佳实践

### 缓存策略
- 对地理编码结果实施缓存，减少API调用
- 建议缓存时间：24小时
- 使用Redis或Django缓存框架

### 错误处理
- 实现完善的错误处理机制
- 记录API调用失败的日志
- 提供备用方案（如使用默认坐标）

### 性能优化
- 批量处理地理位置请求
- 使用异步调用提高响应速度
- 实施API调用频率限制

## 8. 技术支持

- 腾讯地图开发者社区：https://lbs.qq.com/forum.html
- 腾讯地图技术支持：https://lbs.qq.com/contact.html
- API文档：https://lbs.qq.com/webApi/webApiGuide/webApiOverview

## 9. 更新日志

- 2025-11-14：创建腾讯地图API配置指南
- 替换原有高德地图API配置