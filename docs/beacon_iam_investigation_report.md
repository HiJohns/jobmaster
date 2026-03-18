# JobMaster 接入 Beacon-IAM 身份中心技术调查报告

## 1. 概述

本报告详细分析 JobMaster 现有身份认证与组织架构系统，并提出接入 Beacon-IAM 的完整技术方案。

### 1.1 调研目标
- 理解 JobMaster 现有认证流程
- 分析组织架构与用户管理机制
- 确定与 Beacon-IAM 对接的技术路径

### 1.2 Beacon-IAM 核心能力
根据 `../beaconiam/README.md`，Beacon-IAM 提供：
- **OIDC 授权码流**：`/oauth/authorize` → `/api/v1/auth/token`
- **JWT 签发**：RS256 算法，包含 `sub`, `tid`, `oid`, `role`, `own`, `name` 字段
- **组织管理**：`/api/v1/orgs/tree` 树形结构
- **成员管理**：`/api/v1/orgs/:id/users` 邀请成员

---

## 2. 现有系统分析

### 2.1 认证模块 (internal/api/auth.go)

**当前流程：**
1. 用户提交 `POST /api/v1/auth/login` (username + password)
2. 后端验证 bcrypt 密码哈希
3. 生成 HS256 JWT Token (使用 `JWT_SECRET`)
4. 返回 Token + 用户信息

**核心代码：**
```go
// Login 函数 (auth.go:34-91)
func Login(c *gin.Context) {
    // 1. 验证用户名密码
    // 2. 生成 JWT Token
    token, err := utils.GenerateToken(user.ID, user.OrganizationID, ...)
}
```

**关键差异：**
| 维度 | JobMaster 现状 | Beacon-IAM |
|------|----------------|------------|
| 登录方式 | 本地用户名密码 | OIDC 授权码流 |
| Token 签发 | JobMaster 本地 (HS256) | Beacon-IAM (RS256) |
| 密码存储 | bcrypt 本地哈希 | IAM 管理 |
| Token 校验 | 本地 JWT_SECRET | IAM Public Key (RS256) |

### 2.2 JWT 结构对比

**现有 JWTClaims (pkg/utils/jwt.go:22-30)：**
```go
type JWTClaims struct {
    UserID         uuid.UUID `json:"user_id"`
    OrgID          uuid.UUID `json:"org_id"`
    TenantID       uuid.UUID `json:"tenant_id"`
    Role           string    `json:"role"`
    IsImpersonated bool      `json:"is_impersonated"`
}
```

**Beacon-IAM JWTClaims：**
```json
{
  "sub": "u_xxx",        // 用户 UUID
  "tid": "t_xxx",       // Tenant ID
  "oid": "o_xxx",       // Org ID
  "role": "OWNER",      // OWNER|ADMIN|MANAGER|STAFF|WORKER
  "own": true,          // 是否组织所有者
  "name": "Weixun Lin"  // 显示名称
}
```

**字段映射：**
| 现有字段 | IAM 字段 | 转换方式 |
|----------|----------|----------|
| user_id | sub | 直接映射 |
| org_id | oid | 直接映射 |
| tenant_id | tid | 直接映射 |
| role | role | 需映射表 |
| is_impersonated | - | 固定 false |
| - | own | 新增字段 |
| - | name | 新增字段 |

### 2.3 组织架构 (internal/api/organization.go)

**当前实现：**
- 存储在本地 `organizations` 表
- 支持层级：`HQ → Store`, `MainContractor → Vendor`
- 通过 GORM 查询构建树形结构

**API 端点：**
- `GET /api/v1/organizations` - 列表
- `POST /api/v1/organizations` - 创建
- `GET /api/v1/organizations/tree` - 树形结构

**Beacon-IAM 对接方案：**
- 改为"影子实体"：仅存储 ID 映射
- 动态查询：`GET /api/v1/orgs/tree` 从 IAM 获取
- 业务规则：`max_dispatch_hops` 存储在 IAM 的 `meta` 字段

### 2.4 用户管理 (internal/api/user.go)

**当前实现：**
- 本地 `users` 表存储用户
- bcrypt 密码哈希
- 创建/更新/删除全在本地完成

**API 端点：**
- `POST /api/v1/users` - 创建用户 (含密码)
- `GET /api/v1/users` - 列表
- `PUT /api/v1/users/:id` - 更新
- `DELETE /api/v1/users/:id` - 删除

