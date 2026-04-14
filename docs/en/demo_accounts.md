# JobMaster Demo Accounts - Demo Account List

## Overview
This document lists all pre-seeded accounts for prototype demonstration. Password for all accounts: `demo123`

---

## User Account List

### Branch (Branch 1: Branch 001)

| Account | Password | Role | Use Case |
|---------|----------|------|----------|
| admin@branch1 | demo123 | BRANCH_ADMIN (Branch Manager) | Use Case 04, 05 |
| employee1@branch1 | demo123 | EMPLOYEE (Branch Staff) | Use Case 05 |
| employee2@branch1 | demo123 | EMPLOYEE (Branch Staff) | - |

### Contractor (Contractor 1: Contractor A)

| Account | Password | Role | Use Case |
|---------|----------|------|----------|
| admin@contractor1 | demo123 | CONTRACTOR_ADMIN (Contractor Manager) | Use Case 06 |
| employee1@contractor1 | demo123 | CONTRACTOR_EMPLOYEE (Contractor Staff) | Use Case 07 |
| engineer1@contractor1 | demo123 | ENGINEER | Use Case 10 |
| engineer2@contractor1 | demo123 | ENGINEER | - |

### Vendor (Vendor 1: Vendor X)

| Account | Password | Role | Use Case |
|---------|----------|------|----------|
| admin@vendor1 | demo123 | VENDOR_ADMIN (Vendor Manager) | Use Case 08 |
| employee1@vendor1 | demo123 | VENDOR_EMPLOYEE (Vendor Staff) | Use Case 09 |
| engineer1@vendor1 | demo123 | ENGINEER | Use Case 10 |
| engineer2@vendor1 | demo123 | ENGINEER | - |

### Contractor (Contractor 2: Contractor B) - As External Vendor

| Account | Password | Role | Use Case |
|---------|----------|------|----------|
| admin@contractor2 | demo123 | CONTRACTOR_ADMIN (Contractor Manager) | Use Case 06 |
| employee1@contractor2 | demo123 | CONTRACTOR_EMPLOYEE | - |
| engineer1@contractor2 | demo123 | ENGINEER | - |
| engineer2@contractor2 | demo123 | ENGINEER | - |

---

## Organization Structure

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

## Association Relationships

- **Branch 001** → Associated with **Contractor A**
- **Contractor A** → Associated with external vendor **Contractor B** (Vendor X)

---

## Use Case Execution Order

| Order | Account | Demo Content |
|-------|---------|--------------|
| 1 | employee1@branch1 | Use Case 05: Create work order, view work order list |
| 2 | admin@contractor1 | Use Case 06: Admin view, dispatch work orders, add vendor |
| 3 | employee1@contractor1 | Use Case 07: Assign work orders to engineers |
| 4 | admin@vendor1 | Use Case 08: Admin view, dispatch work orders |
| 5 | employee1@vendor1 | Use Case 09: Assign work orders to engineers |
| 6 | engineer1@contractor1 | Use Case 10: Acknowledge → Reserve → Arrive → Work → Finish |

---

## Pre-seeded Work Order Data

| Order No | Current Status | Created By | Assigned To |
|----------|----------------|------------|-------------|
| WO-20260413-C1-0001 | PENDING | employee1@branch1 | - |
| WO-20260413-C1-0002 | PENDING | employee1@branch1 | - |
| WO-20260413-C1-0003 | DISPATCHED | employee1@branch1 | Contractor A |
| WO-20260413-C1-0004 | DISPATCHED | employee1@branch1 | Contractor A |
| WO-20260413-C1-0005 | DISPATCHED | employee1@branch1 | Contractor B (Vendor) |
| WO-20260413-C1-0006 | ACCEPTED | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0007 | RESERVED | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0008 | WORKING | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0009 | FINISHED | employee1@branch1 | Contractor A → Engineer1 |
| WO-20260413-C1-0010 | CLOSED | employee1@branch1 | Contractor A → Engineer1 |

---

## Technical Notes

1. **Password**: All accounts use unified password `demo123` (for easy demo)
2. **Login Method**: Login page provides quick-select dropdown, click account to login
3. **Data Isolation**: Different roles can only see work orders they have access to
4. **Impersonation**: Admin accounts can enter admin view for association operations

---

*Model: moonshotai-cn/kimi-k2.5*