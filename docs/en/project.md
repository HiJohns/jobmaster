# JobMaster - Project Constitution

## 1. Business Vision & Roles

### 1.1 Project Positioning
JobMaster is an intelligent work order management system for chain maintenance scenarios, dedicated to solving three core pain points in the maintenance process:
- **Progress Opacity**: Information gaps in multi-party collaboration, inability to track work order status in real-time
- **False Arrival**: Lack of effective arrival verification mechanism
- **Quality Disputes**: Subsequent disputes caused by "fix and leave" approach

### 1.2 Five-Party Collaboration Model

| Role | Identifier | Core Responsibilities |
|------|------------|----------------------|
| Brand HQ | Brand HQ | Global configuration, standard setting, cross-region coordination |
| Store | Store | Repair request initiation, on-site cooperation, final acceptance |
| Main Contractor | Main Contractor | Work order assessment, vendor assignment, quality control |
| Vendor | Vendor | Specific execution, arrival check-in, construction records |
| Engineer | Engineer | On-site operations, progress reporting, departure confirmation |

### 1.3 Core Value
Achieve full traceability of maintenance processes through digital means, establish trust mechanisms, and reduce communication costs.

---

## 2. Core State Machine

### 2.1 Forward Flow Chain

```
PENDING (Repair Request)
    ↓
DISPATCHED (Assigned)
    ↓
RESERVED (Scheduled)
    ↓
ARRIVED (Arrival Confirmed)
    ↓
WORKING (In Progress)
    ↓
FINISHED (Departure Confirmed)
    ↓
OBSERVING (Observation Period)
    ↓
CLOSED (Accepted / Enter Manual Settlement)
```

### 2.2 State Definitions

| State | English | Trigger Condition | Data Changes |
|-------|---------|-------------------|--------------|
| Repair Request | PENDING | Store submits repair ticket | Create work order, record equipment info, urgency level |
| Assigned | DISPATCHED | Main Contractor assigns vendor | Bind Vendor/Engineer |
| Scheduled | RESERVED | Vendor confirms available time | Record scheduled_at |
| Arrival Confirmed | ARRIVED | Engineer GPS check-in + photo verification | Record arrived_at, location |
| In Progress | WORKING | Engineer starts work | Record started_at |
| Departure Confirmed | FINISHED | Engineer submits departure | Record finished_at, work summary |
| Observation Period | OBSERVING | System automatically enters | Set observing_deadline |
| Closed | CLOSED | Store accepts work | Record closed_at, settlement amount |

### 2.3 Rollback Logic (Critical)

**Acceptance Failed Scenario**:
- Trigger: OBSERVING phase, Store clicks "Acceptance Failed"
- Target State: **DISPATCHED** (NOT PENDING)
- Side Effects:
  - Notify Main Contractor for reassessment
  - Record rollback reason
  - Preserve historical work records (for traceability)

---

## 3. Technical Constraints

### 3.1 Backend Stack

| Component | Choice | Constraint Notes |
|-----------|--------|------------------|
| Framework | Go + Gin | RESTful API, strictly follow Uber Go Style |
| ORM | GORM | PostgreSQL database |
| Data Storage | JSONB | `info` field must contain: equipment details, urgency flag |
| Migration | goose / golang-migrate | Version-controlled |

### 3.2 Frontend Stack

| Component | Choice | Constraint Notes |
|-----------|--------|------------------|
| Framework | React 18 + TypeScript | Strict typing, disable `any` |
| UI Library | Ant Design 5.x | Unified component theme |
| State Management | Zustand / React Query | Server state separation |
| Special Mode | is_impersonated | **All UI must support read-only mode** |

### 3.3 Database Design Constraints

```go
// Order table core fields example
type Order struct {
    ID          uint64         `gorm:"primaryKey"`
    Status      OrderStatus    `gorm:"index"`      // State machine field
    Info        datatypes.JSON `gorm:"type:jsonb"` // Equipment details, urgency flag, etc.
    StoreID     uint64         `gorm:"index"`      // Store foreign key
    VendorID    *uint64        `gorm:"index"`      // Vendor foreign key
    EngineerID  *uint64        `gorm:"index"`      // Engineer foreign key
    CreatedAt   time.Time
    UpdatedAt   time.Time
}
```

### 3.4 Settlement Logic (Current Version)

⚠️ **Important**: This version does not implement automatic amount calculation
- Settlement amount is **manually entered** by Main Contractor before CLOSED
- Only record amount field, no business logic validation
- Settlement flow iteration in V2

---

## 4. Code Standards

### 4.1 General Principles
- **12-Factor App**: Stateless, config via environment, centralized control plane
- **Google Engineering**: Readability > cleverness, explicit error handling
- **Language Standards**: Uber Go Style / Airbnb React Style

### 4.2 Error Handling (Go)
```go
// ✅ Correct: Provide full context
return fmt.Errorf("failed to dispatch order %d to vendor %d: %w", orderID, vendorID, err)

// ❌ Wrong: Swallow error
if err != nil {
    log.Println(err)
    return nil
}
```

### 4.3 Component Design (React)
```tsx
// ✅ Correct: Decouple UI from data fetching
const OrderCard: React.FC<{ order: Order; isReadOnly: boolean }> = ({ order, isReadOnly }) => {
  // Pure UI rendering logic
};

// Data fetching handled in container component
const OrderContainer: React.FC = () => {
  const { data } = useOrderQuery();
  return <OrderCard order={data} isReadOnly={isImpersonated} />;
};
```

---

## 5. Security Red Lines

### 5.1 Data Protection
- ⚠️ **NEVER delete `beacon.db`**: Contains critical business data
- All database migrations must be rollbackable
- Sensitive production configs must be environment variables