**Beacon-IAM 对接方案：**
- 创建用户改为调用 IAM：`POST /api/v1/orgs/:id/users`
- 保留本地影子用户：仅用于关联工单
- 角色映射：
  ```
  IAM: OWNER/ADMIN/MANAGER/STAFF/WORKER
  ↓
  JobMaster: BRAND_HQ, STORE, MAIN_CONTRACTOR, VENDOR, ENGINEER
  ```

---

## 3. 执行流程详解

### 3.1 Phase 1: 环境配置

```bash
# 环境变量
IAM_BASE_URL=http://localhost:5552
IAM_CLIENT_ID=jobmaster
IAM_CLIENT_SECRET=<secret>
IAM_PUBLIC_KEY=<RSA公钥>
```

### 3.2 Phase 2: 认证中间件升级

**已有改动 (Issue #35)：**
- ✅ `pkg/utils/iam.go` - RS256 JWT 解析
- ✅ `internal/middleware/auth.go` - 升级验证逻辑

### 3.3 Phase 3: OIDC Callback 实现

**新增端点：**
```
GET /api/v1/auth/callback?code=xxx&state=xxx
```

**处理流程：**
1. 接收 IAM 返回的 `code`
2. 后端调用 IAM：`POST /api/v1/auth/token`
3. 获取 access_token + id_token
4. 验证 id_token 签名
5. 生成 HttpOnly Cookie 或返回 Token

### 3.4 Phase 4: 组织架构集成

**数据库变更：**
```sql
ALTER TABLE organizations ADD COLUMN is_shadow BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN iam_org_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN max_dispatch_hops INT DEFAULT 3;
```

**API 变更：**
- `GET /api/v1/organizations/tree` → 调用 IAM
- 派单时获取供应商列表 → 调用 IAM

### 3.5 Phase 5: 用户管理重构

**角色映射表：**
| IAM Role | JobMaster Role |
|----------|----------------|
| OWNER | BRAND_HQ / MAIN_CONTRACTOR |
| ADMIN | BRAND_HQ / MAIN_CONTRACTOR |
| MANAGER | STORE |
| STAFF | STORE |
| WORKER | VENDOR / ENGINEER |

---

## 4. 依赖关系

### 4.1 上游依赖
- Beacon-IAM 服务 (`localhost:5552`)
- IAM Public Key 配置

### 4.2 下游依赖
- 工单服务：依赖用户 ID 和组织 ID
- 权限系统：依赖角色映射
- 派单逻辑：依赖 max_dispatch_hops

### 4.3 文件索引
| 文件 | 职责 |
|------|------|
| `pkg/utils/iam.go` | JWT RS256 解析 |
| `internal/middleware/auth.go` | 认证中间件 |
| `internal/api/auth.go` | 登录/刷新 |
| `internal/api/organization.go` | 组织管理 |
| `internal/api/user.go` | 用户管理 |
| `internal/model/user.go` | 用户模型 |
| `internal/model/organization.go` | 组织模型 |

---

## 5. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| IAM 服务不可用 | 无法登录 | 保留 HS256 fallback |
| 数据对齐失败 | 工单数据丢失 | 一次性迁移脚本 |
| 角色映射错误 | 权限越权 | 详细映射表 + 测试 |

---

## 6. 改进建议

### 6.1 渐进式迁移
1. 第一阶段：仅改认证，保留本地用户
2. 第二阶段：对接组织和用户
3. 第三阶段：废弃本地登录

### 6.2 缓存策略
- 组织树缓存：Redis 5 分钟 TTL
- 用户信息缓存：Redis 1 分钟 TTL

---

## 附录

### A. Beacon-IAM API 清单

| 接口 | 方法 | 路径 |
|------|------|------|
| 授权重定向 | GET | `/oauth/authorize` |
| 令牌交换 | POST | `/api/v1/auth/token` |
| 身份预检 | GET | `/api/v1/auth/me` |
| 创建租户 | POST | `/api/v1/tenants` |
| 邀请成员 | POST | `/api/v1/orgs/:id/users` |
| 获取组织树 | GET | `/api/v1/orgs/tree` |

### B. 需要修改的 API 端点

| 现有端点 | 变更类型 | 说明 |
|----------|----------|------|
| POST /api/v1/auth/login | 废弃 | 改为 OIDC |
| GET /api/v1/auth/callback | 新增 | OIDC 回调 |
| GET /api/v1/organizations/tree | 重构 | 调用 IAM |
| POST /api/v1/users | 重构 | 调用 IAM |
