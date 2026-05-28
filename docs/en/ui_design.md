# JobMaster UI Design Document

This document describes the UI design specifications for JobMaster system on PC and WeChat platforms.

---

## 0. Design Goals & Principles

### 0.1 Product Essence

> **JobMaster = Multi-role collaborative work order flow system (B2B + Operations Dispatch)**

### 0.2 Core Experience Goals

1. **Reduce complexity (multi-role)**
2. **Strengthen state awareness (order flow)**
3. **Improve operation efficiency (high-frequency tasks)**

### 0.3 Design Principles

#### Principle 1: Role-Invisible Design

> **Don't let users perceive "roles", let them perceive "what I can do"**

- Menus organized by "tasks" not "roles"
- Same page, different permissions → control buttons, not different pages
- **One UI + permission control > Multiple UIs**

#### Principle 2: Work Order as Core Object

All design revolves around:
- Work order status
- Work order flow
- Work order responsibility

#### Principle 3: State-Driven UI

> **Buttons = Visualization of State Machine**

Invalid buttons are not allowed (no grayed-out button piles)

#### Principle 4: Service Mode & Reservation Flow

When creating a work order, user can select the service mode:
- **Time window** (default): Engineer arrives during the specified window, no reservation needed
- **Appointment required**: Branch must confirm appointment time before engineer arrives

**Button Conditions**:
- When appointment_type=1 (time window):
  - PC: Hide "Reserve" button
  - Mobile: Skip "Reserve" step, go from "Accept" to "Work"
  - Engineer: Show "Start Work" instead of "Set Appointment"
- When appointment_type=2 (appointment required):
  - Keep existing reservation flow

**Explicit Prompt Rule**:
- Work order detail page must display a visible prompt about the service mode:
  - type=1: Green card "Time window mode: no appointment needed, proceed to site directly"
  - type=2: Blue card "Appointment required: please set appointment time first"
- Prompt remains visible while the work order is active

#### Principle 5: Operation Priority

Each page can only have **1 Primary Action**

| Page | Primary Action |
|------|----------------|
| Order List | Create Order |
| Order Detail | Current state action (e.g., verify) |

---

## 1. Role & Interface Mapping

### 1.1 PC Interface Matrix

| Role | Normal View | Impersonated View | Notes |
|------|-------------|-------------------|-------|
| Super Admin | System Config | No impersonation | Global system config |
| Main Tenant Admin | Tenant Management | No impersonation | Create tenants, contractors |
| Tenant Admin | Tenant Overview | No impersonation | View tenant, branch list, **associate contractor (requires impersonation)** |
| Branch Admin | Order List/Detail | Branch Admin Backend | Create orders, **associate contractor (requires impersonation)**, generate QR, verify |
| Branch Employee | Order List/Detail | No impersonation | Create orders |
| Contractor Admin | Order List/Detail | Contractor Admin Backend | Assign orders, **associate vendor (requires impersonation)** |
| Contractor Employee | Order List/Detail | No impersonation | Assign orders |
| Vendor Admin | Order List/Detail | Vendor Admin Backend | Receive orders, assign engineers |
| Vendor Employee | Order List/Detail | No impersonation | Assign orders |

### 1.2 WeChat Interface Matrix

| Role | Interface | Notes |
|------|-----------|-------|
| Engineer | Order List | View orders assigned to self |
| Engineer | Order Detail | Accept, schedule, arrive, depart |
| Engineer | Work Record | Submit messages, upload photos |
| Vendor Admin | Order List | View orders assigned to vendor |
| Vendor Admin | Order Detail | Accept, reserve schedule, assign engineers |
| Vendor Employee | Order List | View orders assigned to vendor |
| Vendor Employee | Order Detail | Assign engineers only (no reserve, no forward) |

---

## 2. Status Visualization Specification

### 2.1 Status Color System

| Status | Color | Hex | Description |
|--------|-------|-----|-------------|
| PENDING | Gray | #9CA3AF | Pending |
| DISPATCHED | Blue | #3B82F6 | Assigned |
| ACCEPTED | Cyan | #06B6D4 | Accepted, pending confirmation |
| RESERVED | Orange | #F59E0B | Scheduled |
| ARRIVED | Purple | #8B5CF6 | Arrived |
| WORKING | Indigo | #6366F1 | In Progress |
| FINISHED | Green | #10B981 | Completed |
| OBSERVING | Yellow | #EAB308 | Observation Period |
| CLOSED | Black | #1F2937 | Closed |

