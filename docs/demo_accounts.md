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
| WO-20260413-C1-0009 | PENDING_EVALUATION | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0010 | CLOSED | employee1@branch1 | Contractor A → Engineer1 |

---

## 预订界面

### 分公司员工（微信端）

1. 工单列表
    - 创建工单=>工单表单
    - 工单列表，显示本分公司发起且未关闭的所有工单：标题、创建时间、创建人、当前状态，点击工单=>工单详情
    - 工单表单，输入标题、工作内容、上传图片
    - 工单详情：显示工单详情。
        - 待验收状态时，可以点击『验收合格』或『退回整改』，两种情况下均可输入评论并上传图片，退回整改时工单状态转为拒单，回转给工程公司
        - 拒单状态可以查看拒单理由
        - 流转、分配、已预约、施工中状态下，界面上显示二维码
2. 预约页
    - 预约列表，显示：预约时间、工作内容（相关工单标题）、 预约者、状态（待确认、协商中、已确认、已过期）。点击=>预约详情
    - 预约详情：当预约处于待确认状态时可以点击『确认』或『拒绝』，拒绝时可输入评论。处于确认状态时可点击『改期』并输入评论。『确认』后相应工单转入已预约状态
  
### 工程公司员工（微信端）

1. 工单列表
    - 工单列表，显示本分公司相关的所有工单（流转、分配、已预约、施工中、验收、拒收、拒单）
        - 流转、逾期、分配、拒收状态的工单可以点击转发=>转发表单，分配=>分配表单，拒单=>拒单对话框输入拒单理由，回转给分公司
        - 拒收状态的工单可以点击分配=>分配表单

### 供应商公司员工（微信端）

1. 工单列表
    - 工单列表，显示本分公司相关的所有工单（流转、分配、已预约、施工中、验收、拒收）
        - 流转、逾期、分配状态的工单可以点击转发=>转发表单，分配=>分配表单，拒单=>拒单对话框输入拒单理由，回转给分公司
        - 拒收状态的工单可以点击分配=>分配表单

### 工程师（微信端）

1. 工单列表
    -  显示与自己相关的工单（分配、已预约、施工中、逾期），点击工单=>工单详情
    -  工单详情中，可查看预约日志（提议、拒绝、确认、改期等），分配状态可发起预约（对话框指定时间，并加评论）。已预约状态可查看预约时间等，可点击『改期』弹出预约对话框（指定时间并加评论）
2. 施工界面
    - 在首页打开二维码扫描，扫描二维码进入施工界面，工单进入施工中状态
    - 施工界面上有结束，工单进入验收状态
      
---

## 技术说明

1. **密码**: 所有账户使用统一密码 `demo123`（便于演示）
2. **登录方式**: 登录页面提供快速选择下拉框，点击账户即可登录
3. **数据隔离**: 不同角色的用户只能看到有权访问的工单
4. **提权操作**: 管理员账户可进入管理后台进行关联组织操作

---

*Model: moonshotai-cn/kimi-k2.5*
