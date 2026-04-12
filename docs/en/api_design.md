# JobMaster API Design Document

This document describes all API interface designs for the JobMaster system.

---

## 1. Authentication APIs

### 1.1 Login

**Endpoint**: `POST /api/v1/auth/login`

**Request Body**:
```json
{
  "email": "string",
  "password": "string",
  "remember": "boolean"
}
```

**Response** (Success):
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

### 1.2 Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`

**Request Body**:
```json
{
  "refresh_token": "string"
}
```

### 1.3 Get My Tenant List

**Endpoint**: `GET /api/v1/auth/my-tenants`

**Response**:
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

### 1.4 Impersonate

**Endpoint**: `POST /api/v1/auth/impersonate`

**Request Header**: `Authorization: Bearer {token}`

**Response**:
```json
{
  "code": 0,
  "data": {
    "token": "string",
    "impersonator_id": "uint64"
  }
}
```

### 1.5 Exit Impersonate

**Endpoint**: `POST /api/v1/auth/exit-impersonate`

**Response**:
```json
{
  "code": 0,
  "data": {
    "token": "string"
  }
}
```

### 1.6 Logout

**Endpoint**: `POST /api/v1/auth/logout`

---

## 2. Organization Management APIs

### 2.1 Tenant Management

#### 2.1.1 Create Tenant

**Endpoint**: `POST /api/v1/tenants`

**Request Body**:
```json
{
  "name": "string",
  "code": "string",
  "logo_url": "string"
}
```

#### 2.1.2 Tenant List

**Endpoint**: `GET /api/v1/tenants`

**Query Parameters**:
- `page`: Page number
- `page_size`: Page size

#### 2.1.3 Tenant Detail

**Endpoint**: `GET /api/v1/tenants/:id`

#### 2.1.4 Update Tenant

**Endpoint**: `PUT /api/v1/tenants/:id`

#### 2.1.5 Delete Tenant

**Endpoint**: `DELETE /api/v1/tenants/:id`

### 2.2 Contractor Management

#### 2.2.1 Create Contractor

**Endpoint**: `POST /api/v1/contractors`

**Request Body**:
```json
{
  "name": "string",
  "code": "string",
  "tenant_id": "uuid",
  "contact_phone": "string",
  "contact_email": "string"
}
```

#### 2.2.2 Contractor List

**Endpoint**: `GET /api/v1/contractors`

#### 2.2.3 Contractor Detail

**Endpoint**: `GET /api/v1/contractors/:id`

#### 2.2.4 Add External Vendor

**Endpoint**: `POST /api/v1/contractors/:id/vendors`

**Request Body**:
```json
{
  "vendor_id": "uuid"
}
```

#### 2.2.5 Vendor List

**Endpoint**: `GET /api/v1/contractors/:id/vendors`

### 2.3 Branch Management

#### 2.3.1 Create Branch

**Endpoint**: `POST /api/v1/branches`

**Request Body**:
```json
{
  "name": "string",
  "code": "string",
  "tenant_id": "uuid",
  "contact_phone": "string",
  "address": "string"
}
```

#### 2.3.2 Branch List

**Endpoint**: `GET /api/v1/branches`

#### 2.3.3 Branch Detail

**Endpoint**: `GET /api/v1/branches/:id`

#### 2.3.4 Assign Contractor to Branch

**Endpoint**: `POST /api/v1/branches/:id/contractors`

**Request Body**:
```json
{
  "contractor_id": "uuid"
}
```

### 2.4 User Management (Local Tenant Users)

#### 2.4.1 Create User

**Endpoint**: `POST /api/v1/users`

**Request Body**:
```json
{
  "email": "string",
  "display_name": "string",
  "phone": "string",
  "role": "string",
  "org_id": "uuid"
}
```

#### 2.4.2 User List

**Endpoint**: `GET /api/v1/users`

**Query Parameters**:
- `org_id`: Organization ID (optional)
- `role`: Role (optional)
- `page`, `page_size`: Pagination

#### 2.4.3 User Detail

**Endpoint**: `GET /api/v1/users/:id`

#### 2.4.4 Update User

**Endpoint**: `PUT /api/v1/users/:id`

#### 2.4.5 Delete User

**Endpoint**: `DELETE /api/v1/users/:id`

---

## 3. Work Order Management APIs

### 3.1 Create Work Order

**Endpoint**: `POST /api/v1/orders`

**Request Body**:
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

**Response**:
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

### 3.2 Work Order List

**Endpoint**: `GET /api/v1/orders`

