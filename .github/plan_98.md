## 🏗️ 执行计划分析 (Issue #98)

### 📋 任务现状审计

**Issue 要求**：
- 租户表应该记录每个租户的最大跳数设置
- 管理员在租户管理界面可以修改
- 默认为 2（Issue 说 2，但代码中默认是 3）
- 更新核心文档和程序

### 📊 当前实现状态

| 组件 | 字段 | 创建时 | 编辑时 | 说明 |
|------|------|--------|--------|------|
| **后端 Model** | MaxHops | ✅ | ✅ | internal/model/tenant.go:23 |
| **后端 API (创建)** | MaxHops | ✅ | N/A | CreateTenantRequest:59 |
| **后端 API (更新)** | MaxHops | N/A | ❌ **缺失** | UpdateTenantRequest:66-70 |
| **前端表单 (创建)** | max_hops | ✅ | N/A | TenantForm.tsx:147-162 |
| **前端表单 (编辑)** | max_hops | N/A | ❌ **缺失** | TenantForm.tsx |
| **数据库** | max_hops | ✅ | ✅ | migrations/019 |

### 🔍 核心文档一致性扫描

**database_design.md vs 代码**：

| 文档字段 | 代码字段 | 一致性 |
|----------|----------|--------|
| 租户表无 max_hops | Tenant.MaxHops | ❌ **文档缺失** |

**Issue 描述 vs 代码默认值**：
- Issue 要求默认值为 2
- 代码中实际默认值为 3（MaxHops int `gorm:"default:3"`）
- **需要确认用户意图**

### ✅ 建议执行步骤

#### 步骤 1：修复后端 Update API（更新租户）
**文件**：`internal/api/admin/tenant_handler.go`

**添加 MaxHops 到 UpdateTenantRequest**：
```go
type UpdateTenantRequest struct {
    Name          string      `json:"name"`
    ContactPerson string      `json:"contact_person"`
    Config        interface{} `json:"config"`
    MaxHops       FlexibleInt `json:"max_hops"`  // 新增
}
```

#### 步骤 2：修复前端表单（编辑模式）
**文件**：`frontend/src/pages/admin/TenantForm.tsx`

**在编辑模式下显示 max_hops 输入框**：
- 修改 isEditMode 条件判断，显示 max_hops 字段
- 添加验证规则（1-10）

#### 步骤 3：更新数据库设计文档
**文件**：`docs/database_design.md`

**更新 tenants 表结构**：
- 添加 max_hops 字段（SMALLINT，默认 3）
- 添加 max_hops 字段到英文版本

### 🚨 阻塞问题（需用户确认）

1. **默认值**：Issue 说"默认为 2"，代码中是 "default:3"，应该用哪个？
2. **权限**：是否只有租户管理员可以修改自己租户的 max_hops？还是管理员可以修改所有租户？

### 📝 验收标准

- [ ] 后端 Update API 支持修改 max_hops
- [ ] 前端租户编辑表单可以修改 max_hops
- [ ] database_design.md 更新（中文+英文）
- [ ] TypeScript 编译通过
- [ ] Go 编译通过

---
*Model: big-pickle*
