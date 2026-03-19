# API 接口测试覆盖率调查报告

> 生成日期: 2026-03-19
> Issue: #58
> 版本: v2.0.5

---

## 1. 概述

### 1.1 目标
为 JobMaster 所有 API 包添加基于 `httptest` 的单元测试，确保覆盖所有边缘值和逻辑分支。

### 1.2 测试范围
| 模块 | 文件 | 当前状态 |
|------|------|----------|
| 认证 | `internal/api/auth.go` | ⚠️ 部分覆盖 |
| 工单 | `internal/api/workorder.go` | ❌ 未覆盖 |
| 设备 | `internal/api/device.go` | ❌ 未覆盖 |
| 组织 | `internal/api/organization.go` | ❌ 未覆盖 |
| 租户 | `internal/api/tenant.go` | ❌ 未覆盖 |
| 用户 | `internal/api/user.go` | ❌ 未覆盖 |
| 位置 | `internal/api/location.go` | ❌ 未覆盖 |
| 租期 | `internal/api/lease.go` | ❌ 未覆盖 |
| 维修 | `internal/api/repair.go` | ❌ 未覆盖 |

### 1.3 现有测试基础设施
- 测试框架: `github.com/stretchr/testify`
- HTTP 测试: `net/http/httptest`
- 路由测试: `github.com/gin-gonic/gin`
- 测试文件位置: `tests/httptest/`

---

## 2. 现有测试模式分析

### 2.1 测试基础设施 (main_test.go)

```go
// 测试辅助函数
ExecuteRequest(t, method, url, body, headers)
ExecuteRequestWithAuth(t, method, url, body, token)
ParseResponse(w, v)
BeginTransaction(t) // 事务回滚隔离
```

### 2.2 已覆盖场景 (auth_test.go)

| 测试用例 | 类型 |
|----------|------|
| TestLogin_Success | 成功路径 |
| TestLogin_InvalidCredentials | 错误路径 |
| TestLogin_InvalidUsername | 边界值 |
| TestLogin_MissingFields | 必填字段 |
| TestProtectedRoute_InvalidToken | 认证边界 |
| TestProtectedRoute_MissingToken | 认证边界 |
| TestHealthEndpoint | 公共端点 |
| TestRefreshToken_Success | 成功路径 |
| TestRefreshToken_InvalidToken | 错误路径 |

### 2.3 测试覆盖率缺口

```
auth.go       ████████░░  60%
workorder.go  ░░░░░░░░░  0%
device.go     ░░░░░░░░░  0%
organization.go ░░░░░░░░░  0%
user.go       ░░░░░░░░░  0%
location.go   ░░░░░░░░░  0%
lease.go      ░░░░░░░░░  0%
repair.go     ░░░░░░░░░  0%
```

---

## 3. 详细测试计划

### 3.1 认证模块 (auth_test.go) - 扩展

#### 3.1.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| AUTH-01 | 登录成功 | 成功路径 | P0 |
| AUTH-02 | 用户名不存在 | 错误处理 | P0 |
| AUTH-03 | 密码错误 | 错误处理 | P0 |
| AUTH-04 | 用户被禁用 | 业务逻辑 | P0 |
| AUTH-05 | 缺少用户名 | 必填字段 | P0 |
| AUTH-06 | 缺少密码 | 必填字段 | P0 |
| AUTH-07 | 用户名过短 (<3) | 边界值 | P1 |
| AUTH-08 | 密码过短 (<6) | 边界值 | P1 |
| AUTH-09 | 用户名过长 (>100) | 边界值 | P1 |
| AUTH-10 | 密码过长 (>128) | 边界值 | P1 |
| AUTH-11 | 空请求体 | 边界值 | P1 |
| AUTH-12 | Token 刷新成功 | 成功路径 | P0 |
| AUTH-13 | Token 刷新无效 | 错误处理 | P0 |
| AUTH-14 | 模拟登录 (OIDC) | 成功路径 | P1 |
| AUTH-15 | OIDC Callback 失败 | 错误处理 | P1 |

#### 3.1.2 Mock 策略

```go
// 使用现有数据库连接 + TestMain
// 可考虑添加 Mock 认证中间件
```

---

