# JobMaster UI Design Document

This document describes the UI design planning for JobMaster system on PC and WeChat.

---

## 1. Role & UI Mapping

### 1.1 PC UI Matrix

| Role | Normal View | Impersonated View | Description |
|------|-------------|-------------------|-------------|
| Super Admin | System Config | N/A | Global system config |
| Main Tenant Admin | Tenant Management | N/A | Create tenants, contractors |
| Tenant Admin | Tenant Overview | N/A | View tenants, branches |
| Store Admin | Order List/Detail | Store Admin Backend | Create orders, generate QR, accept |
| Store Employee | Order List/Detail | N/A | Create orders |
| Contractor Admin | Order List/Detail | Contractor Admin Backend | Assign orders, add vendors |
| Contractor Employee | Order List/Detail | N/A | Assign orders |
| Vendor Admin | Order List/Detail | Vendor Admin Backend | Receive orders, assign engineers |
| Vendor Employee | Order List/Detail | N/A | Assign orders |

### 1.2 WeChat UI Matrix

| Role | UI | Description |
|------|-----|-------------|
| Engineer | Order List | View orders assigned to me |
| Engineer | Order Detail | Accept, reserve time, arrive, depart |
| Engineer | Arrive Scan | Scan work order QR to confirm arrival |
| Engineer | Construction Record | Submit messages, upload photos |

---

## 2. PC Design

### 2.1 Login Page

**Route**: `/login`

**Features**:
- Username/Email input
- Password input
- Remember account checkbox
- Login button
- Forgot password link (TODO)

### 2.2 Tenant Selection Page

**Route**: `/select-tenant`

**Features**:
- Tenant list (name, logo, role)
- Tenant click to select
- Single tenant auto-redirect

**Trigger**: After login, if `GET /api/v1/auth/my-tenants` returns array length > 1

### 2.3 Main Layout (AppLayout)

**Components**:
- Top bar: tenant name, current user, read-only watermark
- Sidebar: navigation menu
- Breadcrumb
- Content area

### 2.4 Super Admin UI

#### 2.4.1 System Config Page

**Route**: `/admin/system`

**Features**:
- System parameter config
- Environment variable management (read-only)
- System log viewing

### 2.5 Main Tenant Admin UI

#### 2.5.1 Tenant Management Page

**Route**: `/admin/tenants`

**Features**:
- Tenant list (name, code, status)
- Create tenant button → Modal
- View tenant details
- Edit tenant
- Delete tenant (soft delete)

#### 2.5.2 Contractor Management Page

**Route**: `/admin/contractors`

**Features**:
- Contractor list (name, code, related tenant)
- Create contractor button → Modal
- View contractor details
- Edit contractor

#### 2.5.3 User Management Page

**Route**: `/admin/users`

**Features**:
- User list (name, email, role, tenant)
- Create user button → Modal
- Search users (by name, email)
- Assign role

### 2.6 Tenant Admin UI

#### 2.6.1 Tenant Overview Page

**Route**: `/tenant/overview`

**Features**:
- Tenant basic info
- Branch list
- Related contractors list

#### 2.6.2 Branch Management Page

**Route**: `/tenant/branches`

**Features**:
- Branch list
- Create branch → Modal
- Branch details (related contractors)
- Assign contractors to branch

### 2.7 Store Admin UI

#### 2.7.1 Normal View: Order List

**Route**: `/orders`

**Features**:
- Week calendar selector
- Status Tabs: Pending, In Progress, Needs Correction, Completed
- Search box (fuzzy search order no., address)
- Order card list
- Create order button

#### 2.7.2 Normal View: Order Detail

**Route**: `/orders/:id`

**Features**:
- Order basic info (no., status, created time)
- Device info (type, brand, location)
- Geo location (address, coordinates)
- Timeline (status change times)
- Fee info (labor_fee, material_fee, other_fee)
- **Generate Arrival QR Code button** (status = RESERVED/ARRIVED)
- **Accept button** (status = FINISHED)
- **Reject button** (status = FINISHED)

#### 2.7.3 Impersonated View: Store Admin Backend

**Route**: `/store-admin`

**Features**:
- Employee list
- Create employee → Modal
- Related contractors list
- Order statistics panel

#### 2.7.4 Create Order Modal

**Features**:
- Device type selection
- Brand selection
- Fault category selection
- Fault description (text)
- Photo upload (multiple)
- Urgency toggle

