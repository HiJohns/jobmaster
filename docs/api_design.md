# JobMaster API 规划文档

本文档描述 JobMaster 系统所需的所有 API 接口设计。

---

## 1. 认证相关 API

### 1.1 登录

**端点**: `POST /api/v1/auth/login`

**请求体**:
```json
{
  "email": "string",
  "password": "string",
  "remember": "boolean"
}
```

**响应** (成功):
```json
{
  "code": 0,
  "data": {
    "token": "string",
    "expires_at": "timestamp",
    "user": {
      "id": "uint64",
      "email": "string",
      "display_name": "string",
      "role": "string"
    }
  }
}
```

### 1.2 刷新 Token

**端点**: `POST /api/v1/auth/refresh`

**请求体**:
```json
{
  "refresh_token": "string"
}
```

### 1.3 获取我的租户列表

**端点**: `GET /api/v1/auth/my-tenants`

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "tenant_id": "uuid",
      "tenant_name": "string",
      "tenant_code": "string",
      "logo_url": "string",
      "role": "string",
      "org_id": "uuid",
      "org_name": "string"
    }
  ]
}
```

### 1.4 提权

**端点**: `POST /api/v1/auth/impersonate`

**请求头**: `Authorization: Bearer {token}`

**响应**:
```json
{
  "code": 0,
  "data": {
    "token": "string",
    "impersonator_id": "uint64"
  }
}
```

### 1.5 退出提权

**端点**: `POST /api/v1/auth/exit-impersonate`

**响应**:
```json
{
  "code": 0,
  "data": {
    "token": "string"
  }
}
```

### 1.6 登出

**端点**: `POST /api/v1/auth/logout`

---

## 2. 组织架构管理 API

### 2.1 租户管理

#### 2.1.1 创建租户

**端点**: `POST /api/v1/tenants`

**请求体**:
```json
{
  "name": "string",
  "code": "string",
  "logo_url": "string"
}
```

#### 2.1.2 租户列表

**端点**: `GET /api/v1/tenants`

**查询参数**:
- `page`: 页码
- `page_size`: 每页数量

#### 2.1.3 租户详情

**端点**: `GET /api/v1/tenants/:id`

#### 2.1.4 更新租户

**端点**: `PUT /api/v1/tenants/:id`

#### 2.1.5 删除租户

**端点**: `DELETE /api/v1/tenants/:id`

### 2.2 工程公司管理

#### 2.2.1 创建工程公司

**端点**: `POST /api/v1/contractors`

**请求体**:
```json
{
  "name": "string",
  "code": "string",
  "tenant_id": "uuid",
  "contact_phone": "string",
  "contact_email": "string"
}
```

#### 2.2.2 工程公司列表

**端点**: `GET /api/v1/contractors`

#### 2.2.3 工程公司详情

**端点**: `GET /api/v1/contractors/:id`

#### 2.2.4 添加外部供应商

**端点**: `POST /api/v1/contractors/:id/vendors`

**请求体**:
```json
{
  "vendor_id": "uuid"
}
```

#### 2.2.5 供应商列表

**端点**: `GET /api/v1/contractors/:id/vendors`

### 2.3 分公司管理

#### 2.3.1 创建分公司

**端点**: `POST /api/v1/branches`

**请求体**:
```json
{
  "name": "string",
  "code": "string",
  "tenant_id": "uuid",
  "contact_phone": "string",
  "address": "string"
}
```

#### 2.3.2 分公司列表

**端点**: `GET /api/v1/branches`

#### 2.3.3 分公司详情

**端点**: `GET /api/v1/branches/:id`

#### 2.3.4 分配工程公司给分公司

**端点**: `POST /api/v1/branches/:id/contractors`

**请求体**:
```json
{
  "contractor_id": "uuid"
}
```

### 2.4 用户管理（本地租户用户）

#### 2.4.1 创建用户

**端点**: `POST /api/v1/users`

**请求体**:
```json
{
  "email": "string",
  "display_name": "string",
  "phone": "string",
  "role": "string",
  "org_id": "uuid"
}
```

#### 2.4.2 用户列表

**端点**: `GET /api/v1/users`

**查询参数**:
- `org_id`: 组织 ID（可选）
- `role`: 角色（可选）
- `page`, `page_size`: 分页

#### 2.4.3 用户详情

**端点**: `GET /api/v1/users/:id`

#### 2.4.4 更新用户

**端点**: `PUT /api/v1/users/:id`

#### 2.4.5 删除用户

**端点**: `DELETE /api/v1/users/:id`

---

## 3. 工单管理 API

### 3.1 创建工单

**端点**: `POST /api/v1/orders`

**请求体**:
```json
{
  "store_id": "uuid",
  "category_path": "string",
  "brand_name": "string",
  "fault_description": "string",
  "photos": ["string"],
  "is_urgent": "boolean",
  "address_detail": "string",
  "coordinates": {
    "lat": "float",
    "lng": "float"
  }
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "order_no": "string",
    "status": "PENDING"
  }
}
```

### 3.2 工单列表

**端点**: `GET /api/v1/orders`

**查询参数**:
- `status`: 状态筛选（可选）
- `date`: 日期筛选（可选，YYYY-MM-DD）
- `search`: 模糊搜索（可选）
- `page`, `page_size`: 分页

**响应**:
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "uuid",
        "order_no": "string",
        "status": "string",
        "store_name": "string",
        "category_path": "string",
        "brand_name": "string",
        "created_at": "timestamp",
        "thumbnail": "string"
      }
    ],
    "total": "int",
    "page": "int",
    "page_size": "int"
  }
}
```

