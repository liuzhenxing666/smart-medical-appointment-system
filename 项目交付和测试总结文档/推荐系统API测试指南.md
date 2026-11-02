# 推荐系统API测试指南

## 测试环境准备

### 1. 启动开发服务器
```bash
# 在项目根目录下执行
python manage.py runserver
```

服务器启动后，API服务将在 `http://127.0.0.1:8000/` 运行。

### 2. 测试工具推荐

- **浏览器**: 用于GET请求测试
- **Postman**: 用于POST请求测试
- **curl**: 命令行测试工具
- **Python requests**: 编程测试

## API测试用例

### 测试用例1: 用户偏好管理

#### 1.1 获取用户偏好 (GET)
```bash
# 使用curl测试
curl "http://127.0.0.1:8000/api/recommendation/preferences/?user_id=1"

# 使用浏览器访问
http://127.0.0.1:8000/api/recommendation/preferences/?user_id=1
```

**预期结果**: 返回用户1的偏好设置，或空数组

#### 1.2 创建用户偏好 (POST)
```bash
# 使用curl测试
curl -X POST "http://127.0.0.1:8000/api/recommendation/preferences/" \
     -H "Content-Type: application/json" \
     -d '{
           "user": 1,
           "preference_type": "hospital_type",
           "preference_value": "综合医院",
           "weight": 0.8
         }'
```

**预期结果**: 返回创建的用户偏好记录

### 测试用例2: 热门项目推荐

#### 2.1 获取热门医院
```bash
# 使用curl测试
curl "http://127.0.0.1:8000/api/recommendation/popular/?item_type=hospital&limit=5"

# 使用浏览器访问
http://127.0.0.1:8000/api/recommendation/popular/?item_type=hospital&limit=5
```

**预期结果**: 返回热门医院列表

#### 2.2 获取热门医生
```bash
# 使用curl测试
curl "http://127.0.0.1:8000/api/recommendation/popular/?item_type=doctor&limit=5"

# 使用浏览器访问
http://127.0.0.1:8000/api/recommendation/popular/?item_type=doctor&limit=5
```

**预期结果**: 返回热门医生列表

### 测试用例3: 推荐历史查询

#### 3.1 获取用户推荐历史
```bash
# 使用curl测试
curl "http://127.0.0.1:8000/api/recommendation/history/?user_id=1&limit=10"

# 使用浏览器访问
http://127.0.0.1:8000/api/recommendation/history/?user_id=1&limit=10
```

**预期结果**: 返回用户1的推荐历史记录

### 测试用例4: POST请求API测试

以下API需要使用POST方法，建议使用Postman或编程方式测试：

#### 4.1 医院推荐 (需要POST)
```python
import requests

# Python测试代码
response = requests.post(
    'http://127.0.0.1:8000/api/recommendation/hospitals/',
    json={
        'user_id': 1,
        'latitude': 39.9042,
        'longitude': 116.4074,
        'max_distance': 100,
        'limit': 10
    }
)
print(response.json())
```

#### 4.2 医生推荐 (需要POST)
```python
import requests

response = requests.post(
    'http://127.0.0.1:8000/api/recommendation/doctors/',
    json={
        'user_id': 1,
        'specialty': '内科',
        'hospital_id': 1,
        'limit': 10
    }
)
print(response.json())
```

#### 4.3 用户行为记录 (需要POST)
```python
import requests

response = requests.post(
    'http://127.0.0.1:8000/api/recommendation/behavior/',
    json={
        'user': 1,
        'behavior_type': 'view',
        'item_type': 'hospital',
        'item_id': 1,
        'metadata': {'duration': 30, 'page': 'hospital_detail'}
    }
)
print(response.json())
```

#### 4.4 推荐反馈 (需要POST)
```python
import requests

response = requests.post(
    'http://127.0.0.1:8000/api/recommendation/feedback/',
    json={
        'user': 1,
        'recommendation_id': 'test-uuid',
        'feedback_type': 'positive',
        'average_rating': 5,
        'comments': '推荐很准确'
    }
)
print(response.json())
```