**Query Parameters**:
- `status`: Status filter (optional)
- `date`: Date filter (optional, YYYY-MM-DD)
- `search`: Fuzzy search (optional)
- `page`, `page_size`: Pagination

**Response**:
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

### 3.3 Work Order Detail

**Endpoint**: `GET /api/v1/orders/:id`

**Response**:
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

### 3.4 Dispatch Order

**Endpoint**: `POST /api/v1/orders/:id/dispatch`

**Request Body**:
```json
{
  "vendor_id": "uuid"
}
```

**Applicable Role**: MAIN_CONTRACTOR

### 3.5 Accept/Reject Order

**Endpoint**: `POST /api/v1/orders/:id/accept` (Accept)
**Endpoint**: `POST /api/v1/orders/:id/reject` (Reject)

**Applicable Role**: VENDOR

### 3.6 Reserve Time

**Endpoint**: `POST /api/v1/orders/:id/reserve`

**Request Body**:
```json
{
  "appointed_at": "timestamp"
}
```

**Applicable Role**: VENDOR

### 3.7 Generate Arrival QR Code

**Endpoint**: `POST /api/v1/orders/:id/generate-qrcode`

**Response**:
```json
{
  "code": 0,
  "data": {
    "qrcode_url": "string",
    "qrcode_token": "string"
  }
}
```

**Applicable Role**: STORE (status = RESERVED/ARRIVED)

### 3.8 Arrival Confirmation

**Endpoint**: `POST /api/v1/orders/:id/arrive`

**Request Body**:
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

**Applicable Role**: ENGINEER (status = RESERVED)

### 3.9 Submit Construction Record

**Endpoint**: `POST /api/v1/orders/:id/record`

**Request Body**:
```json
{
  "message": "string",
  "photos": ["string"]
}
```

**Applicable Role**: ENGINEER (status = WORKING)

### 3.10 Finish Work

**Endpoint**: `POST /api/v1/orders/:id/finish`

**Request Body**:
```json
{
  "labor_fee": "decimal",
  "material_fee": "decimal",
  "other_fee": "decimal",
  "summary": "string"
}
```

**Applicable Role**: ENGINEER (status = WORKING)

### 3.11 Accept (Pass Acceptance)

**Endpoint**: `POST /api/v1/orders/:id/accept`

**Applicable Role**: STORE (status = FINISHED/OBSERVING)

### 3.12 Reject (Fail Acceptance)

**Endpoint**: `POST /api/v1/orders/:id/reject`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Applicable Role**: STORE (status = FINISHED/OBSERVING)

### 3.13 Assign Engineer

**Endpoint**: `POST /api/v1/orders/:id/assign-engineer`

**Request Body**:
```json
{
  "engineer_id": "uuid"
}
```

**Applicable Role**: MAIN_CONTRACTOR / VENDOR

---

## 4. WeChat APIs

### 4.1 WeChat Login

**Endpoint**: `POST /api/v1/wechat/login`

**Request Body**:
```json
{
  "code": "string"
}
```

### 4.2 WeChat Arrival Confirmation

**Endpoint**: `POST /api/v1/wechat/arrive`

**Request Body**:
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

### 4.3 WeChat Submit Construction Record

**Endpoint**: `POST /api/v1/wechat/record`

**Request Body**:
```json
{
  "order_id": "uuid",
  "message": "string",
  "photos": ["string"]
}
```

---

## 5. Statistics & Log APIs

### 5.1 Work Order Statistics

**Endpoint**: `GET /api/v1/statistics/orders`

**Response**:
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

### 5.2 Operation Logs

**Endpoint**: `GET /api/v1/logs`

**Query Parameters**:
- `target_type`: Target type (order, user, etc.)
- `target_id`: Target ID
- `action`: Action type
- `page`, `page_size`: Pagination

---

## 6. API Response Format Specification

### Success Response

```json
{
  "code": 0,
  "data": {},
  "message": "success"
}
```

### Error Response

```json
{
  "code": 400,
  "data": null,
  "message": "Error description"
}
```

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| 0 | Success |
| 400 | Request parameter error |
| 401 | Unauthorized |
| 403 | No permission |
| 404 | Resource not found |
| 409 | Status conflict |
| 500 | Server error |

---

## 7. Common Request Headers

| Header | Description |
|--------|-------------|
| `Authorization` | Bearer Token |
| `X-Tenant-ID` | Tenant ID (multi-tenant scenario) |
| `X-Impersonator-ID` | Impersonator ID (impersonation scenario) |
| `Content-Type` | application/json |