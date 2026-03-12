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

## WorkOrder Core Model & API Implementation - 2026-03-08

### Completed Tasks
- [x] WorkOrder core model with 8 status constants (int-based)
- [x] JSONB flexible fields: info (equipment, photos, location, urgency), logs (audit trail)
- [x] GORM Scopes: TenantScope, StoreScope, StatusScope, CreatedAtScope, IsUrgentScope
- [x] State machine service with TransitTo() method and transition whitelist
- [x] Order number generator: WO-YYYYMMDD-C{OrgID}-XXXX format with crypto/rand
- [x] Database migration with GIN index on JSONB (jsonb_path_ops)
- [x] WorkOrder API endpoints:
  - Create (STORE role only)
  - List (role-based view isolation)
  - Get by ID
  - Dispatch (MAIN_CONTRACTOR only)
  - Accept/Reject (VENDOR/ENGINEER only)
- [x] Audit log system: append-only JSONB array for evidence trail
- [x] State entry hooks: auto-set timestamps (arrived_at, started_at, finished_at, closed_at)
- [x] Observation deadline auto-calculation (7 days)

### Technical Details

**WorkOrder Model (`internal/model/workorder.go`):**
- Status enum: int-based (1-PENDING to 8-CLOSED)
- Flexible JSONB: info (description, equipment, photos, urgency, location), logs (audit trail)
- GORM Scopes for query filtering and data isolation
- State transition validation with ErrInvalidStateTransition

**State Machine Service (`internal/service/order.go`):**
- Centralized TransitTo() method with transaction safety
- Transition whitelist supporting rejection flow (DISPATCHED→PENDING)
- Auto-timestamp on state entry (arrived_at, started_at, finished_at, closed_at)
- Specialized methods: Dispatch(), Accept(), Reject()

**Order Number Generator (`pkg/utils/orderno.go`):**
- Format: WO-YYYYMMDD-C{StoreIDPrefix}-XXXX
- Crypto-secure random suffix using crypto/rand
- Interface-based design for SaaS scalability

**Database Migration (`migrations/001_workorder.up.sql`):**
- UUID primary key with foreign key constraints
- GIN index on JSONB for flexible search (info jsonb_path_ops)
- Composite indexes: tenant_id+status, store_id+status
- Soft delete support (deleted_at)

**API Endpoints:**
- `POST /api/v1/workorders` - Create work order (STORE)
- `GET /api/v1/workorders` - List with pagination and filters
- `GET /api/v1/workorders/:id` - Get single work order
- `POST /api/v1/workorders/:id/dispatch` - Dispatch to vendor/engineer (MAIN_CONTRACTOR)
- `POST /api/v1/workorders/:id/accept` - Accept with scheduled time (VENDOR/ENGINEER)
- `POST /api/v1/workorders/:id/reject` - Reject with reason (VENDOR/ENGINEER)

### Security & Quality
- Role-based access control on all endpoints
- Tenant isolation enforced via GORM Scopes
- SQL injection protection via parameterized queries
- Audit logs: user ID, name, action, timestamps, status changes
- Error handling with context using fmt.Errorf("...: %w", err)

### Fixes Applied (Review Feedback)
- [x] Replaced math/rand with crypto/rand for thread-safe order number generation
- [x] Added getCurrentUserName() helper for audit log completeness
- [x] Removed redundant init() function (Go 1.20+ auto-seeds)

---

## [2026-03-09] | WorkOrder 升级：模型扩展、任务清单与施工动作

### 变更摘要
升级工单系统以支持多级分类、费用记录、地理位置追踪，新增工程师/供应商任务清单接口和施工动作 API。

### 模型扩展 (`internal/model/workorder.go`)
- **多级分类**: `CategoryPath []string`, `BrandName string` (in Info JSONB)
- **费用字段**: `LaborFee`, `MaterialFee`, `OtherFee` float64 (default:0)
- **预约时间**: `AppointedAt *time.Time` (日历视图支持)
- **地理位置**: `AddressDetail string`, `Coordinates *GPSLocation`
- **GPSLocation**: 实现 `driver.Valuer` / `sql.Scanner` 接口支持 JSONB 持久化
- **日志常量**: 新增 `LogActionCreate`, `LogActionDispatch`, `LogActionAccept`, `LogActionReject`, `LogActionReserve`, `LogActionArrive`, `LogActionFinish` 等
- **GORM Scopes**: `AppointedAtScope`, `EngineerScope`, `VendorScope`, `OrderNoLikeScope`

