# JobMaster Demo Accounts - 演示账户清单

## 概述
本文档列出原型演示中使用的所有预置账户。密码统一使用：`demo123`

---

## 用户账户列表

### 分公司 (Branch 1: Branch 001)

| 账户 | 密码 | 角色 | 用例 |
|------|------|------|------|
| admin@branch1 | demo123 | BRANCH_ADMIN (分公司管理员) | 用例04, 05 |
| employee1@branch1 | demo123 | EMPLOYEE (分公司员工) | 用例05 |
| employee2@branch1 | demo123 | EMPLOYEE (分公司员工) | - |

### 工程公司 (Contractor 1: Contractor A)

| 账户 | 密码 | 角色 | 用例 |
|------|------|------|------|
| admin@contractor1 | demo123 | CONTRACTOR_ADMIN (工程公司管理员) | 用例06 |
| employee1@contractor1 | demo123 | CONTRACTOR_EMPLOYEE (工程公司员工) | 用例07 |
| engineer1@contractor1 | demo123 | ENGINEER (工程师) | 用例10 |
| engineer2@contractor1 | demo123 | ENGINEER (工程师) | - |

### 供应商 (Vendor 1: Vendor X)

| 账户 | 密码 | 角色 | 用例 |
|------|------|------|------|
| admin@vendor1 | demo123 | VENDOR_ADMIN (供应商管理员) | 用例08 |
| employee1@vendor1 | demo123 | VENDOR_EMPLOYEE (供应商员工) | 用例09 |
| engineer1@vendor1 | demo123 | ENGINEER (工程师) | 用例10 |
| engineer2@vendor1 | demo123 | ENGINEER (工程师) | - |

### 工程公司 (Contractor 2: Contractor B) - 作为外部供应商

| 账户 | 密码 | 角色 | 用例 |
|------|------|------|------|
| admin@contractor2 | demo123 | CONTRACTOR_ADMIN (工程公司管理员) | 用例06 |
| employee1@contractor2 | demo123 | CONTRACTOR_EMPLOYEE | - |
| engineer1@contractor2 | demo123 | ENGINEER | - |
| engineer2@contractor2 | demo123 | ENGINEER | - |

---

## 组织架构关系

```
Tenant Alpha (jm-tenant1)
│
├── Branch 001 (jm-branch1)
│   ├── admin@branch1 (BRANCH_ADMIN)
│   ├── employee1@branch1 (EMPLOYEE)
│   └── employee2@branch1 (EMPLOYEE)
│
├── Contractor A (jm-contractor1)
│   ├── admin@contractor1 (CONTRACTOR_ADMIN)
│   ├── employee1@contractor1 (CONTRACTOR_EMPLOYEE)
│   ├── engineer1@contractor1 (ENGINEER)
│   └── engineer2@contractor1 (ENGINEER)
│
└── Vendor X (jm-vendor1) [Contractor B as external vendor]
    ├── admin@vendor1 (VENDOR_ADMIN)
    ├── employee1@vendor1 (VENDOR_EMPLOYEE)
    ├── engineer1@vendor1 (ENGINEER)
    └── engineer2@vendor1 (ENGINEER)

Contractor B (jm-contractor2) [External vendor for Contractor A]
    ├── admin@contractor2 (CONTRACTOR_ADMIN)
    ├── employee1@contractor2 (CONTRACTOR_EMPLOYEE)
    ├── engineer1@contractor2 (ENGINEER)
    └── engineer2@contractor2 (ENGINEER)
```

---

## 关联关系

- **Branch 001** → 关联 **Contractor A**
- **Contractor A** → 关联外部供应商 **Contractor B** (Vendor X)

---

## 用例执行顺序

| 顺序 | 账户 | 演示内容 |
|------|------|----------|
| 1 | employee1@branch1 | 用例05：创建工单、查看工单列表 |
| 2 | admin@contractor1 | 用例06：管理后台、分配工单、添加供应商 |
| 3 | employee1@contractor1 | 用例07：分配工单给工程师 |
| 4 | admin@vendor1 | 用例08：管理后台、分配工单 |
| 5 | employee1@vendor1 | 用例09：分配工单给工程师 |
| 6 | engineer1@contractor1 | 用例10：接单→预约→进场→施工→离场 |

---

## 预置工单数据

| 工单号 | 当前状态 | 创建人 | 分配给 |
|--------|----------|--------|--------|
| WO-20260413-C1-0001 | PENDING | employee1@branch1 | - |
| WO-20260413-C1-0002 | PENDING | employee1@branch1 | - |
| WO-20260413-C1-0003 | DISPATCHED | employee1@branch1 | Contractor A |
| WO-20260413-C1-0004 | DISPATCHED | employee1@branch1 | Contractor A |
| WO-20260413-C1-0005 | DISPATCHED | employee1@branch1 | Contractor B (Vendor) |
| WO-20260413-C1-0006 | ACCEPTED | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0007 | RESERVED | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0008 | WORKING | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0009 | FINISHED | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0010 | OBSERVING | employee1@branch1 | Contractor A → Engineer1 |

---

## 技术说明

1. **密码**: 所有账户使用统一密码 `demo123`（便于演示）
2. **登录方式**: 登录页面提供快速选择下拉框，点击账户即可登录
3. **数据隔离**: 不同角色的用户只能看到有权访问的工单
4. **提权操作**: 管理员账户可进入管理后台进行关联组织操作

---

*Model: moonshotai-cn/kimi-k2.5*