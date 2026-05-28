# JobMaster 数据库设计文档

本文档描述 JobMaster 系统的数据库结构设计。注意：用户管理功能由外部 IAM 系统完成，本地仅存储用户映射信息。

---

## 1. 核心设计原则

- **用户管理外置**：用户认证由 IAM 系统负责，本地仅通过 `iam_sub` 关联
- **租户隔离**：所有业务表通过 `tenant_id` 实现多租户隔离
- **审计追溯**：关键操作记录审计日志
- **JSONB 存储**：灵活字段使用 JSONB 存储

---

## 2. 表结构

### 2.1 tenants (租户表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(100) | 租户名称 |
| code | VARCHAR(50) | 租户代码（唯一） |
| logo_url | VARCHAR(500) | Logo URL |
| status | SMALLINT | 状态：0-禁用 1-启用 |
| max_hops | SMALLINT | 最大跳数（由租户设定，默认 3） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| deleted_at | TIMESTAMP | 软删除时间 |

**索引**:
- `idx_tenant_code`: code

---

### 2.2 organizations (组织表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键 |
| tenant_id | UUID | 租户 ID |
| parent_id | UUID | 父组织 ID（用于树形结构） |
| name | VARCHAR(100) | 组织名称 |
| code | VARCHAR(50) | 组织代码 |
| org_type | SMALLINT | 类型：1-总店 2-分公司 3-工程公司 4-供应商 |
| contact_phone | VARCHAR(20) | 联系电话 |
| contact_email | VARCHAR(100) | 联系邮箱 |
| address | VARCHAR(500) | 地址 |
| status | SMALLINT | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| deleted_at | TIMESTAMP | 软删除时间 |

**索引**:
- `idx_org_tenant`: (tenant_id, deleted_at)
- `idx_org_parent`: (parent_id, deleted_at)
- `idx_org_code`: (tenant_id, code, deleted_at)

---

### 2.3 user_mappings (用户映射表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL | 主键 |
| tenant_id | UUID | 租户 ID |
| org_id | UUID | 组织 ID |
| iam_sub | VARCHAR(100) | IAM 用户标识（来自 IAM 系统） |
| email | VARCHAR(100) | 邮箱（用于占位符激活） |
| display_name | VARCHAR(100) | 显示名称 |
| phone | VARCHAR(20) | 电话 |
| role | VARCHAR(20) | 角色：SUPER_ADMIN, MAIN_ADMIN, TENANT_ADMIN, BRANCH_ADMIN, EMPLOYEE, CONTRACTOR_ADMIN, CONTRACTOR_EMPLOYEE, ENGINEER |
| is_shadow | BOOLEAN | 是否为占位符用户 |
| status | SMALLINT | 状态：0-禁用 1-启用 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| deleted_at | TIMESTAMP | 软删除时间 |

**索引**:
- `idx_user_tenant_iam_sub`: (tenant_id, iam_sub) - 联合唯一
- `idx_user_email`: (email, deleted_at)
- `idx_user_org`: (org_id, deleted_at)

**说明**：
- 用户由 IAM 系统管理，本地仅存储映射关系
- 首次登录时通过 IAM 同步用户信息
- `iam_sub` 为空时表示占位符用户

---

