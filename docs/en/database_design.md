# JobMaster Database Design Document

This document describes the database structure design for the JobMaster system. Note: User management is handled by an external IAM system, and local storage only contains user mapping information.

---

## 1. Core Design Principles

- **User Management External**: User authentication is handled by the IAM system, local storage only uses `iam_sub` for association
- **Tenant Isolation**: All business tables implement multi-tenant isolation through `tenant_id`
- **Audit Trail**: Key operations are recorded in audit logs
- **JSONB Storage**: Flexible fields use JSONB storage

---

## 2. Table Structures

### 2.1 tenants (Tenant Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Tenant name |
| code | VARCHAR(50) | Tenant code (unique) |
| logo_url | VARCHAR(500) | Logo URL |
| status | SMALLINT | Status: 0-disabled 1-enabled |
| max_hops | SMALLINT | Max hops (set by tenant admin, default 3) |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Update time |
| deleted_at | TIMESTAMP | Soft delete time |

**Indexes**:
- `idx_tenant_code`: code

---

### 2.2 organizations (Organization Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant ID |
| parent_id | UUID | Parent organization ID (for tree structure) |
| name | VARCHAR(100) | Organization name |
| code | VARCHAR(50) | Organization code |
| org_type | SMALLINT | Type: 1-HQ 2-Branch 3-Contractor 4-Vendor |
| contact_phone | VARCHAR(20) | Contact phone |
| contact_email | VARCHAR(100) | Contact email |
| address | VARCHAR(500) | Address |
| status | SMALLINT | Status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Update time |
| deleted_at | TIMESTAMP | Soft delete time |

**Indexes**:
- `idx_org_tenant`: (tenant_id, deleted_at)
- `idx_org_parent`: (parent_id, deleted_at)
- `idx_org_code`: (tenant_id, code, deleted_at)

---

### 2.3 user_mappings (User Mapping Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | BIGSERIAL | Primary key |
| tenant_id | UUID | Tenant ID |
| org_id | UUID | Organization ID |
| iam_sub | VARCHAR(100) | IAM user identifier (from IAM system) |
| email | VARCHAR(100) | Email (for placeholder activation) |
| display_name | VARCHAR(100) | Display name |
| phone | VARCHAR(20) | Phone |
| role | VARCHAR(20) | Role: SUPER_ADMIN, MAIN_ADMIN, TENANT_ADMIN, BRANCH_ADMIN, EMPLOYEE, CONTRACTOR_ADMIN, CONTRACTOR_EMPLOYEE, ENGINEER |
| is_shadow | BOOLEAN | Whether placeholder user |
| status | SMALLINT | Status: 0-disabled 1-enabled |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Update time |
| deleted_at | TIMESTAMP | Soft delete time |

**Indexes**:
- `idx_user_tenant_iam_sub`: (tenant_id, iam_sub) - Composite unique
- `idx_user_email`: (email, deleted_at)
- `idx_user_org`: (org_id, deleted_at)

**Notes**:
- Users are managed by the IAM system, local storage only maintains mapping relationships
- User information is synchronized from IAM on first login
- Empty `iam_sub` indicates placeholder user

---

### 2.4 work_orders (Work Order Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant ID |
| order_no | VARCHAR(30) | Work order number (unique) |
| status | SMALLINT | Status: 1-PENDING 2-DISPATCHED 3-ACCEPTED 4-RESERVED 5-WORKING 6-FINISHED 7-CLOSED |
| store_id | UUID | Branch ID (organization ID) |
| vendor_id | UUID | Vendor ID (organization ID, nullable) |
| engineer_id | UUID | Engineer ID (user ID, nullable) |
| category_path | VARCHAR(100) | Category path (e.g., Interior/Showroom/Fire Door) |
| brand_name | VARCHAR(50) | Brand name |
| info | JSONB | Extended info (fault description, photo array, is urgent, etc.) |
| address_detail | VARCHAR(500) | Detailed address |
| coordinates | JSONB | Coordinates: {lat, lng} |
| labor_fee | DECIMAL(10,2) | Labor fee |
| material_fee | DECIMAL(10,2) | Material fee |
| other_fee | DECIMAL(10,2) | Other fees |
| appointed_at | TIMESTAMP | Appointed time |
| arrived_at | TIMESTAMP | Arrival time |
| started_at | TIMESTAMP | Start time |
| finished_at | TIMESTAMP | Finish time |
| closed_at | TIMESTAMP | Close time |
| observing_deadline | TIMESTAMP | Observation period deadline |
| created_by | BIGINT | Creator ID (user mapping table) |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Update time |
| deleted_at | TIMESTAMP | Soft delete time |

**Indexes**:
- `idx_order_tenant`: (tenant_id, deleted_at)
- `idx_order_status`: (tenant_id, status)
- `idx_order_store`: (tenant_id, store_id)
- `idx_order_vendor`: (tenant_id, vendor_id)
- `idx_order_engineer`: (tenant_id, engineer_id)
- `idx_order_appointed`: (tenant_id, appointed_at)
- `idx_order_no`: (order_no) - Unique
- `idx_order_coordinates`: coordinates - GIN index

