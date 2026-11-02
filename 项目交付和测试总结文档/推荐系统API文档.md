# 智能医生推荐系统 API 文档

## 概述

智能医生推荐系统提供基于用户偏好、行为数据和位置信息的个性化医疗推荐服务。系统支持医院推荐、医生推荐、热门项目推荐等功能。

**基础URL**: `http://127.0.0.1:8000/api/recommendation/`

## API 响应格式规范

所有API接口都遵循统一的响应格式，确保前端能够一致地处理响应数据。

### 成功响应格式

```json
{
    "success": true,
    "message": "操作成功描述",
    "data": {
        // 具体的业务数据
    },
    "status_code": 200
}
```

### 错误响应格式

```json
{
    "success": false,
    "message": "错误描述信息",
    "error_code": "ERROR_CODE",
    "details": {
        // 详细的错误信息
    },
    "status_code": 400
}
```

### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| message | string | 操作结果描述 |
| data | object/array | 业务数据（成功时返回） |
| error_code | string | 错误代码（失败时返回） |
| details | object | 错误详情（失败时返回） |
| status_code | integer | HTTP状态码 |

### 常见错误代码

- `VALIDATION_ERROR`: 参数验证失败
- `NOT_FOUND`: 资源不存在
- `UNAUTHORIZED`: 未授权访问
- `FORBIDDEN`: 权限不足
- `SERVER_ERROR`: 服务器内部错误

## API 端点列表

## API 端点列表

### 1. 用户偏好管理 API

#### 获取用户偏好
- **URL**: `/preferences/`
- **方法**: GET
- **描述**: 获取指定用户的偏好设置
- **参数**:
  - `user_id` (必填): 用户ID

**请求示例**:
```
GET /api/recommendation/preferences/?user_id=1
```

**响应示例**:
```json
{
    "success": true,
    "message": "用户偏好获取成功",
    "data": {
        "user_id": 1,
        "preferences": [
            {
                "id": "uuid-string",
                "preference_type": "hospital_type",
                "preference_value": "综合医院",
                "weight": 0.8,
                "created_at": "2025-11-12T12:00:00Z"
            }
        ]
    },
    "status_code": 200
}
```

#### 创建/更新用户偏好
- **URL**: `/preferences/`
- **方法**: POST
- **描述**: 创建或更新用户偏好设置
- **请求体**:
```json
{
    "user": 1,
    "preference_type": "hospital_type",
    "preference_value": "综合医院",
    "weight": 0.8
}
```

**响应示例**:
```json
{
    "success": true,
    "message": "用户偏好创建成功",
    "data": {
        "id": "uuid-string",
        "user": 1,
        "preference_type": "hospital_type",
        "preference_value": "综合医院",
        "weight": 0.8,
        "created_at": "2025-11-12T12:00:00Z"
    },
    "status_code": 201
}
```

### 2. 用户行为记录 API

#### 记录用户行为
- **URL**: `/behavior/`
- **方法**: POST
- **描述**: 记录用户的浏览、搜索、预约等行为
- **请求体**:
```json
{
    "user": 1,
    "behavior_type": "view",
    "item_type": "hospital",
    "item_id": 1,
    "metadata": {
        "duration": 30,
        "page": "hospital_detail"
    }
}
```

**响应示例**:
```json
{
    "success": true,
    "message": "用户行为记录成功",
    "data": {
        "id": "uuid-string",
        "user": 1,
        "behavior_type": "view",
        "item_type": "hospital",
        "item_id": 1,
        "metadata": {
            "duration": 30,
            "page": "hospital_detail"
        },
        "created_at": "2025-11-12T12:00:00Z"
    },
    "status_code": 201
}
```

### 3. 医院推荐 API

#### 获取医院推荐
- **URL**: `/hospitals/`
- **方法**: POST
- **描述**: 基于用户偏好和位置生成医院推荐
- **请求体**:
```json
{
    "user_id": 1,
    "latitude": 39.9042,
    "longitude": 116.4074,
    "max_distance": 100,
    "limit": 10
}
```

**响应示例**:
```json
{
    "success": true,
    "message": "医院推荐获取成功",
    "data": {
        "recommendations": [
            {
                "hospital_id": 1,
                "name": "北京协和医院",
                "type": "综合医院",
                "distance": 2.5,
                "score": 0.95,
                "reason": "基于您的偏好和位置推荐"
            }
        ],
        "total_count": 1
    },
    "status_code": 200
}
```

### 4. 医生推荐 API

#### 获取医生推荐
- **URL**: `/doctors/`
- **方法**: POST
- **描述**: 基于用户需求和医生信息生成医生推荐
- **请求体**:
```json
{
    "user_id": 1,
    "specialty": "内科",
    "hospital_id": 1,
    "limit": 10
}
```

**响应示例**:
```json
{
    "success": true,
    "message": "医生推荐获取成功",
    "data": {
        "recommendations": [
            {
                "doctor_id": 1,
                "name": "张医生",
                "specialty": "内科",
                "hospital": "北京协和医院",
                "score": 0.92,
                "reason": "专业匹配度高，用户评价好"
            }
        ],
        "total_count": 1
    },
    "status_code": 200
}
```

### 5. 推荐反馈 API

