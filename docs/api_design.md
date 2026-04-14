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

**请求体**:
```json
{
  "tenant_id": "uuid"
}
```

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

**说明**: 用户可能属于多个租户，提权时需指定目标租户。

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

**端点**: `PUT /api/v1/tenants`

**请求体**:
```json
{
  "id": "uuid",
  "name": "string",
  "code": "string",
  "logo_url": "string"
}
```

#### 2.1.5 删除租户

**端点**: `DELETE /api/v1/tenants?id={uuid}`

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

**端点**: `POST /api/v1/contractors/vendors`

**请求体**:
```json
{
  "contractor_id": "uuid",
  "vendor_id": "uuid"
}
```

#### 2.2.5 供应商列表

**端点**: `GET /api/v1/contractors/:id/vendors`

#### 2.3.4 分配工程公司给分公司

**端点**: `POST /api/v1/branches/contractors`

**请求体**:
```json
{
  "branch_id": "uuid",
  "contractor_id": "uuid"
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

**端点**: `PUT /api/v1/users`

**请求体**:
```json
{
  "id": "uint64",
  "email": "string",
  "display_name": "string",
  "phone": "string",
  "role": "string"
}
```

#### 2.4.5 删除用户

**端点**: `DELETE /api/v1/users?id={uint64}`

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

**端点**: `POST /api/v1/orders/dispatch`

**请求体**:
```json
{
  "order_id": "uuid",
  "vendor_id": "uuid"
}
```

**适用角色**: MAIN_CONTRACTOR

### 3.5 工程师响应（接单/拒单）

**端点**: `POST /api/v1/orders/acknowledge`

**请求体**:
```json
{
  "order_id": "uuid",
  "action": "accept"
}
```

或

```json
{
  "order_id": "uuid",
  "action": "reject"
}
```

**适用角色**: VENDOR / ENGINEER（状态 = DISPATCHED）

**状态变更**: DISPATCHED → ACCEPTED（接单）/ 保持 DISPATCHED（拒单）

### 3.6 分公司确认预约时间

**端点**: `POST /api/v1/orders/confirm-time`

**请求体**:
```json
{
  "order_id": "uuid"
}
```

**适用角色**: BRANCH（状态 = ACCEPTED）

**状态变更**: ACCEPTED → RESERVED

**说明**: 工程师接单后设置预约时间，分公司确认后正式进入预约状态（二次握手逻辑）。

### 3.7 预约时间（工程师设置）

**端点**: `POST /api/v1/orders/reserve`

**请求体**:
```json
{
  "order_id": "uuid",
  "appointed_at": "timestamp"
}
```

**适用角色**: VENDOR / ENGINEER（状态 = ACCEPTED）

**说明**: 仅设置预约时间，需分公司确认后才转为 RESERVED。

### 3.8 预约列表

**端点**: `GET /api/v1/reservations`

**查询参数**:
- `status` (可选): 预约状态 (pending/confirmed/rejected/expired)
- `work_order_id` (可选): 关联工单ID
- `page` (可选): 页码，默认 1
- `page_size` (可选): 每页数量，默认 20

**响应**:
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "uuid",
        "work_order_id": "uuid",
        "work_order_title": "string",
        "proposer_id": "uuid",
        "proposer_name": "string",
        "proposer_role": "string",
        "proposed_time": "timestamp",
        "status": "string",
        "reject_reason": "string",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      }
    ],
    "total": "int",
    "page": "int",
    "page_size": "int"
  }
}
```

**适用角色**: BRANCH / ENGINEER

**说明**: 分公司员工查看本公司的所有预约，工程师查看与自己相关的预约。

### 3.9 预约详情

**端点**: `GET /api/v1/reservations/:id`

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "work_order_id": "uuid",
    "work_order_title": "string",
    "proposer_id": "uuid",
    "proposer_name": "string",
    "proposer_role": "string",
    "proposed_time": "timestamp",
    "status": "string",
    "reject_reason": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**适用角色**: BRANCH / ENGINEER

### 3.10 确认预约

**端点**: `POST /api/v1/reservations/:id/confirm`

**请求体**:
```json
{
  "comment": "string"  // 可选
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "reservation_id": "uuid",
    "work_order_id": "uuid",
    "new_status": "confirmed",
    "confirmed_at": "timestamp"
  }
}
```

**适用角色**: BRANCH（分公司员工）

**说明**: 分公司确认预约后，相应工单转入 RESERVED 状态（二次握手完成）。

### 3.11 拒绝预约

**端点**: `POST /api/v1/reservations/:id/reject`

**请求体** (必需):
```json
{
  "reason": "string"  // 拒绝原因，必填
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "reservation_id": "uuid",
    "work_order_id": "uuid",
    "new_status": "rejected",
    "reject_reason": "string",
    "rejected_at": "timestamp"
  }
}
```

**适用角色**: BRANCH（分公司员工）

**说明**: 拒绝预约后，工单状态保持不变（仍为 ACCEPTED），工程师需要重新发起预约。

### 3.12 改期预约

**端点**: `POST /api/v1/reservations/:id/reschedule`

**请求体**:
```json
{
  "new_time": "timestamp",
  "comment": "string"  // 可选
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "reservation_id": "uuid",
    "work_order_id": "uuid",
    "old_time": "timestamp",
    "new_time": "timestamp",
    "status": "confirmed",
    "updated_at": "timestamp"
  }
}
```

**适用角色**: ENGINEER / BRANCH

**说明**: 已确认的预约可以改期，需要双方协商同意。