### 2.2 Status Badge Application Locations

- Order card in list page
- Top status area in detail page
- Timeline nodes
- Dashboard stat cards

---

## 3. PC Design

### 3.1 Main Layout (AppLayout)

**Components**:
- Top bar: Tenant name, current user, read-only watermark
- Sidebar: Navigation menu
- Breadcrumb
- Content area

#### Sidebar Structure (Unified)

**Level 1 Menu**:
```
Dashboard
Orders
Organization
Admin
```

**Dynamically displayed by role**, not different systems.

### 3.2 Dashboard

**Must implement**: Different cards for different roles.

#### Branch Admin

| Card | Content |
|------|---------|
| Today's Orders | Number + trend |
| Pending | PENDING/ACCEPTED count |
| In Progress | RESERVED/ARRIVED/WORKING count |
| Exception Orders | Overdue or rejected count |

#### Contractor

| Card | Content |
|------|---------|
| To Assign | DISPATCHED count |
| Engineer Load | Chart of orders per engineer |

### 3.3 Login Page

**Route**: `/login`

**Features**:
- Username/email input
- Password input
- Remember me checkbox
- Login button
- Forgot password link (TODO)

### 3.4 Tenant Selection Page

**Route**: `/select-tenant`

**Features**:
- Tenant list display (name, logo, role)
- Click to select tenant
- Auto-redirect for single tenant

**Trigger**: `GET /api/v1/auth/my-tenants` returns array length > 1

### 3.5 Order List Page

**Route**: `/orders`

**Layout**:
- Top: Week calendar selector + status filter tabs
- Middle: Order card list
- Bottom: Pagination

#### Order Card (Core Component)

**Card Info**:
- Order number
- Address
- Status (large badge, color-coded)
- Current assignee
- Time (scheduled/created)
- Urgent flag (red corner badge)

**Design Rules**:
- Cards > Tables (more intuitive)
- Tables only for admin backend (users/tenants)

### 3.6 Order Detail Page

**Route**: `/orders/:id`

**Features**:
- Basic info (order number, status, created time)
- Equipment info (type, brand, location)
- Geo location (address, coordinates)
- Timeline (status change times)
- Fee info (labor_fee, material_fee, other_fee)

#### State-Driven Buttons

| Status | Buttons Shown |
|--------|---------------|
| DISPATCHED | [Assign Engineer] [Assign Vendor] |
| ACCEPTED | [Confirm Appointment Time] |
| RESERVED | [Generate QR Code] |
| FINISHED | [Approve] [Disprove] |
| OBSERVING | [Approve] [Disprove] |

### 3.7 Impersonated View Design (High Risk)

