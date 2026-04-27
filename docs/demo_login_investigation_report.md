# Demo 模式登录逻辑调查报告

## 1. 概述

**调查目标：** 分析在 `make demo` 下启动时，前端的登录逻辑以及登录后向后端发送的请求中携带的身份信息。

**核心发现：**
- Demo 模式通过环境变量 `DEMO_MODE=true` 和前端环境变量 `VITE_USE_DEMO_API=true` 协同工作
- 前端登录请求发送到 `/api/demo/auth/login`，由后端 `DemoHandlers.Login` 处理
- 登录后请求携带 `Authorization: Bearer demo_token_xxx` header，但后端在 demo 模式下不验证 token，直接使用固定身份

---

## 2. 执行流程详解

### Phase 1: Demo 模式启动

**后端启动（`make demo`）：**
```bash
DEMO_MODE=true go run cmd/api/main.go
```

- 后端检测到 `DEMO_MODE=true`，注册 demo 路由（`internal/api/demo.go:27`）
- Demo 路由前缀：`/api/demo`
- 包含端点：`/auth/login`, `/workorders`, `/organizations`, `/users`, `/categories`

**前端配置（`.env.demo`）：**
```bash
VITE_USE_DEMO_API=true
VITE_API_BASE_URL=/api/demo
```

- Vite 开发服务器将 `/api/demo` 代理到 `http://localhost:5555`（`vite.config.ts:22-26`）
- 前端 `config/env.ts` 设置 `USE_DEMO_API = true`，`API_BASE_URL = '/api/demo'`

### Phase 2: 前端登录逻辑

**登录入口（`frontend/src/pages/Login.tsx:54-66`）：**
```typescript
const response = await demoApi.login(values.username, values.password)
login(response.token, {
  user_id: response.user?.id,
  username: response.user?.username,
  role: response.user?.role,
  org_id: response.user?.orgId,
  tenant_id: response.user?.tenantId,
  display_name: response.user?.displayName,
  is_impersonated: false,
})
```

**demoApi.login 实现（`frontend/src/api/factory.ts:24-39`）：**
```typescript
login: async (username: string, password: string) => {
  const response = await apiClient.request({
    url: '/auth/login',  // 实际为 /api/demo/auth/login
    method: 'POST',
    data: { username, password },
  })
  const data = response.data || response
  if (data && data.user) {
    setDemoUserRole(data.user.role)  // 存储角色用于前端过滤
  }
  return data
}
```

**HTTP 客户端配置（`frontend/src/api/client.ts:19-23`）：**
```typescript
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/demo',  // 从 API_BASE_URL 来
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})
```

### Phase 3: 后端 Demo 登录处理

**Demo 登录处理器（`internal/api/demo.go:183-221`）：**
```go
func (h *DemoHandlers) Login(c *gin.Context) {
  var req struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
  }
  // 解析角色逻辑
  role := "EMPLOYEE" // default
  if contains(username, "admin") {
    role = "BRANCH_ADMIN"
  } else if contains(username, "engineer") {
    role = "ENGINEER"
  } else if contains(username, "contractor") {
    role = "CONTRACTOR_EMPLOYEE"
  } else if contains(username, "vendor") {
    role = "VENDOR_EMPLOYEE"
  }

  c.JSON(http.StatusOK, gin.H{
    "token": "demo_token_" + os.Getenv("DEMO_MODE"),
    "user": map[string]interface{}{
      "id":          "jm-user-" + username,
      "username":    username,
      "displayName": username,
      "role":        role,
      "orgId":       "jm-branch1",
      "orgName":     "Branch 001",
      "tenantId":    "jm-tenant1",
    },
  })
}
```

**关键：** Token 格式为 `demo_token_true`（因为 `DEMO_MODE=true`）

### Phase 4: 登录后请求的身份信息

