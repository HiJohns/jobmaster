# JobMaster Beacon-IAM Integration Technical Investigation Report

## 1. Overview

This report provides a detailed analysis of JobMaster's existing identity authentication and organization architecture, and presents a comprehensive technical plan for integrating with Beacon-IAM.

### 1.1 Investigation Objectives
- Understand JobMaster's existing authentication flow
- Analyze the organization and user management mechanisms
- Determine the technical approach for Beacon-IAM integration

### 1.2 Beacon-IAM Core Capabilities
Based on `../beaconiam/README.md`, Beacon-IAM provides:
- **OIDC Authorization Code Flow**: `/oauth/authorize` → `/api/v1/auth/token`
- **JWT Issuance**: RS256 algorithm, containing `sub`, `tid`, `oid`, `role`, `own`, `name` fields
- **Organization Management**: `/api/v1/orgs/tree` tree structure
- **Member Management**: `/api/v1/orgs/:id/users` invite members

---

## 2. Existing System Analysis

### 2.1 Authentication Module (internal/api/auth.go)

**Current Flow:**
1. User submits `POST /api/v1/auth/login` (username + password)
2. Backend verifies bcrypt password hash
3. Generates HS256 JWT Token (using `JWT_SECRET`)
4. Returns Token + user info

**Key Code:**
```go
// Login function (auth.go:34-91)
func Login(c *gin.Context) {
    // 1. Verify username/password
    // 2. Generate JWT Token
    token, err := utils.GenerateToken(user.ID, user.OrganizationID, ...)
}
```

**Key Differences:**
| Aspect | JobMaster Current | Beacon-IAM |
|--------|-------------------|------------|
| Login Method | Local username/password | OIDC Authorization Code |
| Token Issuer | JobMaster Local (HS256) | Beacon-IAM (RS256) |
| Password Storage | bcrypt local hash | Managed by IAM |
| Token Validation | Local JWT_SECRET | IAM Public Key (RS256) |

### 2.2 JWT Structure Comparison

**Existing JWTClaims (pkg/utils/jwt.go:22-30):**
```go
type JWTClaims struct {
    UserID         uuid.UUID `json:"user_id"`
    OrgID          uuid.UUID `json:"org_id"`
    TenantID       uuid.UUID `json:"tenant_id"`
    Role           string    `json:"role"`
    IsImpersonated bool      `json:"is_impersonated"`
}
```

**Beacon-IAM JWTClaims:**
```json
{
  "sub": "u_xxx",        // User UUID
  "tid": "t_xxx",       // Tenant ID
  "oid": "o_xxx",       // Org ID
  "role": "OWNER",      // OWNER|ADMIN|MANAGER|STAFF|WORKER
  "own": true,          // Is organization owner
  "name": "Weixun Lin"  // Display name
}
```

**Field Mapping:**
| Existing Field | IAM Field | Conversion |
|----------------|-----------|------------|
| user_id | sub | Direct mapping |
| org_id | oid | Direct mapping |
| tenant_id | tid | Direct mapping |
| role | role | Needs mapping table |
| is_impersonated | - | Fixed false |
| - | own | New field |
| - | name | New field |

### 2.3 Organization Architecture (internal/api/organization.go)

**Current Implementation:**
- Stored in local `organizations` table
- Supports hierarchy: `HQ → Store`, `MainContractor → Vendor`
- Tree structure built via GORM queries

**API Endpoints:**
- `GET /api/v1/organizations` - List
- `POST /api/v1/organizations` - Create
- `GET /api/v1/organizations/tree` - Tree structure

**Beacon-IAM Integration Approach:**
- Convert to "Shadow Entities": only store ID mapping
- Dynamic queries: `GET /api/v1/orgs/tree` from IAM
- Business rules: `max_dispatch_hops` stored in IAM's `meta` field

### 2.4 User Management (internal/api/user.go)

**Current Implementation:**
- Local `users` table stores users
- bcrypt password hashing
- Create/Update/Delete all done locally

**API Endpoints:**
- `POST /api/v1/users` - Create user (with password)
- `GET /api/v1/users` - List
- `PUT /api/v1/users/:id` - Update
- `DELETE /api/v1/users/:id` - Delete