#### 提交推荐反馈
- **URL**: `/feedback/`
- **方法**: POST
- **描述**: 收集用户对推荐结果的反馈
- **请求体**:
```json
{
    "user": 1,
    "recommendation_id": "uuid-string",
    "feedback_type": "positive",
    "average_rating": 5,
    "comments": "推荐很准确"
}
```

**响应示例**:
```json
{
    "success": true,
    "message": "推荐反馈提交成功",
    "data": {
        "id": "uuid-string",
        "user": 1,
        "recommendation_id": "uuid-string",
        "feedback_type": "positive",
        "average_rating": 5,
        "comments": "推荐很准确",
        "created_at": "2025-11-12T12:00:00Z"
    },
    "status_code": 201
}
```

### 6. 热门项目 API

#### 获取热门医院/医生
- **URL**: `/popular/`
- **方法**: GET
- **描述**: 获取热门医院或医生列表
- **参数**:
  - `item_type` (必填): 项目类型 (`hospital` 或 `doctor`)
  - `limit` (可选): 返回数量限制，默认10

**请求示例**:
```
GET /api/recommendation/popular/?item_type=hospital&limit=5
```

**响应示例**:
```json
{
    "popular_items": [
        {
            "item_id": 1,
            "item_type": "hospital",
            "name": "北京协和医院",
            "view_count": 1500,
            "average_rating": 4.8
        }
    ],
    "total_count": 5
}
```

### 7. 推荐历史 API

#### 获取推荐历史
- **URL**: `/history/`
- **方法**: GET
- **描述**: 获取用户的推荐历史记录
- **参数**:
  - `user_id` (必填): 用户ID
  - `limit` (可选): 返回数量限制，默认10

**请求示例**:
```
GET /api/recommendation/history/?user_id=1&limit=10
```

**响应示例**:
```json
{
    "history": [
        {
            "id": "uuid-string",
            "user": 1,
            "recommendation_type": "hospital",
            "recommended_items": [1, 2, 3],
            "created_at": "2025-11-12T12:00:00Z"
        }
    ],
    "total_count": 1
}
```

## 错误码说明

| 状态码 | 说明 | 处理建议 |
|--------|------|----------|
| 200 | 请求成功 | - |
| 400 | 请求参数错误 | 检查请求参数格式和必填项 |
| 401 | 未授权 | 检查用户认证信息 |
| 403 | 禁止访问 | 检查用户权限 |
| 404 | 资源不存在 | 检查请求的URL和资源ID |
| 405 | 方法不允许 | 检查HTTP方法是否正确 |
| 500 | 服务器内部错误 | 联系系统管理员 |

## 数据模型

### UserPreference (用户偏好)
- `id`: UUID，主键
- `user`: 外键，关联用户
- `preference_type`: 偏好类型 (hospital_type, doctor_specialty, location_preference等)
- `preference_value`: JSON格式的偏好值
- `weight`: 权重 (0.0-1.0)
- `created_at`: 创建时间

### UserBehavior (用户行为)
- `id`: UUID，主键
- `user`: 外键，关联用户
- `behavior_type`: 行为类型 (view, search, book等)
- `item_type`: 项目类型 (hospital, doctor)
- `item_id`: 项目ID
- `metadata`: JSON格式的元数据
- `created_at`: 创建时间

### RecommendationHistory (推荐历史)
- `id`: UUID，主键
- `user`: 外键，关联用户
- `recommendation_type`: 推荐类型 (hospital, doctor)
- `recommended_items`: JSON格式的推荐项目列表
- `created_at`: 创建时间

### RecommendationFeedback (推荐反馈)
- `id`: UUID，主键
- `user`: 外键，关联用户
- `recommendation_id`: 推荐记录ID
- `feedback_type`: 反馈类型 (positive, negative, neutral)
- `average_rating`: 评分 (1-5)
- `comments`: 评论
- `created_at`: 创建时间

## 使用示例

### Python 示例
```python
import requests

# 获取用户偏好
response = requests.get(
    'http://127.0.0.1:8000/api/recommendation/preferences/',
    params={'user_id': 1}
)
print(response.json())

# 获取医院推荐
response = requests.post(
    'http://127.0.0.1:8000/api/recommendation/hospitals/',
    json={
        'user_id': 1,
        'latitude': 39.9042,
        'longitude': 116.4074,
        'max_distance': 10,
        'limit': 10
    }
)
print(response.json())
```

### JavaScript 示例
```javascript
// 获取热门医院
fetch('http://127.0.0.1:8000/api/recommendation/popular/?item_type=hospital&limit=5')
    .then(response => response.json())
    .then(data => console.log(data));

// 记录用户行为
fetch('http://127.0.0.1:8000/api/recommendation/behavior/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        user: 1,
        behavior_type: 'view',
        item_type: 'hospital',
        item_id: 1
    })
})
.then(response => response.json())
.then(data => console.log(data));
```

## 注意事项

1. **认证要求**: 部分API需要用户认证，请确保在请求头中包含有效的认证信息
2. **数据格式**: 所有请求和响应数据都使用JSON格式
3. **错误处理**: 建议在客户端实现完善的错误处理机制
4. **性能优化**: 对于频繁调用的API，建议使用缓存机制
5. **数据安全**: 敏感数据在传输过程中应使用HTTPS加密

## 版本信息

- **当前版本**: v1.0
- **最后更新**: 2025-11-12
- **维护团队**: 智能医生开发团队