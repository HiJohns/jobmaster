# JobMaster Development Log

## Project Initialization - 2026-03-06

### Completed Tasks
- [x] Initialize project directory structure
- [x] Create docs/blog.md for development tracking
- [x] Set up Go project layout: cmd/, internal/, pkg/
- [x] Set up frontend directory: frontend/
- [x] Set up API definitions directory: api/

### Project Structure
```
jobmaster/
├── cmd/           # Application entry points
├── internal/      # Private application code
│   ├── models/    # Data models (User, Order, Organization)
│   ├── repositories/ # Data access layer
│   └── services/  # Business logic
├── pkg/           # Public libraries
│   └── permissions/ # RBAC permission matrix
├── api/           # API definitions (protobuf, OpenAPI)
├── frontend/      # React + TypeScript frontend
├── docs/          # Documentation
│   ├── blog.md    # This file
│   └── en/        # English translations
└── prompts/       # Project prompts and guidelines
    ├── instructions.md
    ├── project.md
    └── customs.md
```

### Next Steps
- [ ] Initialize Go module and dependencies
- [ ] Set up frontend package.json with dependencies
- [ ] Design organization model for 5-party collaboration
- [ ] Create database schema migrations

### Notes
Following 12-Factor App principles:
- Stateless application design
- Configuration via environment variables
- Control plane (server) dictates agent behavior

Following Google Engineering Practices:
- Readability over cleverness
- Explicit error handling
- No premature abstraction

### Technical Stack
**Backend:**
- Go 1.21+ with Gin framework
- GORM with PostgreSQL
- JSONB for flexible data storage

**Frontend:**
- React 18 with TypeScript (strict mode)
- Ant Design 5.x for UI components
- Zustand for state management

---

## Dependencies & Organization Model - 2026-03-06

### Completed Tasks
- [x] Initialize Go module: `go mod init jobmaster`
- [x] Install Go dependencies:
  - github.com/gin-gonic/gin (Web framework)
  - gorm.io/gorm (ORM)
  - gorm.io/driver/postgres (PostgreSQL driver)
  - gorm.io/datatypes (JSONB support)
- [x] Initialize frontend package.json
- [x] Install frontend dependencies:
  - antd ^5.15.0
  - react ^18.2.0
  - zustand ^4.5.2
  - @tanstack/react-query ^5.24.0
- [x] Design 5-party organization model
- [x] Implement User model with role-based permissions
- [x] Implement Order model with state machine
- [x] Create permission matrix (RBAC)

### Organization Model (五方协同)

**Entities:**
1. **BrandHQ** (总店) - Global configuration, cross-region coordination
2. **Store** (分店) - Order creation, on-site coordination, final approval
3. **MainContractor** (工程公司) - Order assessment, vendor assignment
4. **Vendor** (供应商) - Execution coordination
5. **Engineer** (工程师) - Field work execution

**Relationships:**
```
BrandHQ (1) ───< (N) Store
              ───< (N) User

MainContractor (1) ───< (N) Vendor
                   ───< (N) User
                   ───< (N) Order

Vendor (1) ───< (N) Engineer
           ───< (N) User
           ───< (N) Order

Order ───> Store (creator)
      ───> MainContractor (dispatcher)
      ───> Vendor (assigned)
      ───> Engineer (executor)
```

**Permission Matrix:**
| Role | Create | Dispatch | Execute | Approve | View |
|------|--------|----------|---------|---------|------|
| BrandHQ | - | - | - | - | All |
| Store | ✅ | - | - | ✅ | Own |
| MainContractor | - | ✅ | - | - | Assigned |
| Vendor | - | - | ✅ | - | Assigned |
| Engineer | - | - | ✅ | - | Assigned |

### Order State Machine
```
PENDING (报修)
    ↓ [Store creates order]
DISPATCHED (已指派)
    ↓ [MainContractor assigns vendor]
RESERVED (已预约)
    ↓ [Vendor confirms schedule]
ARRIVED (已到场)
    ↓ [Engineer GPS check-in]
WORKING (施工中)
    ↓ [Engineer starts work]
FINISHED (离场确认)
    ↓ [Engineer completes work]
OBSERVING (观察期)
    ↓ [Store approves]
CLOSED (已关闭)
    ↑ [Store rejects - goes back to DISPATCHED]
```

### Key Files Created
- `internal/models/user.go` - User entity with roles
- `internal/models/organization.go` - BrandHQ, Store, MainContractor, Vendor, Engineer
- `internal/models/order.go` - Order entity with state machine
- `pkg/permissions/permissions.go` - RBAC permission system
- `internal/models/README.md` - Model documentation

### Next Steps
- [ ] Create database migrations
- [ ] Implement repository layer
- [ ] Set up Gin router and middleware
- [ ] Create authentication service
- [ ] Implement order API endpoints

---

---