#### Global Warning Bar (Like Stripe)

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ You are operating as [Admin]                    [Exit Admin] │
└─────────────────────────────────────────────────────────────────┘
```

#### UI Changes (Must be Obvious)

| Component | Normal View | Impersonated View |
|-----------|-------------|-------------------|
| Top bar | No change | **Red/Purple background** + "Impersonating" indicator |
| Page | Normal | Slightly grayed background |
| Buttons | Normal | "Admin Action" label added |
| Sidebar | Business menu | Admin menu |

#### Operation Confirmation (Double Confirm)

These operations must show confirmation dialog:
- Delete user
- Assign relationship
| Reject acceptance

### 3.8 Create Order Modal

**Features**:
- Equipment type selection
- Brand selection
- Fault category selection
- Fault description (text)
- Photo upload (multiple)
- Urgency toggle

---

## 4. WeChat Design

### 4.1 Design Goal

> **Complete operation within 3 seconds**

### 4.2 WeChat Architecture

- WeChat Mini Program or H5 (using WeChat JS-SDK)
- WeChat auth login (silent openid acquisition)
- Lightweight mobile UI

### 4.3 Engineer Home

**Route**: `/wechat/orders`

**Layout**:
- Top: Today's order count + status stats (horizontal scroll)
- Middle: Order cards (large cards)
- Bottom: Tab navigation (Home / Mine)

### 4.4 Engineer Order Detail

**Route**: `/wechat/orders/:id`

**Design: Step Flow**

```
Accept → Schedule → Arrive → Work → Depart
```

Each step is a **large button** (highlighted, huge, easy to tap).

**Features**:
- Basic order info
- Equipment info
- Geo location (map display)
- **Accept button** (status = DISPATCHED) - Primary action, single large button
- **Schedule time picker** (status = ACCEPTED)
- **Scan to arrive button** (status = RESERVED, calls WeChat scan)
- **Depart button** (status = WORKING)
- Status timeline

### 4.5 Scan Experience Optimization

**Optimizations**:
- Auto-redirect after scan (minimize confirmation pages)
- Auto-get GPS
- Auto-open camera
- Minimize clicks

### 4.6 Work Record Page

**Route**: `/wechat/orders/:id/record`

**Features**:
- Text message input
- Photo upload (multiple, max 9)
- Photo preview and delete
- Submit button

**Upload Strategy**:
- Upload first, submit later (async mode)
- Engineer uploads one by one
- Submit only sends URL array
- Prevents form refill anxiety in basements with poor signal

---

## 5. Impersonation Mechanism

### 5.1 Impersonation Flow

```
1. Normal user clicks "Enter Admin Backend"
2. Call POST /api/v1/auth/impersonate { tenant_id: "uuid" }
3. Server returns new JWT token (contains impersonator_id)
4. Frontend switches token, enters impersonated view
5. Click "Exit Admin Interface"
6. Call POST /api/v1/auth/exit-impersonate
7. Server returns original normal token
```

### 5.2 Impersonated View Changes

| Component | Normal View | Impersonated View |
|-----------|-------------|-------------------|
| Top bar | No change | Dark background + "Impersonating" indicator |
| Sidebar | Business menu | Admin menu |
| Order actions | Business operations | Admin operations |
| Read-only mode | N/A | Not affected by is_impersonated |

---

## 6. UI State Management

### 6.1 Read-only Mode

When `is_impersonated = true`:
- All inputs disabled
- All action buttons hidden
- Data display only

### 6.2 Status Interaction

| Order Status | Branch Actions | Contractor Actions | Vendor Actions | Engineer Actions |
|--------------|----------------|--------------------|-----------------|-------------------|
| PENDING | Create order | Assign order | - | - |
| DISPATCHED | View | Assign engineer/vendor | Assign engineer | Acknowledge |
| ACCEPTED | Confirm time | View | View | Set appointment |
| RESERVED | Generate QR | View | View | Scan arrive |
| ARRIVED | View | View | View | Start work |
| WORKING | View | View | View | Submit record |
| FINISHED | Verify | View | View | - |
| OBSERVING | Verify | View | View | - |
| CLOSED | View | View | View | - |

---

## 7. Component Design Specification

### 7.1 Common Components

| Component | Variants |
|-----------|----------|
| Button | Primary / Secondary / Danger / Outline |
| Tag | Status badges (color-coded) |
| Card | Order card, stat card |
| Timeline | Timeline |
| Modal | Form modal, confirm modal |

### 7.2 Business Components

| Component | Description |
|-----------|-------------|
| OrderCard | Core component, order card |
| OrderTimeline | Order status timeline |
| StatusBadge | Status badge |
| FeeBlock | Fee display area |
| GeofencingAlert | Remote check-in warning |

---

## 8. Visual Style

### 8.1 Recommended Style

> **Modern SaaS Style (Like: Linear / Notion / Stripe)**

### 8.2 Colors

- Primary: Blue (actions) #3B82F6
- Status colors: Multi-color (order states)
- Background: Light gray #F9FAFB
- Danger: Red #EF4444

### 8.3 Layout

- Card-based
- Generous whitespace
- Minimal borders

### 8.4 Details

- Hover animations
- Skeleton loading
- Transition animations (state changes)

---

## 9. Optimization Priority

| Priority | Module | Importance |
|----------|--------|------------|
| 1 | Order UI (list + detail) | ⭐⭐⭐⭐⭐ |
| 2 | State-driven buttons | ⭐⭐⭐⭐ |
| 3 | Impersonation UI warning | ⭐⭐⭐⭐ |
| 4 | Dashboard | ⭐⭐⭐ |
| 5 | WeChat flow optimization | ⭐⭐⭐ |
