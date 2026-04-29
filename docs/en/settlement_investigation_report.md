# Issue #185 Settlement Use Cases Investigation Report

## 1. Overview

Issue #185 designs the PC-side quotation settlement functionality, involving three roles:
- **Vendor Employee (VENDOR_EMPLOYEE)**: Submit quotations, view quotation list
- **Contractor Employee (CONTRACTOR_EMPLOYEE)**: Submit quotations, review vendor quotations, calculate markup
- **Branch Admin (BRANCH_ADMIN/EMPLOYEE)**: Review contractor quotations

## 2. Execution Flow

### 2.1 Vendor Employee
```
Work Order List → Enter Completed Work Order → Fill Quotation Form → Submit Quotation
Work Order List → Quotation Management → View Quotation List (Pending/Accepted/Rejected)
```

### 2.2 Contractor Employee
```
Work Order List → Enter Completed Work Order → Fill Quotation Form → Submit Quotation
Work Order List → Quotation Management (Tab1) → View Self Submitted Quotations
Work Order List → Quotation Management (Tab2) → Review Vendor Quotation → Markup Calculation → Submit/Reject
```

### 2.3 Branch Admin
```
Work Order List → Quotation Management → Review Contractor Quotation → Accept/Reject
```

## 3. Core Data Structures

```typescript
// Quotation Item
interface QuotationItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

// Quotation
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

## 4. Key Design Points

| Feature | File | Description |
|---------|------|------------|
| Quotation Status Badge | WorkOrderCard.tsx | FINISHED/CLOSED orders show "Unquoted"/"Quoted" |
| Quotation Form | WorkOrderDetail.tsx | Dynamic add/remove, auto-calculate subtotal and total |
| Quotation List | QuotationList.tsx | Role-based filtering (Vendor/Contractor/Branch) |
| Quotation Detail | QuotationDetail.tsx | Markup calculation (only for Contractor reviewing Vendor) |
| Routes | router.tsx | /quotations, /quotations/:id |
| Menu | Layout.tsx | Quotation menu (non-Engineer role) |

## 5. Markup Calculation Formula

```
New Total Price = Original Total Price × (1 + Markup Percentage/100)
```

This field is only visible when Contractor employee reviews Vendor quotation.

## 6. Status Flow

| Role | Initial Status | Processed Status |
|------|---------------|-----------------|
| Vendor | Pending | Accepted / Rejected |
| Contractor (receiving Vendor quote) | Pending | Processed / Rejected |
| Branch (receiving Contractor quote) | Pending | Processed / Rejected |

## 7. Code File Index

| File | Path | Function |
|------|------|----------|
| QuotationList.tsx | frontend/src/pages/ | Quotation list page (role-based view) |
| QuotationDetail.tsx | frontend/src/pages/ | Quotation detail page (review + markup) |
| WorkOrderDetail.tsx | frontend/src/pages/ | Work order detail quotation form |
| WorkOrderCard.tsx | frontend/src/components/ | Quotation status badge |
| Layout.tsx | frontend/src/components/ | Quotation management menu |
| router.tsx | frontend/src/ | Route registration |

## 8. Conclusion

The settlement use cases in Issue #185 have been fully implemented:
- Role-based permission isolation complete
- Markup calculation logic correct
- Quotation status flow clear
- Dummy data covers all scenarios

---

*Model: moonshotai-cn/kimi-k2.6*