## 完整测试流程

### 步骤1: 基础功能测试
1. 启动服务器
2. 测试GET请求API (偏好、热门、历史)
3. 验证返回状态码为200

### 步骤2: 数据创建测试
1. 创建用户偏好
2. 记录用户行为
3. 验证数据创建成功

### 步骤3: 推荐功能测试
1. 测试医院推荐
2. 测试医生推荐
3. 验证推荐结果合理性

### 步骤4: 反馈机制测试
1. 提交推荐反馈
2. 验证反馈记录成功

## 常见问题排查

### 问题1: 405 Method Not Allowed
**原因**: 使用了错误的HTTP方法
**解决**: 检查API文档，使用正确的HTTP方法 (GET/POST)

### 问题2: 500 Internal Server Error
**原因**: 服务器内部错误
**解决**: 检查服务器日志，查看具体错误信息

### 问题3: 404 Not Found
**原因**: API路径错误
**解决**: 检查URL路径是否正确

### 问题4: 400 Bad Request
**原因**: 请求参数错误
**解决**: 检查请求参数格式和必填项

## 测试数据准备

### 用户数据
- 用户ID: 1 (测试用)
- 确保用户表中有测试数据

### 医院数据
- 医院ID: 1 (测试用)
- 确保医院表中有测试数据

### 医生数据
- 医生ID: 1 (测试用)
- 确保医生表中有测试数据

## 性能测试建议

### 并发测试
```python
import requests
import concurrent.futures

def test_api(user_id):
    response = requests.get(f'http://127.0.0.1:8000/api/recommendation/preferences/?user_id={user_id}')
    return response.status_code

# 并发测试
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = executor.map(test_api, range(1, 11))
    for result in results:
        print(result)
```

### 响应时间测试
```python
import time
import requests

start_time = time.time()
response = requests.get('http://127.0.0.1:8000/api/recommendation/popular/?item_type=hospital&limit=5')
end_time = time.time()

print(f"响应时间: {end_time - start_time:.2f}秒")
print(f"状态码: {response.status_code}")
```

## 自动化测试脚本

创建一个完整的测试脚本：

```python
import requests
import json

class RecommendationAPITest:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
    
    def test_get_preferences(self, user_id=1):
        """测试获取用户偏好"""
        url = f"{self.base_url}/preferences/"
        params = {'user_id': user_id}
        response = self.session.get(url, params=params)
        return response.status_code == 200
    
    def test_popular_hospitals(self, limit=5):
        """测试热门医院"""
        url = f"{self.base_url}/popular/"
        params = {'item_type': 'hospital', 'limit': limit}
        response = self.session.get(url, params=params)
        return response.status_code == 200
    
    def run_all_tests(self):
        """运行所有测试"""
        tests = [
            ("获取用户偏好", self.test_get_preferences),
            ("热门医院推荐", self.test_popular_hospitals),
        ]
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                status = "✓ 通过" if result else "✗ 失败"
                print(f"{test_name}: {status}")
            except Exception as e:
                print(f"{test_name}: ✗ 错误 - {e}")

# 运行测试
if __name__ == "__main__":
    tester = RecommendationAPITest("http://127.0.0.1:8000/api/recommendation")
    tester.run_all_tests()
```

## 测试报告模板

测试完成后，可以生成测试报告：

```
推荐系统API测试报告
====================

测试时间: 2025-11-12 12:00:00
测试环境: 开发环境
服务器地址: http://127.0.0.1:8000

测试结果:
- 用户偏好管理API: ✓ 通过
- 热门项目推荐API: ✓ 通过  
- 推荐历史查询API: ✓ 通过
- 医院推荐API: ✓ 通过
- 医生推荐API: ✓ 通过
- 用户行为记录API: ✓ 通过
- 推荐反馈API: ✓ 通过

总体评价: 所有API功能正常，推荐系统运行稳定
```

通过以上测试指南，您可以全面验证推荐系统API的功能和性能。