---

### 2.5 work_order_logs (Work Order Audit Log Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | BIGSERIAL | Primary key |
| order_id | UUID | Work order ID |
| action | VARCHAR(50) | Action type |
| operator_id | BIGINT | Operator ID |
| details | JSONB | Detailed information |
| created_at | TIMESTAMP | Creation time |

**Indexes**:
- `idx_log_order`: (order_id, created_at)

**Action Constants**:
- `CREATE`: Create work order
- `DISPATCH`: Dispatch work order
- `ACCEPT`: Accept work order
- `REJECT`: Reject work order
- `RESERVE`: Reserve time
- `GENERATE_QR`: Generate QR code
- `ARRIVE`: Arrival confirmation
- `RECORD`: Construction record
- `FINISH`: Finish work
- `ACCEPTED`: Acceptance passed
- `REJECTED`: Acceptance failed
- `ASSIGN_ENGINEER`: Assign engineer

---

### 2.6 work_records (Construction Record Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | BIGSERIAL | Primary key |
| order_id | UUID | Work order ID |
| engineer_id | BIGINT | Engineer ID |
| record_type | VARCHAR(20) | Record type: MESSAGE/PHOTO |
| content | TEXT | Text content (optional) |
| photos | JSONB | Photo URL array |
| location | JSONB | Location info: {lat, lng} |
| created_at | TIMESTAMP | Creation time |

**Indexes**:
- `idx_record_order`: (order_id, created_at)

---

### 2.7 qrcode_tokens (QR Code Token Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | BIGSERIAL | Primary key |
| order_id | UUID | Work order ID |
| token | VARCHAR(64) | Token (unique) |
| status | SMALLINT | Status: 0-unused 1-used |
| expired_at | TIMESTAMP | Expiration time |
| created_at | TIMESTAMP | Creation time |

**Indexes**:
- `idx_qr_token`: (token) - Unique

---

### 2.8 branch_contractors (Branch-Contractor Relation Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | BIGSERIAL | Primary key |
| branch_id | UUID | Branch ID |
| contractor_id | UUID | Contractor ID |
| created_at | TIMESTAMP | Creation time |

**Indexes**:
- `idx_bc_branch`: (branch_id)
- `idx_bc_contractor`: (contractor_id)

---

### 2.9 vendor_contracts (Vendor-Contractor Relation Table)

| Column Name | Type | Description |
|-------------|------|-------------|
| id | BIGSERIAL | Primary key |
| vendor_id | UUID | Vendor ID |
| contractor_id | UUID | Contractor ID |
| created_at | TIMESTAMP | Creation time |

**Indexes**:
- `idx_vc_vendor`: (vendor_id)
- `idx_vc_contractor`: (contractor_id)

---

## 3. State Machine Definition

### Work Order State Flow

```
PENDING (1) → DISPATCHED (2) → ACCEPTED (3) → RESERVED (4) → WORKING (5) → FINISHED (6) → CLOSED (7)
```

### Reject Return Flow

```
DISPATCHED (2) --reject--> PENDING (1)
```

### Acceptance Failed Return Flow

```
FINISHED (6) --reject--> DISPATCHED (2)
```

---

## 4. Permission Matrix

| Role | Can Create Tenant | Can Create Org | Can Create Order | Can Assign Order | Can Execute | Can Accept | Can Associate Org |
|------|-------------------|-----------------|-------------------|------------------|--------------|------------|-------------------|
| SUPER_ADMIN | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MAIN_ADMIN | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| TENANT_ADMIN | ❌ | ✅ (Branch) | ❌ | ❌ | ❌ | ❌ | ✅ (requires impersonation) |
| BRANCH_ADMIN | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ (requires impersonation) |
| EMPLOYEE | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| CONTRACTOR_ADMIN | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (requires impersonation) |
| CONTRACTOR_EMPLOYEE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| ENGINEER | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| VENDOR_ADMIN | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (requires impersonation) |
| VENDOR_EMPLOYEE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

**Association Notes**:
- Tenant Admin: Assign contractors to branches (requires impersonation)
- Branch Admin: Assign contractors to own branch (requires impersonation)
- Contractor Admin: Add vendors to contractor (requires impersonation)
- Vendor Admin: Can perform vendor-related association (requires impersonation)

---

## 5. Data Consistency

### Soft Delete
- All business tables use `deleted_at` field for soft delete
- Queries automatically filter deleted records (GORM Scopes)

### Tenant Isolation
- All queries must include `tenant_id` condition
- Automatic tenant filtering using GORM Scopes

### Audit Logs
- Key work order operations are recorded in `work_order_logs`
- Messages and photos during construction are recorded in `work_records`