### 2.4 work_orders (工单表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键 |
| tenant_id | UUID | 租户 ID |
| order_no | VARCHAR(30) | 工单号（唯一） |
| title | VARCHAR(100) | 工单标题（必填） |
| status | SMALLINT | 状态：1-PENDING 2-DISPATCHED 3-ACCEPTED 4-RESERVED 5-WORKING 6-FINISHED 7-CLOSED |
| store_id | UUID | 分公司 ID（组织 ID） |
| engineer_id | UUID | 工程师 ID（用户 ID，可空） |
| owner_org_id | UUID | 当前负责组织 ID（可空） |
| handler_id | UUID | 当前责任人 ID（用户 ID，可空） |
| category_path | VARCHAR(100) | 分类路径（可选，如：内装/卖场/消防门） |
| brand_name | VARCHAR(50) | 品牌名称（可选） |
| info | JSONB | 扩展信息（故障描述、照片数组、是否加急等） |
| address_detail | VARCHAR(500) | 详细地址 |
| coordinates | JSONB | 坐标：{lat, lng} |
| labor_fee | DECIMAL(10,2) | 人工费 |
| material_fee | DECIMAL(10,2) | 材料费 |
| other_fee | DECIMAL(10,2) | 其他费用 |
| appointment_type | SMALLINT | 上门方式：1-指定上门时段(默认) 2-要求提前预约 |
| appointed_at | TIMESTAMP | 预约时间 |
| started_at | TIMESTAMP | 开始时间 |
| finished_at | TIMESTAMP | 完工时间 |
| closed_at | TIMESTAMP | 关闭时间 |
| owner_org_id | UUID | 所属单位（当前负责的组织 ID） |
| hop_count | SMALLINT | 当前跳数 |
| max_hops | SMALLINT | 最大跳数（由租户设定） |
| created_by | BIGINT | 创建人 ID（用户映射表） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| deleted_at | TIMESTAMP | 软删除时间 |

**索引**:
- `idx_order_tenant`: (tenant_id, deleted_at)
- `idx_order_status`: (tenant_id, status)
- `idx_order_store`: (tenant_id, store_id)
- `idx_order_owner_org`: (tenant_id, owner_org_id)
- `idx_order_handler`: (tenant_id, handler_id)
- `idx_order_engineer`: (tenant_id, engineer_id)
- `idx_order_appointed`: (tenant_id, appointed_at)
- `idx_order_no`: (order_no) - 唯一
- `idx_order_coordinates`: coordinates - GIN 索引

---

### 2.5 reservations (预约表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键 |
| work_order_id | UUID | 关联工单 ID |
| proposer_id | BIGINT | 预约发起人 ID（用户 ID） |
| proposed_time | TIMESTAMP | 预约时间 |
| status | VARCHAR(20) | 预约状态：pending/confirmed/rejected/expired |
| reject_reason | TEXT | 拒绝原因 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**预约状态说明**:
- `pending` (待确认): 等待分公司确认
- `confirmed` (已确认): 分公司已确认
- `rejected` (已拒绝): 分公司拒绝预约

**说明**: 预约确认不影响工单状态，仅记录预约意向。工单状态由工程师确认预约后变为 RESERVED。
- `expired` (已过期): 预约时间已过

**索引**:
- `idx_reservation_work_order`: (work_order_id, created_at)
- `idx_reservation_proposer`: (proposer_id, created_at)
- `idx_reservation_status`: (status, proposed_time)
- `idx_reservation_time`: (proposed_at)

**业务逻辑**:
- 一个工单可以有多个预约提议（历史记录）
- 只有最新且 status = confirmed 的预约才有效
- 预约确认后，工单状态自动转为 RESERVED（二次握手）
- 预约拒绝后，工单状态保持不变（仍为 ACCEPTED），需要重新发起预约

---

### 2.6 work_order_logs (工单审计日志表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL | 主键 |
| order_id | UUID | 工单 ID |
| action | VARCHAR(50) | 操作类型 |
| operator_id | BIGINT | 操作人 ID |
| details | JSONB | 详细信息 |
| created_at | TIMESTAMP | 创建时间 |

**索引**:
- `idx_log_order`: (order_id, created_at)

**action 常量**:
- `CREATE`: 创建工单
- `DISPATCH`: 分配工单
- `ACCEPT`: 接单
- `REJECT`: 拒单
- `RESERVE`: 预约时间
- `GENERATE_QR`: 生成二维码
- `ARRIVE`: 进场确认
- `RECORD`: 施工记录
- `FINISH`: 完工离场
- `ACCEPTED`: 验收通过
- `REJECTED`: 验收不通过
- `ASSIGN_ENGINEER`: 分配工程师

---