### 5.2 API Security
- All endpoints must validate permissions (five-party role isolation)
- Sensitive operations require audit logging

---

## 6. Task Board

### [DONE]
- [x] Project structure initialization
  - Create docs/blog.md file
  - Establish Go project directory: cmd/, internal/, pkg/
  - Establish frontend directory: frontend/
  - Establish API directory: api/
- [x] Dependency management initialization
  - Execute go mod init jobmaster
  - Install Go dependencies: gin, gorm, pgx
  - Initialize frontend package.json
  - Install frontend dependencies: Ant Design, Zustand
- [x] Organizational model design
  - Five-party role data model definitions (internal/models/)
  - Permission matrix design (pkg/permissions/)
  - Role association relationships (Store ↔ Vendor ↔ Engineer)
- [x] Database infrastructure (2026-03-08)
  - PostgreSQL connection pool initialization (sync.Once thread-safe)
  - Organization models (HQ, Store, MainContractor, Vendor)
  - User models (RBAC roles and permissions)
- [x] User authentication and permission system (2026-03-08)
  - bcrypt password hashing and verification
  - JWT Token generation and validation (environment variable secret key)
  - Login API and Token refresh
  - Auth/Impersonation/Tenant middleware
  - Unified API response format
- [x] Organizational structure and user management API (2026-03-08)
  - Organization creation, listing, tree queries (BrandHQ/MainContractor)
  - User CRUD, pagination queries (BrandHQ/MainContractor)
  - Role permission validation and tenant isolation
  - Model directory refactoring (models → model)
- [x] WorkOrder core model and state machine (2026-03-08)
  - Basic fields: ID (UUID), OrderNo (human-readable), StoreID, CreatedBy, TenantID, Status (int)
  - JSONB extension: info field storing repair description, equipment details, photo URLs, is_urgent flag
  - State machine service: TransitTo() method, Map transition whitelist, ErrInvalidStateTransition
  - GORM Scopes: TenantScope, StoreScope, StatusScope enforcing data isolation
  - Database migration: DDL, GIN index (jsonb_path_ops), composite indexes
- [x] Order number generator (pkg/utils/orderno.go)
  - Format: WO-YYYYMMDD-C{OrgID}-XXXX
  - crypto/rand concurrent-safe random number generation
- [x] WorkOrder API implementation
  - Store repair request (STORE role): create work order, status init PENDING, location recording
  - WorkOrder list query: role view isolation (STORE/HQ/MAIN_CONTRACTOR), pagination and filtering
  - Dispatch work order (MAIN_CONTRACTOR): PENDING → DISPATCHED
  - Accept/Reject (VENDOR/ENGINEER): DISPATCHED → RESERVED/PENDING
  - Audit logs: append-only JSONB array pattern (evidence chain)
- [x] WorkOrder Model & DDL Upgrade (2026-03-09)
  - Multi-level category: CategoryPath, BrandName
  - Fee fields: LaborFee, MaterialFee, OtherFee (DECIMAL)
  - Appointment time: AppointedAt + index
  - Location: AddressDetail, Coordinates (JSONB + GIN index)
  - GPSLocation implements Valuer/Scanner interfaces
  - Log Action constants
- [x] Task List API (2026-03-09)
  - ListMyTasks: calendar filtering, fuzzy search, pagination
  - GetTaskStatistics: count by status
  - Permission validation and error handling fixes
- [x] WorkOrder Detail API (2026-03-09)
  - GetWorkOrderDetail: full data, role-based views
  - buildWorkOrderDetail: fee masking (hidden for STORE role)
  - extractWorkRecords: extract work records from logs
- [x] Execution Action Service & API (2026-03-09)
  - Reserve: set appointment time, DISPATCHED → RESERVED
  - Arrive: GPS check-in, RESERVED → ARRIVED
  - Finish: complete work, WORKING → FINISHED, fee recording
  - Ownership validation: verify engineer/vendor assignment
  - Fee range validation: 0-999999
- [x] Project Basic Configuration (2026-03-10)
  - Makefile: build, run, test, docker-up, docker-down, lint, fmt commands
  - docker-compose.yaml: PostgreSQL 15 + Redis 7 development environment
  - config.yaml.example: local development config template
  - cmd/api/main.go: application entry, database init, AutoMigrate, Seeder
  - internal/db/seed.go: default HQ organization and super admin initialization
  - Security fixes: remove hardcoded secrets, password masking
- [x] Test Framework (2026-03-10)
  - Go HTTP Test Framework (tests/httptest)
    - main_test.go: DB init, ExecuteRequest helper, transaction rollback
    - auth_test.go: login tests, token interception tests
  - Python Test Environment (tests/pytest)
    - requirements.txt: pytest, requests dependencies
    - conftest.py: base_url and admin_token fixtures, auto cleanup
    - test_basic.py: /health tests, parameterized test scenarios
  - Makefile Test Commands
    - make httptest: Run Go HTTP integration tests
    - make pytest: Run Python integration tests
    - make check: Run all tests

### [READY]
- [x] Upgrade global theme and style system: colors, card layout, sidebar dark mode.
- [x] Refactor login page: 400px width, glassmorphism, loading animation, breath border.
- [x] Optimize WeekCalendar and WorkOrderCard: scale animation, thumbnail preview, left status bar.
- [x] Unify global AppLayout architecture: merge top bar, breadcrumbs, nested routes.
- [x] Fix color contrast and UUID display: semantic tenant name, hide raw IDs.


### [WIP]
*None*

### [TODO]
*None*

---

## 7. Documentation Synchronization

This document is the Chinese master document, English translation located at `docs/en/project.md`.
**All updates must be synchronized in both languages**.

---

*Last Updated: 2026-03-09*
*Version: 1.0.0*
