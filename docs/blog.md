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

*Last Updated: 2026-03-08*