### 3.3 工单详情

**端点**: `GET /api/v1/orders/:id`

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "order_no": "string",
    "status": "string",
    "store_id": "uuid",
    "store_name": "string",
    "category_path": "string",
    "brand_name": "string",
    "fault_description": "string",
    "photos": ["string"],
    "is_urgent": "boolean",
    "address_detail": "string",
    "coordinates": {},
    "labor_fee": "decimal",
    "material_fee": "decimal",
    "other_fee": "decimal",
    "created_at": "timestamp",
    "logs": [
      {
        "action": "string",
        "operator_id": "uuid",
        "created_at": "timestamp",
        "details": {}
      }
    ]
  }
}
```

### 3.4 分配工单

**端点**: `POST /api/v1/orders/:id/dispatch`

**请求体**:
```json
{
  "vendor_id": "uuid"
}
```

**适用角色**: MAIN_CONTRACTOR

### 3.5 接单/拒单

**端点**: `POST /api/v1/orders/:id/accept` (接单)
**端点**: `POST /api/v1/orders/:id/reject` (拒单)

**适用角色**: VENDOR

### 3.6 预约时间

**端点**: `POST /api/v1/orders/:id/reserve`

**请求体**:
```json
{
  "appointed_at": "timestamp"
}
```

**适用角色**: VENDOR

### 3.7 生成进场二维码

**端点**: `POST /api/v1/orders/:id/generate-qrcode`

**响应**:
```json
{
  "code": 0,
  "data": {
    "qrcode_url": "string",
    "qrcode_token": "string"
  }
}
```

**适用角色**: STORE（状态 = RESERVED/ARRIVED）

### 3.8 进场确认

**端点**: `POST /api/v1/orders/:id/arrive`

**请求体**:
```json
{
  "qrcode_token": "string",
  "location": {
    "lat": "float",
    "lng": "float"
  },
  "photo": "string"
}
```

**适用角色**: ENGINEER（状态 = RESERVED）

### 3.9 提交施工记录

**端点**: `POST /api/v1/orders/:id/record`

**请求体**:
```json
{
  "message": "string",
  "photos": ["string"]
}
```

**适用角色**: ENGINEER（状态 = WORKING）

### 3.10 完工离场

**端点**: `POST /api/v1/orders/:id/finish`

**请求体**:
```json
{
  "labor_fee": "decimal",
  "material_fee": "decimal",
  "other_fee": "decimal",
  "summary": "string"
}
```

**适用角色**: ENGINEER（状态 = WORKING）

### 3.11 验收通过

**端点**: `POST /api/v1/orders/:id/accept`

**适用角色**: STORE（状态 = FINISHED/OBSERVING）

### 3.12 验收不通过

**端点**: `POST /api/v1/orders/:id/reject`

**请求体**:
```json
{
  "reason": "string"
}
```

**适用角色**: STORE（状态 = FINISHED/OBSERVING）

### 3.13 分配工程师

**端点**: `POST /api/v1/orders/:id/assign-engineer`

**请求体**:
```json
{
  "engineer_id": "uuid"
}
```

**适用角色**: MAIN_CONTRACTOR / VENDOR

---

## 4. 微信端 API

### 4.1 微信登录

**端点**: `POST /api/v1/wechat/login`

**请求体**:
```json
{
  "code": "string"
}
```

### 4.2 微信进场确认

**端点**: `POST /api/v1/wechat/arrive`

**请求体**:
```json
{
  "qrcode": "string",
  "location": {
    "lat": "float",
    "lng": "float"
  },
  "photo": "string"
}
```

### 4.3 微信提交施工记录

**端点**: `POST /api/v1/wechat/record`

**请求体**:
```json
{
  "order_id": "uuid",
  "message": "string",
  "photos": ["string"]
}
```

---

## 5. 统计与日志 API

### 5.1 工单统计

**端点**: `GET /api/v1/statistics/orders`

**响应**:
```json
{
  "code": 0,
  "data": {
    "pending": "int",
    "dispatched": "int",
    "reserved": "int",
    "arrived": "int",
    "working": "int",
    "finished": "int",
    "observing": "int",
    "closed": "int"
  }
}
```

### 5.2 操作日志

**端点**: `GET /api/v1/logs`

**查询参数**:
- `target_type`: 目标类型（order, user 等）
- `target_id`: 目标 ID
- `action`: 操作类型
- `page`, `page_size`: 分页

---

## 6. API 响应格式规范

### 成功响应

```json
{
  "code": 0,
  "data": {},
  "message": "success"
}
```

### 错误响应

```json
{
  "code": 400,
  "data": null,
  "message": "错误描述"
}
```

### 常见错误码

| 错误码 | 描述 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 状态冲突 |
| 500 | 服务器错误 |

---

## 7. 通用请求头

| 请求头 | 说明 |
|--------|------|
| `Authorization` | Bearer Token |
| `X-Tenant-ID` | 租户 ID（多租户场景） |
| `X-Impersonator-ID` | 提权者 ID（提权场景） |
| `Content-Type` | application/json |