### 3.2 工单模块 (workorder_test.go) - 新建

#### 3.2.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| WO-01 | 创建工单成功 | 成功路径 | P0 |
| WO-02 | 创建工单缺少必填字段 | 必填字段 | P0 |
| WO-03 | 创建工单描述为空 | 边界值 | P1 |
| WO-04 | 查询工单列表 (分页) | 分页 | P0 |
| WO-05 | 查询工单列表 (状态过滤) | 过滤 | P0 |
| WO-06 | 查询工单列表 (日期范围) | 过滤 | P1 |
| WO-07 | 查询单个工单成功 | 成功路径 | P0 |
| WO-08 | 查询不存在的工单 | 错误处理 | P0 |
| WO-09 | 派单成功 | 成功路径 | P0 |
| WO-10 | 派单给无效供应商 | 错误处理 | P0 |
| WO-11 | 接单成功 | 成功路径 | P0 |
| WO-12 | 接单时间无效 | 边界值 | P1 |
| WO-13 | 拒单成功 | 成功路径 | P0 |
| WO-14 | 拒单未提供原因 | 必填字段 | P1 |
| WO-15 | 预约成功 | 成功路径 | P0 |
| WO-16 | 到达确认成功 | 成功路径 | P0 |
| WO-17 | GPS 校验有效 | 业务逻辑 | P0 |
| WO-18 | GPS 校验无效 | 业务逻辑 | P0 |
| WO-19 | 完工成功 | 成功路径 | P0 |
| WO-20 | 完工缺少描述 | 必填字段 | P1 |
| WO-21 | 完工含费用 | 业务逻辑 | P1 |
| WO-22 | Hop Count 限制触发 | 业务逻辑 | P0 |
| WO-23 | 工单关闭 | 成功路径 | P0 |
| WO-24 | 状态流转非法 | 边界值 | P1 |

#### 3.2.2 测试辅助函数

```go
// 建议添加
func loginAsAdmin() string
func loginAsEngineer() string
func createTestWorkOrder() WorkOrder
func getTestVendorID() uuid.UUID
```

---

### 3.3 设备模块 (device_test.go) - 新建

#### 3.3.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| DEV-01 | 创建设备成功 | 成功路径 | P0 |
| DEV-02 | 创建设备 SN 重复 | 业务逻辑 | P0 |
| DEV-03 | 创建设备缺少 SN | 必填字段 | P0 |
| DEV-04 | 创建设备缺少名称 | 必填字段 | P0 |
| DEV-05 | 创建设备缺少 OrgID | 必填字段 | P0 |
| DEV-06 | 创建设备 OrgID 无效 | 错误处理 | P0 |
| DEV-07 | 创建设备 LocationID 无效 | 错误处理 | P0 |
| DEV-08 | 按 SN 查询设备成功 | 成功路径 | P0 |
| DEV-09 | 按 SN 查询不存在的设备 | 错误处理 | P0 |
| DEV-10 | 生成设备二维码 | 业务逻辑 | P1 |
| DEV-11 | 查询设备列表 (分页) | 分页 | P0 |
| DEV-12 | 查询设备列表 (Org 过滤) | 过滤 | P0 |
| DEV-13 | 查询设备列表 (状态过滤) | 过滤 | P0 |
| DEV-14 | 更新设备成功 | 成功路径 | P0 |
| DEV-15 | 删除设备成功 | 成功路径 | P0 |
| DEV-16 | 删除不存在的设备 | 错误处理 | P0 |

---

### 3.4 组织模块 (organization_test.go) - 新建

#### 3.4.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| ORG-01 | 创建组织成功 (BrandHQ) | 成功路径 | P0 |
| ORG-02 | 创建组织权限不足 | 权限 | P0 |
| ORG-03 | 创建组织类型错误 | 业务逻辑 | P0 |
| ORG-04 | 创建组织缺少必填字段 | 必填字段 | P0 |
| ORG-05 | 查询组织树 (缓存命中) | 缓存 | P0 |
| ORG-06 | 查询组织树 (缓存失效) | 缓存 | P0 |
| ORG-07 | 更新组织成功 | 成功路径 | P0 |
| ORG-08 | 更新组织权限不足 | 权限 | P0 |
| ORG-09 | 查询单个组织成功 | 成功路径 | P0 |
| ORG-10 | 查询不存在的组织 | 错误处理 | P0 |

