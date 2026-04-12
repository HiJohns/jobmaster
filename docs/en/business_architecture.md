# JobMaster Business Logic Architecture Specification (V1.0)

## 1. Core Design Philosophy: Delegated Administration

This system follows the principle of **delegated authority and business autonomy**. Upper-level administrators are responsible for defining rules and creating "managers" for lower-level entities, without directly intervening in the internal administration and specific dispatch details of lower-level entities.

* **Permission Boundary**: Each entity's administrator (Admin) can only manage users within their own entity.
* **Responsibility Alignment**: Whoever creates/manages personnel is responsible for that person's on-site behavior.

---

## 2. Entity Model

Organizations in the system are divided into two camps: **Internal** and **External**:

| Entity Type | Description | Source |
| --- | --- | --- |
| **Tenant HQ** | System owner, business rule maker. | Created by system super admin |
| **Branch** | Physical operation point, work order initiator. | Created by tenant admin |
| **Contractor** | Tenant's contracted general contractor with order acceptance and reassignment rights. | Created by main tenant admin |
| **Supplier** | Professional maintenance service provider that can accept contractor reassignments. | Created by contractor/upper-level supplier |

---

## 3. Organization & Account Hierarchy Logic

### 3.1 Administrative Chain (People Management)

* **Main Tenant Admin**: Creates tenant admins.
* **Tenant Admin**: Creates branch accounts, branch admins, associates contractors.
* **Branch Admin**: Manages branch employees.
* **Contractor Admin**: Manages dispatchers and engineers, associates vendors.
* **Vendor Admin**: Manages dispatchers and engineers.

### 3.2 Business Configuration Permissions (Rule Management)

* **Subcontracting Limit**: Set `max_dispatch_hops` (maximum reassignment hops) by tenant admin in tenant configuration.
* **Delegation Switch**: Tenant can specify whether branches have permission to create contractors.

---

## 4. Network Supply & Work Order Flow Logic (The Network & Hop Model)

The system does not preset permanent parent-child relationships between suppliers, but generates dynamic collaboration based on **work order instances**.

### 4.1 Work Order Hop Control (Hop Count)

To prevent quality loss from infinite subcontracting, a `Hop` mechanism is introduced:

* **$H=0$**: Branch initiates work order to contractor.
* **$H=1$**: Contractor reassigns to Supplier A.
* **$H=2$**: Supplier A reassigns to Supplier B.
* **Circuit Breaker**: When $H \ge max\_dispatch\_hops$, the recipient can only execute (assign to worker), further reassignment is prohibited.

### 4.2 Data Visibility

* **Path Visibility**: All nodes participating in work order flow (recorded via `dispatch_path`) can see the work order.
* **Information Isolation**: Lower-level suppliers cannot view business-sensitive information between upper-level nodes (such as original contract amounts).

---

## 5. Role & Function Matrix (RBAC)

| Role | Identifier | Core Functions |
| --- | --- | --- |
| **Admin (Various Levels)** | ADMIN | CRUD users within own organization, reset member passwords. |
| **Branch Employee** | EMPLOYEE | Initiate work orders, confirm completion, acceptance rating. |
| **Vendor Employee** | VENDOR_EMPLOYEE | Receive work orders, assign workers, execute reassignment (Hop limited). |
| **Engineer** | ENGINEER | **LBS check-in**, photo documentation, fill maintenance report. |

---

## 6. Development Constraints

1. **Code Immutability**: Tenant `code` (Slug) cannot be modified after generation.
2. **Soft Delete**: All business entities (tenants, branches, suppliers) only support status deactivation, physical deletion is strictly prohibited.
3. **Security Baseline**: All passwords must be `bcrypt` hashed, users must change initial password on first login.
4. **LBS Mandatory**: Work order completion logic must validate engineer location distance from branch coordinates.