### 2.6 work_records (施工记录表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL | 主键 |
| order_id | UUID | 工单 ID |
| engineer_id | BIGINT | 工程师 ID |
| record_type | VARCHAR(20) | 记录类型：MESSAGE/PHOTO |
| content | TEXT | 文字内容（可选） |
| photos | JSONB | 照片 URL 数组 |
| location | JSONB | 位置信息：{lat, lng} |
| created_at | TIMESTAMP | 创建时间 |

**索引**:
- `idx_record_order`: (order_id, created_at)

---

### 2.7 qrcode_tokens (二维码令牌表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL | 主键 |
| order_id | UUID | 工单 ID |
| token | VARCHAR(64) | 令牌（唯一） |
| status | SMALLINT | 状态：0-未使用 1-已使用 |
| expired_at | TIMESTAMP | 过期时间 |
| created_at | TIMESTAMP | 创建时间 |

**索引**:
- `idx_qr_token`: (token) - 唯一

---

### 2.8 branch_contractors (分公司-工程公司关联表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL | 主键 |
| branch_id | UUID | 分公司 ID |
| contractor_id | UUID | 工程公司 ID |
| created_at | TIMESTAMP | 创建时间 |

**索引**:
- `idx_bc_branch`: (branch_id)
- `idx_bc_contractor`: (contractor_id)

---

### 2.9 vendor_contracts (供应商-工程公司关联表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL | 主键 |
| vendor_id | UUID | 供应商 ID |
| contractor_id | UUID | 工程公司 ID |
| created_at | TIMESTAMP | 创建时间 |

**索引**:
- `idx_vc_vendor`: (vendor_id)
- `idx_vc_contractor`: (contractor_id)

---

## 3. 状态机定义

### 工单状态流转

```
PENDING (1) → DISPATCHED (2) → ACCEPTED (3)
                                      │
                                      ▼ (预约确定)
                                RESERVED (4)
                                      │
                                      ▼ (开工)
                                  WORKING (5)
                                      │
                                      ▼ (完工)
                                  FINISHED (6)
                                      │
                                      ▼ (验收通过)
                                    CLOSED (7)
```

### 拒单回流

```
DISPATCHED (2) --拒单--> PENDING (1)
```

### 验收不通过回流

```
FINISHED (6) --验收拒绝--> DISPATCHED (2)
```

### 二次握手逻辑

- **ACCEPTED (3)**: 工程师接单后设置预约时间，等待分公司确认
- **RESERVED (4)**: 分公司确认预约时间后正式进入预约状态

---

## 4. 权限矩阵

| 角色 | 可创建租户 | 可创建组织 | 可创建工单 | 可分配工单 | 可施工 | 可验收 | 可关联组织 |
|------|------------|------------|------------|------------|--------|--------|------------|
| SUPER_ADMIN | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MAIN_ADMIN | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| TENANT_ADMIN | ❌ | ✅ (分公司) | ❌ | ❌ | ❌ | ❌ | ✅ (需提权) |
| BRANCH_ADMIN | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ (需提权) |
| EMPLOYEE | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| CONTRACTOR_ADMIN | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (需提权) |
| CONTRACTOR_EMPLOYEE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| ENGINEER | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| VENDOR_ADMIN | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (需提权) |
| VENDOR_EMPLOYEE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

**关联组织说明**：
- 租户管理员：给分公司指定工程公司（需提权）
- 分公司管理员：给自己所属分公司指定工程公司（需提权）
- 工程公司管理员：给工程公司指定供应商（需提权）
- 供应商管理员：可进行供应商相关关联操作（需提权）

---

## 5. 数据一致性

### 软删除
- 所有业务表使用 `deleted_at` 字段实现软删除
- 查询时自动过滤已删除记录（GORM Scopes）

### 租户隔离
- 所有查询必须携带 `tenant_id` 条件
- 使用 GORM Scopes 实现自动租户过滤

### 审计日志
- 工单关键操作记录到 `work_order_logs`
- 施工过程中的留言和照片记录到 `work_records`