---

### 3.5 用户模块 (user_test.go) - 新建

#### 3.5.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| USR-01 | 创建用户成功 | 成功路径 | P0 |
| USR-02 | 创建用户权限不足 | 权限 | P0 |
| USR-03 | 创建用户密码过短 | 边界值 | P1 |
| USR-04 | 创建用户角色无效 | 业务逻辑 | P0 |
| USR-05 | 查询用户列表 (分页) | 分页 | P0 |
| USR-06 | 查询用户列表 (角色过滤) | 过滤 | P0 |
| USR-07 | 查询用户列表 (组织过滤) | 过滤 | P0 |
| USR-08 | 查询单个用户成功 | 成功路径 | P0 |
| USR-09 | 更新用户成功 | 成功路径 | P0 |
| USR-10 | 更新用户状态 | 业务逻辑 | P0 |
| USR-11 | 删除用户成功 | 成功路径 | P0 |
| USR-12 | 删除最后一个管理员 | 业务逻辑 | P0 |

---

### 3.6 租期模块 (lease_test.go) - 新建

#### 3.6.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| LSE-01 | 查询租期进度 (新建) | 成功路径 | P0 |
| USR-02 | 查询租期进度 (已有) | 成功路径 | P0 |
| LSE-03 | 查询租期进度无设备 | 错误处理 | P0 |
| LSE-04 | 更新租期进度成功 | 成功路径 | P0 |
| LSE-05 | 更新租期进度缺少字段 | 必填字段 | P0 |
| LSE-06 | 更新租期进度月份无效 | 边界值 | P1 |
| LSE-07 | 触发 12 个月阈值 | 业务逻辑 | P0 |
| LSE-08 | 已完成租期更新 | 业务逻辑 | P0 |

---

### 3.7 位置模块 (location_test.go) - 新建

#### 3.7.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| LOC-01 | 创建位置成功 | 成功路径 | P0 |
| LOC-02 | 创建位置缺少必填字段 | 必填字段 | P0 |
| LOC-03 | 创建位置 OrgID 无效 | 错误处理 | P0 |
| LOC-04 | 查询位置列表 (分页) | 分页 | P0 |
| LOC-05 | 查询位置列表 (Org 过滤) | 过滤 | P0 |
| LOC-06 | 更新位置成功 | 成功路径 | P0 |
| LOC-07 | 删除位置成功 | 成功路径 | P0 |

---

### 3.8 维修模块 (repair_test.go) - 新建

#### 3.8.1 测试用例清单

| ID | 测试用例 | 分类 | 优先级 |
|----|----------|------|--------|
| RPR-01 | 提交维修成功 | 成功路径 | P0 |
| RPR-02 | 提交维修缺少 SN | 必填字段 | P0 |
| RPR-03 | 提交维修设备不存在 | 错误处理 | P0 |
| RPR-04 | 提交维修缺少描述 | 必填字段 | P0 |

---

## 4. 测试执行策略

### 4.1 测试分类

| 类型 | 目标覆盖率 | 执行频率 |
|------|------------|----------|
| 单元测试 | 80% 逻辑分支 | 每次 PR |
| 集成测试 | 100% API 端点 | 每次 PR |
| 端到端测试 | 核心用户路径 | 发布前 |

### 4.2 测试隔离策略

```go
// 方案 1: 事务回滚 (现有)
// 方案 2: 独立测试数据库
// 方案 3: Mock 数据库层 (推荐)

type MockDB struct {
    // 实现 gorm.DB 接口
}
```

### 4.3 Mock 依赖

| 依赖 | Mock 方案 | 优先级 |
|------|-----------|--------|
| Database | gormmock 或 sqlmock | P0 |
| Redis | miniredis | P1 |
| IAM | mock HTTP 响应 | P1 |

---

## 5. 测试文件结构

