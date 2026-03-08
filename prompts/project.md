# JobMaster (工单匠) - Project Constitution

## 1. 业务愿景与角色

### 1.1 项目定位
JobMaster 是一款面向连锁维保场景的智能工单管理系统，致力于解决维保过程中的三大核心痛点：
- **进度不透明**：多方协作中信息断层，无法实时追踪工单状态
- **虚假到场**：缺乏有效的到场验证机制
- **质量争议**："修好即走"导致的后续纠纷

### 1.2 五方协同模型

| 角色 | 英文标识 | 核心职责 |
|------|----------|----------|
| 总店 | Brand HQ | 全局配置、标准制定、跨区域协调 |
| 分店 | Store | 报修发起、现场配合、最终验收 |
| 工程公司 | Main Contractor | 工单研判、供应商指派、质量把控 |
| 供应商 | Vendor | 具体执行、到场打卡、施工记录 |
| 工程师 | Engineer | 现场作业、进度上报、离场确认 |

### 1.3 核心价值
通过数字化手段实现维保全流程可追溯，建立信任机制，降低沟通成本。

---

## 2. 核心状态机 (State Machine)

### 2.1 正向流转链路

```
PENDING (报修)
    ↓
DISPATCHED (已指派)
    ↓
RESERVED (已预约进场时间)
    ↓
ARRIVED (已到场确认)
    ↓
WORKING (施工中)
    ↓
FINISHED (离场确认)
    ↓
OBSERVING (观察期)
    ↓
CLOSED (验收通过/进入手动结算)
```

### 2.2 状态定义

| 状态 | 英文 | 触发条件 | 数据变更 |
|------|------|----------|----------|
| 报修 | PENDING | 分店提交报修单 | 创建工单，记录设备信息、紧急程度 |
| 已指派 | DISPATCHED | 工程公司分配供应商 | 绑定 Vendor/Engineer |
| 已预约 | RESERVED | 供应商确认可进场时间 | 记录 scheduled_at |
| 已到场 | ARRIVED | 工程师 GPS 打卡+照片验证 | 记录 arrived_at, location |
| 施工中 | WORKING | 工程师开始作业 | 记录 started_at |
| 离场确认 | FINISHED | 工程师提交离场 | 记录 finished_at, 施工总结 |
| 观察期 | OBSERVING | 系统自动进入 | 设置 observing_deadline |
| 已关闭 | CLOSED | 分店验收通过 | 记录 closed_at, 结算金额 |

### 2.3 回流逻辑 (Critical)

**验收不通过场景**：
- 触发条件：OBSERVING 阶段，分店点击"验收不通过"
- 目标状态：**DISPATCHED** (不是 PENDING)
- 副作用：
  - 通知工程公司重新研判
  - 记录回流原因
  - 保留历史施工记录（用于追溯）

---

## 3. 技术约束

### 3.1 后端技术栈

| 组件 | 选型 | 约束说明 |
|------|------|----------|
| 框架 | Go + Gin | RESTful API，严格遵循 Uber Go Style |
| ORM | GORM | 数据库 PostgreSQL |
| 数据存储 | JSONB | `info` 字段必须包含：设备详情、加急标记 |
| 迁移 | goose / golang-migrate | 版本化管理 |

### 3.2 前端技术栈

| 组件 | 选型 | 约束说明 |
|------|------|----------|
| 框架 | React 18 + TypeScript | 严格类型，禁用 `any` |
| UI 库 | Ant Design 5.x | 组件主题统一 |
| 状态管理 | Zustand / React Query | 服务端状态分离 |
| 特殊模式 | is_impersonated | **所有 UI 必须支持只读模式** |

### 3.3 数据库设计约束