### 3.13 工单预约日志

**端点**: `GET /api/v1/workorders/:id/reservations`

**查询参数**:
- `include_rejected` (可选): 是否包含被拒绝的预约，默认 false

**响应**:
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "uuid",
        "proposed_time": "timestamp",
        "status": "string",
        "proposer_name": "string",
        "proposer_role": "string",
        "reject_reason": "string",
        "created_at": "timestamp"
      }
    ],
    "total": "int"
  }
}
```

**适用角色**: BRANCH / ENGINEER

**说明**: 查看工单的所有预约历史记录，包括提议、拒绝、确认、改期等。

### 3.14 验收工单

**端点**: `POST /api/v1/workorders/:id/accept`

**请求体**:
```json
{
  "comment": "string",      // 验收评论
  "photo_urls": ["string"]  // 验收图片
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "work_order_id": "uuid",
    "old_status": "FINISHED",
    "new_status": "CLOSED",
    "accepted_at": "timestamp",
    "comment": "string",
    "photo_urls": ["string"]
  }
}
```

**适用角色**: BRANCH（分公司员工）

**说明**: 分公司验收通过后，工单状态转为 CLOSED。

### 3.15 拒绝工单（拒单）

**端点**: `POST /api/v1/workorders/:id/reject`

**请求体** (必需):
```json
{
  "comment": "string",      // 拒单原因，必填
  "photo_urls": ["string"]  // 拒单依据图片
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "work_order_id": "uuid",
    "old_status": "FINISHED",
    "new_status": "REJECTED",
    "rejected_at": "timestamp",
    "comment": "string",
    "photo_urls": ["string"]
  }
}
```

**适用角色**: BRANCH（分公司员工）

**说明**: 验收不通过时，工单状态转为 REJECTED（拒单），回转给工程公司重新处理。

### 3.16 工单拒单/拒收处理

**端点**: `POST /api/v1/workorders/:id/reject-handle`

**请求体**:
```json
{
  "action": "string",  // "accept" (接受拒单) 或 "reassign" (重新分配)
  "reason": "string"   // 处理原因
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "work_order_id": "uuid",
    "old_status": "REJECTED",
    "new_status": "DISPATCHED",
    "handled_at": "timestamp",
    "action": "string"
  }
}
```

**适用角色**: CONTRACTOR / VENDOR

**说明**: 工程公司处理分公司拒单，可选择接受（工单关闭）或重新分配工程师。

### 3.17 生成进场二维码


**端点**: `POST /api/v1/orders/qrcode`

**请求体**:
```json
{
  "order_id": "uuid"
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "qrcode_url": "string",
    "qrcode_token": "string",
    "geofencing": {
      "center_lat": "float",
      "center_lng": "float",
      "radius_meters": 500
    }
  }
}
```

**适用角色**: BRANCH（状态 = RESERVED）
**说明**: 预约签到不再单独改变工单状态，直接开始施工

### 3.9 开始施工

**端点**: `POST /api/v1/orders/arrive`

**请求体**:
```json
{
  "order_id": "uuid",
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

**端点**: `POST /api/v1/orders/record`

**请求体**:
```json
{
  "order_id": "uuid",
  "message": "string",
  "photos": ["string"]
}
```

**适用角色**: ENGINEER（状态 = WORKING）

### 3.10 完工离场

**端点**: `POST /api/v1/orders/finish`

**请求体**:
```json
{
  "order_id": "uuid",
  "labor_fee": "decimal",
  "material_fee": "decimal",
  "other_fee": "decimal",
  "summary": "string"
}
```

**适用角色**: ENGINEER（状态 = WORKING）

### 3.11 验收

**端点**: `POST /api/v1/orders/verify`

**请求体（通过）**:
```json
{
  "order_id": "uuid",
  "action": "approve"
}
```

**请求体（不通过）**:
```json
{
  "order_id": "uuid",
  "action": "disprove",
  "reason": "string"
}
```

**适用角色**: STORE（状态 = FINISHED）

### 3.12 分配工程师

**端点**: `POST /api/v1/orders/assign-engineer`

**请求体**:
```json
{
  "order_id": "uuid",
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

---

## 8. API 设计原则

### 8.1 URL 规范

1. **GET 请求**：ID 可出现在 URL 路径中
   - `GET /api/v1/orders/:id`
   - `GET /api/v1/tenants/:id`

2. **POST/PUT/PATCH 请求**：ID 移至请求体，避免高基数问题
   - `POST /api/v1/orders/dispatch` → body: `{ "order_id": "...", "vendor_id": "..." }`
   - `PUT /api/v1/tenants` → body: `{ "id": "...", "name": "..." }`

3. **DELETE 请求**：ID 通过 query parameter 传递
   - `DELETE /api/v1/tenants?id={uuid}`
   - `DELETE /api/v1/users?id={uint64}`

### 8.2 动作合并原则

相似操作合并为单一端点，通过 `action` 字段区分：

| 端点 | action 值 | 说明 |
|------|-----------|------|
| `POST /api/v1/orders/acknowledge` | `accept` / `reject` | 工程师响应接单或拒单 |
| `POST /api/v1/orders/verify` | `approve` / `disprove` | 验收通过或不通过 |

### 8.3 响应格式

所有 API 统一使用以下格式：

**成功**:
```json
{
  "code": 0,
  "data": {},
  "message": "success"
}
```

**失败**:
```json
{
  "code": 400,
  "data": null,
  "message": "错误描述"
}
```