**前端请求拦截器（`frontend/src/api/client.ts:26-35`）：**
```typescript
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**实际发送的请求 header：**
```
Authorization: Bearer demo_token_true
```

**后端认证中间件处理（`internal/middleware/auth.go:16-28`）：**
```go
if utils.GetEnv("DEMO_MODE", "false") == "true" {
  demoUserID, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
  demoTenantID, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
  demoOrgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
  c.Set(utils.ContextKeyUserID, demoUserID)
  c.Set(utils.ContextKeyOrgID, demoOrgID)
  c.Set(utils.ContextKeyTenantID, demoTenantID)
  c.Set(utils.ContextKeyRole, "BRAND_HQ")  // 固定为 BRAND_HQ
  c.Set(utils.ContextKeyIsImpersonated, false)
  c.Next()
  return
}
```

**关键发现：** 即使前端发送了 `Authorization` header，后端在 demo 模式下完全忽略 token，直接使用固定的 demo 用户身份（UUID 全零，角色 BRAND_HQ）。

---

## 3. 身份信息总结

### 前端发送的身份信息

| 请求类型 | URL | 携带信息 |
|---------|-----|---------|
| 登录请求 | `POST /api/demo/auth/login` | Body: `{ username, password }` |
| 登录后请求 | 所有 API 请求 | Header: `Authorization: Bearer demo_token_true` |

### 后端实际使用的身份信息（Demo 模式）

| 字段 | 值 |
|------|-----|
| User ID | `00000000-0000-0000-0000-000000000001` (固定) |
| Tenant ID | `00000000-0000-0000-0000-000000000001` (固定) |
| Org ID | `00000000-0000-0000-0000-000000000001` (固定) |
| Role | `BRAND_HQ` (固定，忽略前端传递的角色) |
| Is Impersonated | `false` |

### 前端存储的用户信息（用于 UI 展示）

从登录响应中获取，存储在 Zustand store：
- `user_id`: `"jm-user-" + username`
- `username`: 登录用户名
- `role`: 后端根据用户名解析的角色（用于前端过滤）
- `org_id`: `"jm-branch1"`
- `tenant_id`: `"jm-tenant1"`
- `display_name`: 用户名

---

## 4. 关键设计

### 4.1 双层身份机制

Demo 模式存在**两层身份**：
1. **前端身份**：用于 UI 逻辑（角色过滤、页面展示）
2. **后端身份**：用于权限校验（固定在 BRAND_HQ）

这种设计的目的是：
- 前端可以模拟不同角色看到不同的工单列表
- 后端统一使用超级管理员权限，简化 demo 数据访问

### 4.2 Token 的无意义性

在 demo 模式下，token `demo_token_true` 实际上不被后端验证，仅作为前端标识登录状态的标志。后端完全依赖 `DEMO_MODE` 环境变量来判断是否跳过认证。

---

## 5. 潜在问题

1. **角色不一致**：前端显示的角色（如 ENGINEER）与后端实际使用的角色（BRAND_HQ）不一致，可能导致权限逻辑混乱
2. **Token 安全性**：demo token 是固定格式的，如果误用于生产环境会造成安全问题
3. **前端角色过滤不可靠**：前端根据用户名猜测角色进行过滤，如果用户名不包含关键词，默认使用 EMPLOYEE 角色

---

## 附录：文件索引

| 文件 | 作用 |
|------|-----|
| `Makefile:42-48` | demo 目标定义 |
| `frontend/.env.demo` | 前端 demo 环境变量 |
| `frontend/src/config/env.ts` | 前端环境配置 |
| `frontend/src/api/factory.ts` | API 工厂，选择 demo/api 模式 |
| `frontend/src/api/client.ts` | HTTP 客户端，注入 token |
| `frontend/src/pages/Login.tsx` | 登录页面 |
| `frontend/src/store/useAuthStore.ts` | 用户状态存储 |
| `internal/api/demo.go` | 后端 demo 处理器 |
| `internal/middleware/auth.go` | 认证中间件（demo 模式旁路） |
| `cmd/api/main.go` | 应用入口 |

---

*Model: big-pickle*
