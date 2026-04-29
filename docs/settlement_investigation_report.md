# Issue #185 结算用例调查报告

## 1. 概述

Issue #185 设计了 PC 端报价结算功能，涉及三个角色：
- **供应商职员 (VENDOR_EMPLOYEE)**: 提交报价、查看报价列表
- **工程公司职员 (CONTRACTOR_EMPLOYEE)**: 提交报价、审核供应商报价、加利比例计算
- **分公司职员 (BRANCH_ADMIN/EMPLOYEE)**: 审核工程公司报价

## 2. 执行流程

### 2.1 供应商职员
```
工单列表 → 进入已完成工单 → 填写报价表单 → 提交报价
工单列表 → 报价管理 → 查看报价列表（待审核/接受/拒绝）
```

### 2.2 工程公司职员
```
工单列表 → 进入已完成工单 → 填写报价表单 → 提交报价
工单列表 → 报价管理（Tab1） → 查看自己报价
工单列表 → 报价管理（Tab2） → 审核供应商报价 → 加利比例计算 → 提交/拒绝
```

### 2.3 分公司职员
```
工单列表 → 报价管理 → 审核工程公司报价 → 接受/拒绝
```

## 3. 核心数据结构

```typescript
// 报价项目
interface QuotationItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

// 报价单
interface Quotation {
  id: string
  workOrderNo: string
  submitterOrg: string
  submitterRole: string // VENDOR_EMPLOYEE | CONTRACTOR_EMPLOYEE
  items: QuotationItem[]
  totalPrice: number
  status: 'pending' | 'accepted' | 'rejected' | 'processed'
  createdAt: string
}
```

## 4. 关键设计点

| 功能 | 文件 | 说明 |
|------|------|------|
| 报价状态 Badge | WorkOrderCard.tsx | FINISHED/CLOSED 工单显示「未报价」/「已报价」 |
| 报价表单 | WorkOrderDetail.tsx | 动态添加/删除，自动计算小计和总价 |
| 报价列表 | QuotationList.tsx | 角色过滤（Vendor/Contractor/Branch） |
| 报价详情 | QuotationDetail.tsx | 加利比例计算（仅 Contractor 审核 Vendor 报价时） |
| 路由 | router.tsx | /quotations, /quotations/:id |
| 菜单 | Layout.tsx | 报价管理入口（非 Engineer 角色） |

## 5. 加利比例计算公式

```
新总价 = 原总价 × (1 + 加利比例/100)
```

仅在工程公司职员审核供应商报价时显示此字段。

## 6. 状态流转

| 角色 | 发起状态 | 处理后状态 |
|------|---------|---------|
| 供应商 | 待审核 | 接受 / 拒绝 |
| 工程公司（收到供应商报价）| 待处理 | 已处理 / 拒绝 |
| 分公司（收到工程公司报价）| 待处理 | 已处理 / 拒绝 |

## 7. 代码文件索引

| 文件 | 路径 | 功能 |
|------|------|------|
| QuotationList.tsx | frontend/src/pages/ | 报价列表页（角色区分视图） |
| QuotationDetail.tsx | frontend/src/pages/ | 报价详情页（审核加利） |
| WorkOrderDetail.tsx | frontend/src/pages/ | 工单详情报价表单 |
| WorkOrderCard.tsx | frontend/src/components/ | 报价状态 Badge |
| Layout.tsx | frontend/src/components/ | 报价管理菜单 |
| router.tsx | frontend/src/ | 路由注册 |

## 8. 结论

Issue #185 的结算用例设计已完成实现，代码包含：
- 角色权限隔离完整
- 加利比例计算逻辑正确
- 报价状态流转清晰
- Dummy 数据覆盖所有场景

---

*Model: moonshotai-cn/kimi-k2.6*