```go
// Order 表核心字段示例
type Order struct {
    ID          uint64         `gorm:"primaryKey"`
    Status      OrderStatus    `gorm:"index"`      // 状态机字段
    Info        datatypes.JSON `gorm:"type:jsonb"` // 设备详情、加急标记等
    StoreID     uint64         `gorm:"index"`      // 分店外键
    VendorID    *uint64        `gorm:"index"`      // 供应商外键
    EngineerID  *uint64        `gorm:"index"`      // 工程师外键
    CreatedAt   time.Time
    UpdatedAt   time.Time
}
```

### 3.4 结算逻辑 (当前版本)

⚠️ **重要**：本版本不实现自动金额计算
- 结算金额由工程公司在 CLOSED 前**手动录入**
- 仅记录金额字段，不做业务逻辑校验
- 结算流程在 V2 版本迭代

---

## 4. 代码规范

### 4.1 通用原则
- **12-Factor App**: 无状态、配置环境化、控制平面集中
- **Google Engineering**: 可读性 >  cleverness，显式错误处理
- **语言规范**: Uber Go Style / Airbnb React Style

### 4.2 错误处理 (Go)
```go
// ✅ 正确：提供完整上下文
return fmt.Errorf("failed to dispatch order %d to vendor %d: %w", orderID, vendorID, err)

// ❌ 错误：吞掉错误
if err != nil {
    log.Println(err)
    return nil
}
```

### 4.3 组件设计 (React)
```tsx
// ✅ 正确：UI 与数据获取解耦
const OrderCard: React.FC<{ order: Order; isReadOnly: boolean }> = ({ order, isReadOnly }) => {
  // 纯 UI 渲染逻辑
};

// 数据获取在容器组件中处理
const OrderContainer: React.FC = () => {
  const { data } = useOrderQuery();
  return <OrderCard order={data} isReadOnly={isImpersonated} />;
};
```

---

## 5. 安全红线

### 5.1 数据保护
- ⚠️ **严禁删除 `beacon.db`**：该文件包含关键业务数据
- 所有数据库迁移必须可回滚
- 生产环境敏感配置必须环境变量化

### 5.2 API 安全
- 所有端点必须验证权限（五方角色隔离）
- 敏感操作需记录审计日志

---

## 6. 任务看板

### [DONE]
- [x] 项目基础结构初始化
  - 创建 docs/blog.md 文件
  - 建立 Go 项目目录结构: cmd/, internal/, pkg/
  - 建立前端目录: frontend/
  - 建立接口定义目录: api/
- [x] 依赖管理初始化
  - 执行 go mod init jobmaster
  - 安装 Go 依赖: gin, gorm, pgx
  - 初始化前端 package.json
  - 安装前端依赖: Ant Design, Zustand
- [x] 组织架构模型设计
  - 五方角色的数据模型定义 (internal/models/)
  - 权限矩阵设计 (pkg/permissions/)
  - 角色关联关系（Store ↔ Vendor ↔ Engineer）
- [x] 数据库基础架构 (2026-03-08)
  - PostgreSQL 连接池初始化 (sync.Once 线程安全)
  - Organization 模型 (HQ, Store, MainContractor, Vendor)
  - User 模型 (RBAC 角色权限)
- [x] 用户认证与权限系统 (2026-03-08)
  - bcrypt 密码哈希与验证
  - JWT Token 生成与验证 (环境变量密钥)
  - 登录 API 与 Token 刷新
  - Auth/Impersonation/Tenant 中间件
  - 统一 API 响应格式
- [x] 组织架构与用户管理 API (2026-03-08)
  - 组织创建、列表、树状查询 (BrandHQ/MainContractor)
  - 用户 CRUD、分页查询 (BrandHQ/MainContractor)
  - 角色权限校验与租户隔离
  - 模型目录重构 (models → model)

### [READY]
*暂无*

### [WIP]
*暂无*

### [TODO]
*暂无*

---

## 7. 文档同步

本文档为中文主文档，英文翻译位于 `docs/en/project.md`。
**任何更新必须中英同步**。

---

*Last Updated: 2024-03-07*
*Version: 1.0.0*
