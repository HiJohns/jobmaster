# API Test Coverage Investigation Report

> Generated: 2026-03-19
> Issue: #58
> Version: v2.0.5

---

## 1. Overview

### 1.1 Objective
Add comprehensive `httptest`-based unit tests for all JobMaster API packages to ensure coverage of all edge cases and logic branches.

### 1.2 Test Scope
| Module | File | Current Status |
|--------|------|----------------|
| Auth | `internal/api/auth.go` | ⚠️ Partial Coverage |
| Work Order | `internal/api/workorder.go` | ❌ Not Covered |
| Device | `internal/api/device.go` | ❌ Not Covered |
| Organization | `internal/api/organization.go` | ❌ Not Covered |
| Tenant | `internal/api/tenant.go` | ❌ Not Covered |
| User | `internal/api/user.go` | ❌ Not Covered |
| Location | `internal/api/location.go` | ❌ Not Covered |
| Lease | `internal/api/lease.go` | ❌ Not Covered |
| Repair | `internal/api/repair.go` | ❌ Not Covered |

### 1.3 Existing Test Infrastructure
- Test Framework: `github.com/stretchr/testify`
- HTTP Testing: `net/http/httptest`
- Router Testing: `github.com/gin-gonic/gin`
- Test Location: `tests/httptest/`

---

## 2. Existing Test Pattern Analysis

### 2.1 Test Infrastructure (main_test.go)

```go
// Test Helper Functions
ExecuteRequest(t, method, url, body, headers)
ExecuteRequestWithAuth(t, method, url, body, token)
ParseResponse(w, v)
BeginTransaction(t) // Transaction rollback isolation
```

### 2.2 Covered Scenarios (auth_test.go)

| Test Case | Type |
|-----------|------|
| TestLogin_Success | Success Path |
| TestLogin_InvalidCredentials | Error Handling |
| TestLogin_InvalidUsername | Edge Case |
| TestLogin_MissingFields | Required Fields |
| TestProtectedRoute_InvalidToken | Auth Boundary |
| TestProtectedRoute_MissingToken | Auth Boundary |
| TestHealthEndpoint | Public Endpoint |
| TestRefreshToken_Success | Success Path |
| TestRefreshToken_InvalidToken | Error Handling |

### 2.3 Test Coverage Gaps

```
auth.go         ████████░░  60%
workorder.go    ░░░░░░░░░  0%
device.go       ░░░░░░░░░  0%
organization.go ░░░░░░░░░  0%
user.go         ░░░░░░░░░  0%
location.go     ░░░░░░░░░  0%
lease.go        ░░░░░░░░░  0%
repair.go       ░░░░░░░░░  0%
```

---

## 3. Detailed Test Plan

### 3.1 Auth Module (auth_test.go) - Extension

#### 3.1.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| AUTH-01 | Login success | Success Path | P0 |
| AUTH-02 | User not found | Error Handling | P0 |
| AUTH-03 | Wrong password | Error Handling | P0 |
| AUTH-04 | User disabled | Business Logic | P0 |
| AUTH-05 | Missing username | Required Fields | P0 |
| AUTH-06 | Missing password | Required Fields | P0 |
| AUTH-07 | Username too short (<3) | Edge Case | P1 |
| AUTH-08 | Password too short (<6) | Edge Case | P1 |
| AUTH-09 | Username too long (>100) | Edge Case | P1 |
| AUTH-10 | Password too long (>128) | Edge Case | P1 |
| AUTH-11 | Empty request body | Edge Case | P1 |
| AUTH-12 | Token refresh success | Success Path | P0 |
| AUTH-13 | Token refresh invalid | Error Handling | P0 |
| AUTH-14 | Mock login (OIDC) | Success Path | P1 |
| AUTH-15 | OIDC callback failure | Error Handling | P1 |

#### 3.1.2 Mock Strategy

```go
// Use existing DB connection + TestMain
// Consider adding Mock auth middleware
```

---

### 3.2 Work Order Module (workorder_test.go) - New

#### 3.2.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| WO-01 | Create work order success | Success Path | P0 |
| WO-02 | Create missing required fields | Required Fields | P0 |
| WO-03 | Create with empty description | Edge Case | P1 |
| WO-04 | List work orders (pagination) | Pagination | P0 |
| WO-05 | List work orders (status filter) | Filtering | P0 |
| WO-06 | List work orders (date range) | Filtering | P1 |
| WO-07 | Get single work order success | Success Path | P0 |
| WO-08 | Get non-existent work order | Error Handling | P0 |
| WO-09 | Dispatch success | Success Path | P0 |
| WO-10 | Dispatch to invalid vendor | Error Handling | P0 |
| WO-11 | Accept success | Success Path | P0 |
| WO-12 | Accept with invalid time | Edge Case | P1 |
| WO-13 | Reject success | Success Path | P0 |
| WO-14 | Reject without reason | Required Fields | P1 |
| WO-15 | Reserve success | Success Path | P0 |
| WO-16 | Arrive confirmation success | Success Path | P0 |
| WO-17 | GPS validation valid | Business Logic | P0 |
| WO-18 | GPS validation invalid | Business Logic | P0 |
| WO-19 | Finish success | Success Path | P0 |
| WO-20 | Finish missing description | Required Fields | P1 |
| WO-21 | Finish with fees | Business Logic | P1 |
| WO-22 | Hop count limit triggered | Business Logic | P0 |
| WO-23 | Close work order | Success Path | P0 |
| WO-24 | Invalid state transition | Edge Case | P1 |