## Database Infrastructure & Models - 2026-03-08

### Completed Tasks
- [x] Implement PostgreSQL connection pool with thread-safe initialization (sync.Once)
- [x] Add environment-based configuration for database settings
- [x] Implement Organization model (HQ, Store, MainContractor, Vendor)
- [x] Implement User model with role-based permissions
- [x] Add UUID generation with BeforeCreate hooks
- [x] Implement secure DSN handling with password masking for logs
- [x] Add configurable GORM log levels via DB_LOG_LEVEL env var

### Technical Details

**PostgreSQL Connection Pool (`pkg/database/postgres.go`):**
- Thread-safe initialization using `sync.Once` pattern
- Connection pool settings: MaxOpenConns=25, MaxIdleConns=10
- Connection lifetime: 5 minutes
- Environment-based configuration (12-Factor compliant)
- Safe GetDB() returns error if not initialized

**Organization Model (`internal/model/organization.go`):**
- UUID primary keys for distributed system compatibility
- Self-referential relationship for hierarchy (Parent/Children)
- Multi-tenant support with TenantID
- Soft delete support with gorm.DeletedAt

**User Model (`internal/model/user.go`):**
- Role enum: BRAND_HQ, STORE, MAIN_CONTRACTOR, VENDOR, ENGINEER, ADMIN
- Password hash field (prepared for bcrypt integration)
- Foreign key to Organization
- Helper methods: IsActive(), CanManageOrders(), CanExecuteWork()

### Files Created/Modified
- `pkg/database/postgres.go` - Database connection management
- `internal/model/organization.go` - Organization entity
- `internal/model/user.go` - User entity
- `go.mod`, `go.sum` - Added direct dependencies (uuid, postgres driver)

### Security Improvements
- Password masking in DSN logs (DSNHidden method)
- JSON tag exclusion for sensitive fields (`json:"-"`)
- Explicit error handling with context wrapping

---

## Authentication & API Implementation - 2026-03-08

### Completed Tasks
- [x] User authentication core with bcrypt password hashing
- [x] JWT token generation and validation with secure secret handling
- [x] Login API with proper error handling and context
- [x] Global middleware pipeline: Auth, Impersonation (read-only mode), Tenant isolation
- [x] Unified API response format: `{ "code": 200, "data": {}, "msg": "success" }`
- [x] Organization management API (create, list, tree view) for BrandHQ/MainContractor
- [x] User management API (CRUD, pagination, role-based filtering) for BrandHQ/MainContractor
- [x] Model directory refactor: `internal/models/` → `internal/model/` (singular convention)

### Security Features

**JWT Implementation (`pkg/utils/jwt.go`):**
- Environment-based secret configuration (JWT_SECRET required)
- Claims include: UserID, OrgID, TenantID, Role, IsImpersonated
- Token expiration: 24 hours
- Proper error wrapping with user context

**Authentication Flow:**
- Password hashing with bcrypt (DefaultCost)
- Login validation with proper error messages (no info leak)
- Token refresh endpoint for authenticated users
- Last login time tracking (non-blocking)

**Middleware Pipeline:**
- AuthMiddleware: JWT validation and context injection
- ImpersonationMiddleware: Blocks all non-GET requests when IsImpersonated=true
- TenantMiddleware: Ensures tenant isolation for all DB operations

**Permission Control:**
- Role-based access control (RBAC)
- Organization hierarchy enforcement
- Cross-tenant data isolation (tenant_id filtering on all queries)

### API Endpoints

**Public:**
- `POST /api/v1/auth/login` - User login

**Protected (require authentication):**
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/organizations` - List organizations
- `POST /api/v1/organizations` - Create organization (BrandHQ/MainContractor)
- `GET /api/v1/organizations/tree` - Get organization tree
- `GET /api/v1/users` - List users (paginated)
- `POST /api/v1/users` - Create user (BrandHQ/MainContractor)
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Soft delete user

### Code Quality
- All errors wrapped with context using `fmt.Errorf("...: %w", err)`
- Context key constants centralized in `pkg/utils/jwt.go`
- Input validation with gin binding tags
- Soft delete support for User model (GORM)
- Request/Response DTOs for type safety

### Files Created/Modified
- `pkg/utils/jwt.go` - JWT utilities
- `pkg/utils/config.go` - Environment helper
- `pkg/response/response.go` - Unified response format
- `internal/api/auth.go` - Login and token refresh
- `internal/api/user.go` - User CRUD operations
- `internal/api/organization.go` - Organization management
- `internal/api/router.go` - Route configuration
- `internal/middleware/auth.go` - JWT validation
- `internal/middleware/impersonation.go` - Read-only mode
- `internal/middleware/tenant.go` - Tenant context
- `internal/model/order.go` - Order state machine model
- `internal/model/user.go` - Added bcrypt password methods

---

*Last Updated: 2026-03-08*
