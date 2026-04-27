# Demo Mode Login Logic Investigation Report

## 1. Overview

**Investigation Target:** Analyze the frontend login logic when starting with `make demo`, and identify the identity information sent in requests after login.

**Key Findings:**
- Demo mode works via `DEMO_MODE=true` environment variable and frontend `VITE_USE_DEMO_API=true`
- Frontend login requests are sent to `/api/demo/auth/login`, handled by backend `DemoHandlers.Login`
- After login, requests carry `Authorization: Bearer demo_token_xxx` header, but the backend ignores the token in demo mode and uses a fixed identity

---

## 2. Execution Flow Details

### Phase 1: Demo Mode Startup

**Backend Startup (`make demo`):**
```bash
DEMO_MODE=true go run cmd/api/main.go
```

- Backend detects `DEMO_MODE=true`, registers demo routes (`internal/api/demo.go:27`)
- Demo route prefix: `/api/demo`
- Endpoints: `/auth/login`, `/workorders`, `/organizations`, `/users`, `/categories`

**Frontend Configuration (`.env.demo`):**
```bash
VITE_USE_DEMO_API=true
VITE_API_BASE_URL=/api/demo
```

- Vite dev server proxies `/api/demo` to `http://localhost:5555` (`vite.config.ts:22-26`)
- Frontend `config/env.ts` sets `USE_DEMO_API = true`, `API_BASE_URL = '/api/demo'`

### Phase 2: Frontend Login Logic

**Login Entry (`frontend/src/pages/Login.tsx:54-66`):**
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

**demoApi.login Implementation (`frontend/src/api/factory.ts:24-39`):**
```typescript
login: async (username: string, password: string) => {
  const response = await apiClient.request({
    url: '/auth/login',  // Actually /api/demo/auth/login
    method: 'POST',
    data: { username, password },
  })
  const data = response.data || response
  if (data && data.user) {
    setDemoUserRole(data.user.role)  // Store role for frontend filtering
  }
  return data
}
```

**HTTP Client Configuration (`frontend/src/api/client.ts:19-23`):**
```typescript
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/demo',  // From API_BASE_URL
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})
```

### Phase 3: Backend Demo Login Handling

**Demo Login Handler (`internal/api/demo.go:183-221`):**
```go
func (h *DemoHandlers) Login(c *gin.Context) {
  var req struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
  }
  // Role parsing logic
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

**Key:** Token format is `demo_token_true` (because `DEMO_MODE=true`)

### Phase 4: Identity Information in Post-Login Requests

**Frontend Request Interceptor (`frontend/src/api/client.ts:26-35`):**
```typescript
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**Actual Request Headers Sent:**
```
Authorization: Bearer demo_token_true
```

**Backend Auth Middleware Handling (`internal/middleware/auth.go:16-28`):**
```go
if utils.GetEnv("DEMO_MODE", "false") == "true" {
  demoUserID, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
  demoTenantID, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
  demoOrgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
  c.Set(utils.ContextKeyUserID, demoUserID)
  c.Set(utils.ContextKeyOrgID, demoOrgID)
  c.Set(utils.ContextKeyTenantID, demoTenantID)
  c.Set(utils.ContextKeyRole, "BRAND_HQ")  // Fixed as BRAND_HQ
  c.Set(utils.ContextKeyIsImpersonated, false)
  c.Next()
  return
}
```

**Key Finding:** Even though the frontend sends the `Authorization` header, the backend completely ignores the token in demo mode and uses a fixed demo user identity (all-zero UUID, role BRAND_HQ).

---

## 3. Identity Information Summary

### Identity Information Sent by Frontend

| Request Type | URL | Carried Information |
|--------------|-----|---------------------|
| Login Request | `POST /api/demo/auth/login` | Body: `{ username, password }` |
| Post-Login Requests | All API requests | Header: `Authorization: Bearer demo_token_true` |

### Identity Information Actually Used by Backend (Demo Mode)

| Field | Value |
|-------|-------|
| User ID | `00000000-0000-0000-0000-000000000001` (fixed) |
| Tenant ID | `00000000-0000-0000-0000-000000000001` (fixed) |
| Org ID | `00000000-0000-0000-0000-000000000001` (fixed) |
| Role | `BRAND_HQ` (fixed, ignores role passed by frontend) |
| Is Impersonated | `false` |

### User Information Stored in Frontend (for UI Display)

Retrieved from login response and stored in Zustand store:
- `user_id`: `"jm-user-" + username`
- `username`: login username
- `role`: role parsed by backend based on username (used for frontend filtering)
- `org_id`: `"jm-branch1"`
- `tenant_id`: `"jm-tenant1"`
- `display_name`: username

---

## 4. Key Design

### 4.1 Dual Identity Mechanism

Demo mode has **two layers of identity**:
1. **Frontend Identity**: Used for UI logic (role filtering, page display)
2. **Backend Identity**: Used for permission checks (fixed as BRAND_HQ)

Purpose of this design:
- Frontend can simulate different roles to see different work order lists
- Backend uniformly uses super admin permissions to simplify demo data access

### 4.2 Token Meaninglessness

In demo mode, the token `demo_token_true` is not actually validated by the backend; it only serves as a flag for the frontend to indicate login status. The backend relies entirely on the `DEMO_MODE` environment variable to determine whether to skip authentication.

---

## 5. Potential Issues

1. **Role Inconsistency**: The role displayed on the frontend (e.g., ENGINEER) is inconsistent with the role actually used by the backend (BRAND_HQ), which may cause permission logic confusion
2. **Token Security**: The demo token has a fixed format; if mistakenly used in production, it would cause security issues
3. **Unreliable Frontend Role Filtering**: The frontend guesses roles based on usernames for filtering; if the username doesn't contain keywords, it defaults to EMPLOYEE role

---

## Appendix: File Index

| File | Purpose |
|------|---------|
| `Makefile:42-48` | demo target definition |
| `frontend/.env.demo` | Frontend demo environment variables |
| `frontend/src/config/env.ts` | Frontend environment configuration |
| `frontend/src/api/factory.ts` | API factory, selects demo/api mode |
| `frontend/src/api/client.ts` | HTTP client, injects token |
| `frontend/src/pages/Login.tsx` | Login page |
| `frontend/src/store/useAuthStore.ts` | User state storage |
| `internal/api/demo.go` | Backend demo handlers |
| `internal/middleware/auth.go` | Auth middleware (demo mode bypass) |
| `cmd/api/main.go` | Application entry point |

---

*Model: big-pickle*