**Beacon-IAM Integration Approach:**
- Create user via IAM: `POST /api/v1/orgs/:id/users`
- Keep local shadow user: only for order association
- Role mapping:
  ```
  IAM: OWNER/ADMIN/MANAGER/STAFF/WORKER
  ↓
  JobMaster: BRAND_HQ, STORE, MAIN_CONTRACTOR, VENDOR, ENGINEER
  ```

---

## 3. Execution Flow Details

### 3.1 Phase 1: Environment Configuration

```bash
# Environment Variables
IAM_BASE_URL=http://localhost:5552
IAM_CLIENT_ID=jobmaster
IAM_CLIENT_SECRET=<secret>
IAM_PUBLIC_KEY=<RSA-public-key>
```

### 3.2 Phase 2: Authentication Middleware Upgrade

**Completed Changes (Issue #35):**
- ✅ `pkg/utils/iam.go` - RS256 JWT parsing
- ✅ `internal/middleware/auth.go` - Upgraded validation logic

### 3.3 Phase 3: OIDC Callback Implementation

**New Endpoint:**
```
GET /api/v1/auth/callback?code=xxx&state=xxx
```

**Processing Flow:**
1. Receive `code` returned from IAM
2. Backend calls IAM: `POST /api/v1/auth/token`
3. Get access_token + id_token
4. Verify id_token signature
5. Generate HttpOnly Cookie or return Token

### 3.4 Phase 4: Organization Architecture Integration

**Database Changes:**
```sql
ALTER TABLE organizations ADD COLUMN is_shadow BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN iam_org_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN max_dispatch_hops INT DEFAULT 3;
```

**API Changes:**
- `GET /api/v1/organizations/tree` → Call IAM
- Get vendor list for dispatch → Call IAM

### 3.5 Phase 5: User Management Refactoring

**Role Mapping Table:**
| IAM Role | JobMaster Role |
|----------|----------------|
| OWNER | BRAND_HQ / MAIN_CONTRACTOR |
| ADMIN | BRAND_HQ / MAIN_CONTRACTOR |
| MANAGER | STORE |
| STAFF | STORE |
| WORKER | VENDOR / ENGINEER |

---

## 4. Dependencies

### 4.1 Upstream Dependencies
- Beacon-IAM Service (`localhost:5552`)
- IAM Public Key Configuration

### 4.2 Downstream Dependencies
- Order Service: Depends on user ID and organization ID
- Permission System: Depends on role mapping
- Dispatch Logic: Depends on max_dispatch_hops

### 4.3 File Index
| File | Responsibility |
|------|----------------|
| `pkg/utils/iam.go` | JWT RS256 parsing |
| `internal/middleware/auth.go` | Authentication middleware |
| `internal/api/auth.go` | Login/Refresh |
| `internal/api/organization.go` | Organization management |
| `internal/api/user.go` | User management |
| `internal/model/user.go` | User model |
| `internal/model/organization.go` | Organization model |

---

## 5. Risks and Rollback

| Risk | Impact | Mitigation |
|------|--------|------------|
| IAM service unavailable | Cannot login | Keep HS256 fallback |
| Data alignment failure | Order data loss | One-time migration script |
| Role mapping error | Permission escalation | Detailed mapping table + testing |

---

## 6. Recommendations

### 6.1 Gradual Migration
1. Phase 1: Only change authentication, keep local users
2. Phase 2: Integrate organization and users
3. Phase 3: Deprecate local login

### 6.2 Caching Strategy
- Organization tree cache: Redis 5 min TTL
- User info cache: Redis 1 min TTL

---

## Appendix

### A. Beacon-IAM API List

| Interface | Method | Path |
|-----------|--------|------|
| Authorization Redirect | GET | `/oauth/authorize` |
| Token Exchange | POST | `/api/v1/auth/token` |
| Identity Check | GET | `/api/v1/auth/me` |
| Create Tenant | POST | `/api/v1/tenants` |
| Invite Member | POST | `/api/v1/orgs/:id/users` |
| Get Org Tree | GET | `/api/v1/orgs/tree` |

### B. API Endpoints Requiring Changes

| Existing Endpoint | Change Type | Description |
|------------------|-------------|-------------|
| POST /api/v1/auth/login | Deprecate | Change to OIDC |
| GET /api/v1/auth/callback | New | OIDC callback |
| GET /api/v1/organizations/tree | Refactor | Call IAM |
| POST /api/v1/users | Refactor | Call IAM |