#### 3.2.2 Test Helper Functions

```go
// Recommended additions
func loginAsAdmin() string
func loginAsEngineer() string
func createTestWorkOrder() WorkOrder
func getTestVendorID() uuid.UUID
```

---

### 3.3 Device Module (device_test.go) - New

#### 3.3.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| DEV-01 | Create device success | Success Path | P0 |
| DEV-02 | Create with duplicate SN | Business Logic | P0 |
| DEV-03 | Create missing SN | Required Fields | P0 |
| DEV-04 | Create missing name | Required Fields | P0 |
| DEV-05 | Create missing OrgID | Required Fields | P0 |
| DEV-06 | Create with invalid OrgID | Error Handling | P0 |
| DEV-07 | Create with invalid LocationID | Error Handling | P0 |
| DEV-08 | Get device by SN success | Success Path | P0 |
| DEV-09 | Get non-existent device by SN | Error Handling | P0 |
| DEV-10 | Generate device QR code | Business Logic | P1 |
| DEV-11 | List devices (pagination) | Pagination | P0 |
| DEV-12 | List devices (Org filter) | Filtering | P0 |
| DEV-13 | List devices (status filter) | Filtering | P0 |
| DEV-14 | Update device success | Success Path | P0 |
| DEV-15 | Delete device success | Success Path | P0 |
| DEV-16 | Delete non-existent device | Error Handling | P0 |

---

### 3.4 Organization Module (organization_test.go) - New

#### 3.4.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| ORG-01 | Create organization success (BrandHQ) | Success Path | P0 |
| ORG-02 | Create with insufficient permissions | Permission | P0 |
| ORG-03 | Create with invalid type | Business Logic | P0 |
| ORG-04 | Create missing required fields | Required Fields | P0 |
| ORG-05 | Get org tree (cache hit) | Caching | P0 |
| ORG-06 | Get org tree (cache miss) | Caching | P0 |
| ORG-07 | Update organization success | Success Path | P0 |
| ORG-08 | Update with insufficient permissions | Permission | P0 |
| ORG-09 | Get single organization success | Success Path | P0 |
| ORG-10 | Get non-existent organization | Error Handling | P0 |

---

### 3.5 User Module (user_test.go) - New

#### 3.5.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| USR-01 | Create user success | Success Path | P0 |
| USR-02 | Create with insufficient permissions | Permission | P0 |
| USR-03 | Create with password too short | Edge Case | P1 |
| USR-04 | Create with invalid role | Business Logic | P0 |
| USR-05 | List users (pagination) | Pagination | P0 |
| USR-06 | List users (role filter) | Filtering | P0 |
| USR-07 | List users (org filter) | Filtering | P0 |
| USR-08 | Get single user success | Success Path | P0 |
| USR-09 | Update user success | Success Path | P0 |
| USR-10 | Update user status | Business Logic | P0 |
| USR-11 | Delete user success | Success Path | P0 |
| USR-12 | Delete last admin | Business Logic | P0 |

---

### 3.6 Lease Module (lease_test.go) - New

#### 3.6.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| LSE-01 | Query lease progress (new) | Success Path | P0 |
| LSE-02 | Query lease progress (existing) | Success Path | P0 |
| LSE-03 | Query without device | Error Handling | P0 |
| LSE-04 | Update lease progress success | Success Path | P0 |
| LSE-05 | Update missing fields | Required Fields | P0 |
| LSE-06 | Update with invalid months | Edge Case | P1 |
| LSE-07 | Trigger 12-month threshold | Business Logic | P0 |
| LSE-08 | Update completed lease | Business Logic | P0 |

---

### 3.7 Location Module (location_test.go) - New

#### 3.7.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| LOC-01 | Create location success | Success Path | P0 |
| LOC-02 | Create missing required fields | Required Fields | P0 |
| LOC-03 | Create with invalid OrgID | Error Handling | P0 |
| LOC-04 | List locations (pagination) | Pagination | P0 |
| LOC-05 | List locations (Org filter) | Filtering | P0 |
| LOC-06 | Update location success | Success Path | P0 |
| LOC-07 | Delete location success | Success Path | P0 |

---

### 3.8 Repair Module (repair_test.go) - New

#### 3.8.1 Test Case List

| ID | Test Case | Category | Priority |
|----|-----------|----------|----------|
| RPR-01 | Submit repair success | Success Path | P0 |
| RPR-02 | Submit missing SN | Required Fields | P0 |
| RPR-03 | Submit device not found | Error Handling | P0 |
| RPR-04 | Submit missing description | Required Fields | P0 |