### 数据库迁移 (`migrations/002_workorder_upgrade.up.sql`)
- 添加费用列: `labor_fee`, `material_fee`, `other_fee` (DECIMAL(10,2))
- 添加时间列: `appointed_at` (TIMESTAMP WITH TIME ZONE)
- 添加位置列: `address_detail` (TEXT), `coordinates` (JSONB)
- 创建索引: `idx_workorder_appointed_at`, `idx_workorder_engineer_appointed`, `idx_workorder_vendor_appointed`, `idx_workorder_coordinates` (GIN)

### API 接口 (`internal/api/workorder.go`)
- **任务清单**: `GET /api/v1/my-tasks` - 日历过滤、模糊搜索、分页
- **任务统计**: `GET /api/v1/my-tasks/statistics` - 按状态统计数量
- **工单详情**: `GET /api/v1/workorders/:id` → `GetWorkOrderDetail` - 全量数据、权限脱敏
- **预约动作**: `POST /api/v1/workorders/:id/reserve` - DISPATCHED → RESERVED
- **签到动作**: `POST /api/v1/workorders/:id/arrive` - RESERVED → ARRIVED (LBS 验证)
- **完工动作**: `POST /api/v1/workorders/:id/finish` - WORKING → FINISHED

### 响应结构体
- `MyTaskResponse` - 任务列表项
- `TaskStatisticsResponse` - 统计结果
- `WorkOrderDetailResponse` - 详情响应（含费用脱敏）
- `WorkRecordResponse` - 施工记录
- `OrganizationBrief`, `UserBrief` - 简要信息

### 安全与质量改进
- **错误检查**: 所有 `middleware.GetXxx()` 返回值检查 `ok`，失败返回 401
- **关键词限制**: `ListMyTasks` 关键词长度限制 50 字符
- **费用校验**: 范围 0-999999，防止负数和溢出
- **所有权验证**: Reserve/Arrive/Finish 校验工程师/供应商指派关系
- **费用脱敏**: STORE 角色隐藏费用信息
- **硬编码消除**: 日志 action 字符串改用 model 常量

### 服务层增强 (`internal/service/order.go`)
- `Reserve()` - 预约时间设置、所有权验证
- `Arrive()` - GPS 坐标记录、所有权验证
- `Finish()` - 完工确认、费用记录、范围校验

---

## [2026-03-10] | 项目基础配置：Makefile、docker-compose、config、main、seed

### 变更摘要
完成开发环境基础设施配置，包括 Makefile 构建脚本、docker-compose 本地开发环境、配置文件模板、应用入口与数据库初始化。

### 新增文件
- **Makefile**: 包含 build、run、test、docker-up、docker-down、lint、fmt 等指令
- **docker-compose.yaml**: PostgreSQL 15 + Redis 7 开发环境配置，带健康检查和数据卷持久化
- **config.yaml.example**: 本地开发配置模板（DB、JWT、Redis）
- **cmd/api/main.go**: 应用入口，加载配置、初始化数据库、AutoMigrate、运行 Seeder
- **internal/db/seed.go**: 数据库初始化，创建默认 HQ 组织和超级管理员账号
- **.gitignore**: 排除 config.yaml、.env、构建产物等

### 安全修复（Review 反馈）
- [x] 删除 config.yaml，仅保留 config.yaml.example（避免硬编码敏感信息）
- [x] Makefile docker-up 目标隐藏数据库密码（使用 *** 替代）
- [x] 重构 main.go 数据库初始化，直接传递 Config 对象而非 os.Setenv()
- [x] seed.go 移除日志中的明文密码提示

### 技术细节
- **数据库连接**: 使用 sync.Once 线程安全初始化，支持自定义日志级别
- **AutoMigrate**: 启动时自动迁移 User、Organization、Order、WorkOrder 模型
- **Seeder**: 检测数据库是否为空，自动创建默认组织和 admin 账号
- **Graceful Shutdown**: 监听 SIGINT/SIGTERM 信号，优雅关闭服务

---

## [2026-03-10] | 测试框架建设：Go HTTP测试 + Python集成测试

### 变更摘要
建立完整的测试基础设施，包括 Go HTTP 集成测试框架、Python pytest 集成测试、Makefile 测试指令。

