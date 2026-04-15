## 🏗️ 执行计划分析 (Issue #99)

### 📋 任务现状审计

**Issue 描述**：以分公司员工的身份登录后，工单列表界面上没有创建按钮

**用户当前角色**：分公司员工 (UserRoleStaff / EMPLOYEE)

### 🔍 深度扫描：核心文档一致性

#### 文档层面（全部支持员工创建工单）：

| 文档 | 角色权限定义 | 一致性 |
|------|-------------|--------|
| **docs/cases.md 用例05** | 分公司员工 employee1 创建工单3、4 | ✅ 支持 |
| **docs/ui_design.md** | 分公司员工：创建工单 | ✅ 支持 |
| **docs/database_design.md** | EMPLOYEE: 可创建工单 ✅ | ✅ 支持 |
| **internal/model/user.go** | UserRoleStaff: "order:create" | ✅ 支持 |

#### 代码层面（存在缺陷）：

**问题文件**：`internal/api/workorder.go:222-230`

```go
// ❌ 当前实现（过于严格）
if model.UserRole(userRole) != model.UserRoleStore {
    response.Forbidden(c, "only store can create work orders")
    return
}
```

**问题**：
- 只检查 `UserRoleStore` 角色
- **未包含** `UserRoleStaff`（员工）角色
- 与所有文档定义的权限矩阵不一致

### ✅ 建议执行步骤

#### 步骤 1：修复后端 API 权限检查
**文件**：`internal/api/workorder.go`

**修改 CreateWorkOrder 函数**：
```go
// 将硬编码角色检查改为权限检查
userRole, ok := middleware.GetRole(c)
if !ok {
    response.Unauthorized(c, "invalid token: role not found")
    return
}

// 检查是否有创建工单权限（STORE 或 STAFF）
role := model.UserRole(userRole)
if role != model.UserRoleStore && role != model.UserRoleStaff {
    response.Forbidden(c, "insufficient permissions to create work orders")
    return
}
```

#### 步骤 2：验证前端显示
**检查文件**：`frontend/src/pages/WorkOrderList.tsx` 或相关页面

确认：
- 工单列表页面根据用户角色显示"创建工单"按钮
- 分公司员工角色能看到创建按钮

#### 步骤 3：运行测试
- 后端：`go test ./internal/api/... -v`
- 编译：`go build ./...`
- 前端：`npm run build` (frontend 和 frontend-mobile)

### 🚨 阻塞问题

1. **默认跳转**：Issue #99 与 #102（『我的』白屏）可能有关联，如果登录后跳转逻辑有问题
2. **角色映射**：需要确认前端使用的角色名与后端 UserRole 常量是否一致

### 📝 验收标准

- [ ] 后端 API 接受 STORE 和 STAFF 角色创建工单
- [ ] 分公司员工登录后能看到创建工单按钮
- [ ] 分公司员工能成功创建工单
- [ ] Go 单元测试通过
- [ ] TypeScript 编译通过

---
*Model: big-pickle*