---

## 4. Test Execution Strategy

### 4.1 Test Classification

| Type | Target Coverage | Frequency |
|------|----------------|-----------|
| Unit Tests | 80% logic branches | Per PR |
| Integration Tests | 100% API endpoints | Per PR |
| E2E Tests | Core user paths | Pre-release |

### 4.2 Test Isolation Strategy

```go
// Option 1: Transaction Rollback (existing)
// Option 2: Separate test database
// Option 3: Mock database layer (recommended)

type MockDB struct {
    // Implement gorm.DB interface
}
```

### 4.3 Mock Dependencies

| Dependency | Mock Solution | Priority |
|------------|--------------|----------|
| Database | gormmock or sqlmock | P0 |
| Redis | miniredis | P1 |
| IAM | mock HTTP responses | P1 |

---

## 5. Test File Structure

```
tests/httptest/
├── main_test.go           # Test infrastructure
├── auth_test.go          # Auth tests (existing)
├── workorder_test.go     # Work order tests (new)
├── device_test.go        # Device tests (new)
├── organization_test.go   # Organization tests (new)
├── user_test.go          # User tests (new)
├── location_test.go      # Location tests (new)
├── lease_test.go         # Lease tests (new)
└── repair_test.go        # Repair tests (new)
```

---

## 6. Implementation Plan

### Phase 1: Infrastructure Enhancement (1 day)
- [ ] Add Mock auth middleware
- [ ] Add test data factory functions
- [ ] Add Redis Mock (miniredis)

### Phase 2: Core API Tests (3 days)
- [ ] workorder_test.go (25 test cases)
- [ ] device_test.go (16 test cases)
- [ ] organization_test.go (10 test cases)

### Phase 3: Supporting API Tests (2 days)
- [ ] user_test.go (12 test cases)
- [ ] lease_test.go (8 test cases)
- [ ] location_test.go (7 test cases)
- [ ] repair_test.go (4 test cases)

### Phase 4: Edge Case Enhancement (1 day)
- [ ] String length boundaries
- [ ] Numeric range boundaries
- [ ] Date/time boundaries
- [ ] UUID format boundaries

---

## 7. Acceptance Criteria

| Metric | Target |
|--------|--------|
| API Endpoint Coverage | 100% |
| Logic Branch Coverage | 80% |
| Edge Case Coverage | 90% |
| Test Pass Rate | 100% |
| Test Execution Time | < 5 minutes |

---

## 8. Appendix

### A. File Index

| File | Lines | Complexity |
|------|-------|------------|
| internal/api/auth.go | 431 | Medium |
| internal/api/workorder.go | 1168 | High |
| internal/api/device.go | 368 | Medium |
| internal/api/organization.go | 322 | Medium |
| internal/api/user.go | 360 | Medium |
| internal/api/location.go | 259 | Low |
| internal/api/lease.go | 299 | Medium |
| internal/api/repair.go | 147 | Low |

### B. API Endpoint Checklist

| Module | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Auth | POST | /api/v1/auth/login | ✅ Covered |
| Auth | GET | /api/v1/auth/callback | ❌ Not Covered |
| Auth | POST | /api/v1/auth/refresh | ✅ Covered |
| WorkOrder | GET | /api/v1/workorders | ❌ Not Covered |
| WorkOrder | POST | /api/v1/workorders | ❌ Not Covered |
| WorkOrder | GET | /api/v1/workorders/:id | ❌ Not Covered |
| WorkOrder | POST | /api/v1/workorders/:id/dispatch | ❌ Not Covered |
| WorkOrder | POST | /api/v1/workorders/:id/accept | ❌ Not Covered |
| WorkOrder | POST | /api/v1/workorders/:id/reject | ❌ Not Covered |
| WorkOrder | POST | /api/v1/workorders/:id/reserve | ❌ Not Covered |
| WorkOrder | POST | /api/v1/workorders/:id/arrive | ❌ Not Covered |
| WorkOrder | POST | /api/v1/workorders/:id/finish | ❌ Not Covered |
| Device | GET | /api/v1/devices | ❌ Not Covered |
| Device | POST | /api/v1/devices | ❌ Not Covered |
| Device | GET | /api/v1/devices/:id | ❌ Not Covered |
| Device | GET | /api/v1/devices/sn/:sn | ❌ Not Covered |
| Device | GET | /api/v1/devices/:id/qrcode | ❌ Not Covered |
| Organization | GET | /api/v1/organizations | ❌ Not Covered |
| Organization | POST | /api/v1/organizations | ❌ Not Covered |
| Organization | GET | /api/v1/organizations/tree | ❌ Not Covered |
| Lease | GET | /api/v1/leases/progress | ❌ Not Covered |
| Lease | POST | /api/v1/leases/progress/update | ❌ Not Covered |
| Repair | POST | /api/v1/repair/submit | ❌ Not Covered |

---

*Report generated automatically*
*Last updated: 2026-03-19*