### 2.8 Store Employee UI

Same as Store Admin normal view, differences:
- No impersonation entry
- No accept button
- No generate QR button

### 2.9 Contractor Admin UI

#### 2.9.1 Normal View: Order List

**Route**: `/orders`

**Features**:
- Order list (assigned to me + transferred to me)
- Status filter
- Order detail

#### 2.9.2 Normal View: Order Detail

**Features**:
- Fee desensitization (hide amounts)
- **Assign order to Engineer button** (status = DISPATCHED/RESERVED)
- **Assign order to Vendor button** (status = DISPATCHED/RESERVED)

#### 2.9.3 Impersonated View: Contractor Admin Backend

**Route**: `/contractor-admin`

**Features**:
- Employee list (employee + engineer)
- Create employee/engineer
- Vendor list (can add external vendors)
- Add vendor search

### 2.10 Vendor Admin UI

#### 2.10.1 Normal View: Order List

**Route**: `/orders`

**Features**:
- Order list (transferred to me)
- Status filter

#### 2.10.2 Normal View: Order Detail

**Features**:
- **Assign order to Engineer button**

#### 2.10.3 Impersonated View: Vendor Admin Backend

**Route**: `/vendor-admin`

**Features**:
- Employee list
- Engineer list
- Create employee/engineer

---

## 3. WeChat Design

### 3.1 WeChat Architecture

- WeChat Mini Program or H5 (using WeChat JS-SDK)
- WeChat auth login (silent)
- Lightweight mobile UI

### 3.2 WeChat Login Page

**Route**: `/wechat/login`

**Features**:
- WeChat auth button
- Auto login (silent)
- Bind existing account (first login)

### 3.3 Engineer Home Page

**Route**: `/wechat/orders`

**Features**:
- Order list (assigned to me)
- Status badges (Reserved/Arrived/Working)
- Order count statistics

### 3.4 Engineer Order Detail Page

**Route**: `/wechat/orders/:id`

**Features**:
- Order basic info
- Device info
- Geo location (map display)
- **Accept button** (status = DISPATCHED)
- **Reserve time picker** (status = DISPATCHED)
- **Scan to Arrive button** (status = RESERVED, use WeChat scan)
- **Departure button** (status = WORKING)
- Status timeline

### 3.5 WeChat Scan Arrive Page

**Route**: `/wechat/arrive/:qrcode`

**Features**:
- Scan result display
- Confirm arrival button
- GPS location (WeChat JSSDK)
- Photo upload (arrival photo)

### 3.6 Engineer Construction Record Page

**Route**: `/wechat/orders/:id/record`

**Features**:
- Text message input
- Photo upload (multiple, max 9)
- Photo preview and delete
- Submit button

### 3.7 WeChat Common Components

- Bottom navigation: Home, Mine
- Navigation bar: Back button + Title
- Loading indicator
- Error Toast

---

## 4. Impersonation Mechanism

### 4.1 Impersonation Flow

```
1. Normal user clicks "Enter Admin Backend"
2. Call POST /api/v1/auth/impersonate
3. Server returns new JWT token (contains impersonator_id)
4. Frontend switches token, enters impersonated view
5. Click "Exit Admin Interface"
6. Call POST /api/v1/auth/exit-impersonate
7. Server returns original normal token
```

### 4.2 UI Changes After Impersonation

| Component | Normal View | Impersonated View |
|-----------|-------------|-------------------|
| Top bar | No change | Shows "Impersonating" indicator |
| Sidebar | Business menu | Admin menu |
| Order actions | Business operations | Admin operations |
| Read-only mode | N/A | Not affected by is_impersonated |

---

## 5. UI State Management

### 5.1 Read-only Mode

When `is_impersonated = true`:
- All inputs disabled
- All action buttons hidden
- Data display only

### 5.2 Status Interaction

| Order Status | Store Actions | Contractor Actions | Vendor Actions | Engineer Actions |
|--------------|---------------|--------------------|-----------------|-------------------|
| PENDING | Create order | Assign order | - | - |
| DISPATCHED | View | Assign engineer/vendor | Assign engineer | Accept |
| RESERVED | Generate QR | View | View | Scan arrive |
| ARRIVED | View | View | View | Start work |
| WORKING | View | View | View | Submit construction record |
| FINISHED | Accept | View | View | - |
| OBSERVING | Accept | View | View | - |
| CLOSED | View | View | View | - |