### 新增文件
- **tests/httptest/main_test.go**: 测试框架核心，提供 ExecuteRequest/ExecuteRequestWithAuth 辅助函数，事务回滚支持
- **tests/httptest/auth_test.go**: 登录接口测试、Token 拦截测试、参数化测试用例
- **tests/pytest/requirements.txt**: pytest, requests, python-dotenv 依赖
- **tests/pytest/conftest.py**: pytest fixtures (base_url, admin_token, auth_headers, cleanup)
- **tests/pytest/test_basic.py**: /health、/api/v1/* 接口测试、参数化测试

### Makefile 新增指令
- `make httptest`: 运行 Go HTTP 集成测试
- `make pytest`: 运行 Python 集成测试（自动创建虚拟环境）
- `make check`: 提交前全面检查（单元测试 + 集成测试 + 格式化）

### 代码审查修复
- [x] main_test.go: ExecuteRequest 改为接受 *testing.T 参数，使用 t.Fatalf() 替代 panic
- [x] main_test.go: setupTestDB 改用 log.Fatalf() + os.Exit(1)
- [x] auth_test.go: 移除包含明文凭证的注释
- [x] conftest.py: 添加 cleanup 端点实现说明文档
- [x] order.go: ArrivalLocation 字段添加 JSON 格式说明注释

---

## [2026-03-10] | Summary

### 前端基础架构搭建
- 使用 Vite 初始化 React + TypeScript 项目，配置 Tailwind CSS、Ant Design 5.x 组件库
- 封装 Axios 请求层，实现 Token 自动注入与 401 拦截跳转
- 实现 Zustand 状态管理（useAuthStore、useGlobalStore），支持 Token 持久化
- 配置 React Router 路由结构，实现登录页与权限路由保护
- 基础布局组件：顶栏显示租户名称、只读模式水印、响应式 TabBar 导航

### 前端工单管理模块
- 工单 API 层：封装 workorderApi，支持列表、详情、创建、派工、预约、签到、完工等全流程操作
- 工单列表页：状态分组标签（待服务/服务中/待修正/已完成）、日历筛选、模糊搜索、下拉刷新
- 工单详情页：状态展示、时间轴记录、施工动作按钮、GPS 定位获取
- 周历组件：横向滑动日历，支持日期选择与高亮
- Bug 修复：Home.tsx 分页逻辑、Layout.tsx Outlet 嵌套路由支持、状态映射表完善

---

## [2026-03-11] | Raw | 前端组件状态同步与权限校验修复

- Calendar.tsx: 添加 useEffect 处理 initialDate 外部传入值变化，确保日历组件响应日期选择器更新
- WorkOrderList.tsx: 修复 useEffect 依赖项，使用 selectedDate.format('YYYY-MM-DD') 替代 dayjs 对象引用，避免无限循环渲染
- organization.go: 修复组织创建权限校验，添加 UserStatusActive 状态检查

Commit: ac61bd39

---

## [2026-03-11] | Raw | main.go 启动逻辑优化与 Makefile 指令更新

- 优化 main.go 启动逻辑：引入 --migrate flag，实现迁移与运行分离
- 迁移模式 (--migrate)：执行数据库迁移和 Seed 后立即退出
- 默认模式：跳过迁移，秒开 API（解决 GORM AutoMigrate 耗时问题）
- 更新 Makefile 指令：
  - make migrate：执行数据库迁移 (--migrate flag)
  - make run：秒开模式，跳过迁移
  - make dev：先迁移再热重载
  - make grand-tour：全链路集成测试
- 修复 seed.go：admin 用户角色从 UserRoleAdmin 改为 UserRoleBrandHQ
- 修复 router.go：添加缺失的 reserve/arrive/finish 端点

---

## [2026-03-11] | Raw | 静态文件代理与前端构建环境修复

- 路由配置 (`router.go`)：配置 `r.NoRoute` 代理前端 `dist` 目录，使得对 `GET /` 以及非 API 路由的请求都会自动返回前端编译后的 `index.html`。
- 如果前端没有编译 (`frontend/dist` 目录不存在)，则友好的返回 JSON 提示语 `(Frontend not built. Please run 'cd frontend && npm run build')`。
- 修复 `vite build` 报错问题：补充缺失的 `tsconfig.json` 和 `tsconfig.node.json`，并将 TailwindCSS 的 PostCSS 插件更新为 `@tailwindcss/postcss` 兼容最新版 V4。
- 修复 `npm run build` TypeScript 编译错误：移除代码引用的 `antd-mobile` 中已被弃用的组件（如 `Flex`, `Text`, `Timeline`, `ActivityIndicator`），替换为标准 `div`/`span` 和 `SpinLoading`；修复 `PullToRefresh` 与 `Modal` 在 V5 版本的 API 调用规则；修正 `useAuthStore` 解构中的状态字段和 React Hook 未使用警告。目前前端已完全通过 TS 检查并可成功编译生产环境静态文件。

---

## [2026-03-11] | Raw | UI/UX 样式升级优化批次

### 全局主题与布局系统
- 升级 `tailwind.config.js`：引入完整色彩规范（success-green, warning-orange, danger-red, background），添加 card shadow 和 breath-blue 动画关键帧
- 优化 `index.css`：定义 CSS 变量（--primary-blue, --success-green 等），实现卡片化布局基类 `.card-layout` 和侧边栏呼吸灯效果
- Dashboard 整合：应用深色主题侧边栏，图标升级为双色模式（TwoTone），激活项带蓝色呼吸灯效

### 登录页重构
- 视觉聚焦：登录框宽度限制为 400px，居中显示
- 磨砂玻璃：增加 `backdrop-filter: blur(10px)` 效果，背景使用渐变色调
- 交互优化：加载状态动画、输入框聚焦时边框呈现呼吸态蓝色（breath-blue 2s infinite）

### 组件优化
- WeekCalendar：选中日期增加缩放动画（scale 1.08）和过渡效果（cubic-bezier）
- WorkOrderCard：左侧新增状态色条，右侧缩略图区域，移除底部冗余图片列表，整体升级为卡片流布局
- WorkOrderList：重构为复用 WorkOrderCard 组件，删除重复的状态渲染逻辑

### Layout 架构统一
- 合并顶栏：取消原 Dashboard 嵌套的子 Layout，提取侧边栏和 Header 到全局 AppLayout
- 面包屑导航：Header 左侧增加动态面包屑，根据路由自动显示层级（首页 / 工单管理 / 详情）
- UUID 业务化：根据用户角色显示语义化名称（超级管理员→系统管理后台，分店→分店名称），隐藏原始 UUID
- 用户信息：Header 右侧整合用户信息下拉菜单（包含退出登录），文本颜色优化为灰色系确保对比度

### 代码质量
- 修复：移除所有 `console.log` 调试代码，替换为 TODO 注释
- 修复：统一使用 CSS 变量替代硬编码色值
- 修复：添加明确的错误日志记录（console.error）

**验证结果**：TypeScript 编译通过，npm run build 成功，生成生产环境静态资源

Commit: c09bd2d5


---

## [2026-03-12] | Raw | 工单列表表格化与品牌视觉升级

- 彻底重构应用框架与品牌视觉，移除所有页面对于 UUID 的显示，使用角色语义化名称。
- 优化了 Login 页面，加入品牌 Logo 并且在侧边栏上方整合，完善毛玻璃拟态卡片设计。
- 采用 Ant Design Table 全面重构 `WorkOrderList` 的核心数据流，丢弃之前粗糙的卡片列表样式。
- 定义了七列结构化数据展示：勾选框、单号、品牌网点、故障描述、工程师、留痕状态与操作。
- 引入 `EmptyStateIllustration` SVG 插画组件，在空数据时提供引导提示；并将搜索增强。

Commit: c89048f8

---

## [2026-03-12] | Raw | 补充前端编译命令

在 Makefile 中增加 `make web` 指令，用于一键编译前端静态资源。执行流程：`cd frontend && npm install && npm run build`，产物输出到 `./frontend/dist` 目录。与后端路由配置一致，执行 `make web` 后执行 `make run` 即可在 8080 端口看到最新前端页面。

Commit: 5e664344

---

## [2026-03-12] | Raw | 前端组件错误处理与用户反馈优化

修复审核发现的前端错误处理问题，确保所有 API 调用错误都能通过 Toast 向用户展示，移除未使用的导入语句。

### 修复内容
- **Home.tsx**: 添加 `Toast` 导入，在 `fetchOrders` 错误处理中增加 `Toast.show('获取工单列表失败')` 提示用户
- **WorkOrderDetail.tsx**: 在 `fetchOrderDetail` 错误处理中增加 `Toast.show('获取工单详情失败')`，在 `handleReserve` 错误处理中增加 `Toast.show('预约失败')`，在 `handleFinish` 错误处理中增加 `Toast.show('完工提交失败')`
- **WorkOrderDetail.tsx**: 移除未使用的 `getAvailableActions` 导入，删除无意义的函数调用并添加注释说明
- **WorkOrderDetail.tsx**: 修复 `SpinLoading` 的 `style` 属性类型，将 `as any` 改为 `as React.CSSProperties`
- **Calendar.tsx**: 为模拟热度数据的硬编码逻辑添加 TODO 注释
- **Home.tsx**: 移除未使用的 `EmptyStateIllustration` 导入

### 代码质量
- 统一使用 `Toast.show()` 向用户展示错误信息，避免仅通过 `console.error` 输出
- 所有 TypeScript 编译错误已修复（移除未使用的变量导入）
- 保持类型安全，避免使用 `any` 类型