```
tests/httptest/
├── main_test.go           # 测试基础设施
├── auth_test.go          # 认证测试 (已有)
├── workorder_test.go     # 工单测试 (新建)
├── device_test.go        # 设备测试 (新建)
├── organization_test.go   # 组织测试 (新建)
├── user_test.go          # 用户测试 (新建)
├── location_test.go      # 位置测试 (新建)
├── lease_test.go         # 租期测试 (新建)
└── repair_test.go        # 维修测试 (新建)
```

---

## 6. 实施计划

### 阶段 1: 基础设施增强 (1 天)
- [ ] 添加 Mock 认证中间件
- [ ] 添加测试数据工厂函数
- [ ] 添加 Redis Mock (miniredis)

### 阶段 2: 核心 API 测试 (3 天)
- [ ] workorder_test.go (25 用例)
- [ ] device_test.go (16 用例)
- [ ] organization_test.go (10 用例)

### 阶段 3: 辅助 API 测试 (2 天)
- [ ] user_test.go (12 用例)
- [ ] lease_test.go (8 用例)
- [ ] location_test.go (7 用例)
- [ ] repair_test.go (4 用例)

### 阶段 4: 边界值增强 (1 天)
- [ ] 字符串长度边界
- [ ] 数值范围边界
- [ ] 日期时间边界
- [ ] UUID 格式边界

---

## 7. 验收标准

| 指标 | 目标 |
|------|------|
| API 端点覆盖率 | 100% |
| 逻辑分支覆盖率 | 80% |
| 边缘值覆盖 | 90% |
| 测试通过率 | 100% |
| 测试执行时间 | < 5 分钟 |

---

## 8. 附录

### A. 文件索引

| 文件 | 行数 | 复杂度 |
|------|------|--------|
| internal/api/auth.go | 431 | 中 |
| internal/api/workorder.go | 1168 | 高 |
| internal/api/device.go | 368 | 中 |
| internal/api/organization.go | 322 | 中 |
| internal/api/user.go | 360 | 中 |
| internal/api/location.go | 259 | 低 |
| internal/api/lease.go | 299 | 中 |
| internal/api/repair.go | 147 | 低 |

### B. API 端点清单

| 模块 | 方法 | 端点 | 状态 |
|------|------|------|------|
| Auth | POST | /api/v1/auth/login | ✅ 已覆盖 |
| Auth | GET | /api/v1/auth/callback | ❌ 未覆盖 |
| Auth | POST | /api/v1/auth/refresh | ✅ 已覆盖 |
| WorkOrder | GET | /api/v1/workorders | ❌ 未覆盖 |
| WorkOrder | POST | /api/v1/workorders | ❌ 未覆盖 |
| WorkOrder | GET | /api/v1/workorders/:id | ❌ 未覆盖 |
| WorkOrder | POST | /api/v1/workorders/:id/dispatch | ❌ 未覆盖 |
| WorkOrder | POST | /api/v1/workorders/:id/accept | ❌ 未覆盖 |
| WorkOrder | POST | /api/v1/workorders/:id/reject | ❌ 未覆盖 |
| WorkOrder | POST | /api/v1/workorders/:id/reserve | ❌ 未覆盖 |
| WorkOrder | POST | /api/v1/workorders/:id/arrive | ❌ 未覆盖 |
| WorkOrder | POST | /api/v1/workorders/:id/finish | ❌ 未覆盖 |
| Device | GET | /api/v1/devices | ❌ 未覆盖 |
| Device | POST | /api/v1/devices | ❌ 未覆盖 |
| Device | GET | /api/v1/devices/:id | ❌ 未覆盖 |
| Device | GET | /api/v1/devices/sn/:sn | ❌ 未覆盖 |
| Device | GET | /api/v1/devices/:id/qrcode | ❌ 未覆盖 |
| Organization | GET | /api/v1/organizations | ❌ 未覆盖 |
| Organization | POST | /api/v1/organizations | ❌ 未覆盖 |
| Organization | GET | /api/v1/organizations/tree | ❌ 未覆盖 |
| Lease | GET | /api/v1/leases/progress | ❌ 未覆盖 |
| Lease | POST | /api/v1/leases/progress/update | ❌ 未覆盖 |
| Repair | POST | /api/v1/repair/submit | ❌ 未覆盖 |

---

*本报告由系统自动生成*
*最后更新: 2026-03-19*
