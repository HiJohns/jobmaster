---
description: 执行 Senior Architect Review 及精准并发归档 (批量版)
---
你当前的角色是 **Senior Principal Architect & Security Auditor**。请读取 `project.md` 中 `[READY]` 列表指定的 Patch 文件进行审查。

### 审查标准 (核心功能 - 严禁丢失)
1. **安全优先**：检查硬编码密钥、SQL 注入风险、不安全的连接及输入验证。
2. **并发安全**：检查 Go 竞态条件（如：无锁访问 map、协程泄漏）。
3. **错误处理**：**严禁**使用 `_` 忽略错误，错误必须包含上下文（`fmt.Errorf("...: %w", err)`）。
4. **代码规范**：
   - Go: 严格遵循 **Uber Go Style Guide**。
   - React/TS: 严格遵循 **Airbnb Style Guide**（仅限函数组件与 Hooks）。
5. **逻辑与性能**：识别低效循环 (O(N^2))、不必要的内存分配及违反 "12-Factor App" 原则。

### 审查结果判定

#### 分支 A：存在问题（打回修改）
按以下格式输出：
- Severity: [Critical/Major/Minor] | [文件名]:[行号] | [问题描述]
- Recommendation: [具体修复建议]
*(输出完毕后立即停止，等待开发者修改)*

#### 分支 B：代码完美 (LGTM & 精准提交)
1. 输出："LGTM (Looks Good To Me)."
2. **精准提交协议**：
   - **拉取防突**：执行 `git pull --rebase`。
   - **日志追加 (blog.md)**：在末尾追加本次批量修改的 Raw Entry（中文）。
   - **日志归档 (重要)**：检查 `blog.md` 中是否存在【以前日期】的 Raw Entry。如果有，将其合并为 Daily Summary（倒序）。**禁止**为“今天”生成的 Raw Entries 创建 Summary。
   - **状态同步**：将 `project.md` 中 `[READY]` 任务移至 `[DONE]`，清空 `[READY]` 列表。
   - **精准暂存 (严禁 add .)**：仅 add Patch 中涉及的【修改文件】、`docs/blog.md` 和 `project.md`。
   - **提交推送**：`git commit -m "[Batch Update] 执行了 [任务摘要]"` 并 `git push origin`。
   - **清理现场**：`rm` 掉所有已处理的 Patch 文件。
    - **告知完成**。

---

## [2026-03-08 04:50:00] | Request | WorkOrder 核心模型、状态机服务与工单 API 实现
**Developer**: Claude-Dev
**Status**: 🔵 PENDING_REVIEW
**Patches**:
- review_workorder_model.patch (WorkOrder 核心模型、GORM Scopes、状态约束)
- review_order_service.patch (状态机服务、TransitTo 方法、流转白名单)
- review_workorder_migration.patch (数据库迁移、GIN 索引)
- review_orderno_generator.patch (单号生成器、SaaS 扩展接口)
- review_workorder_api.patch (工单 API：创建、列表、指派、接单/拒单)
- review_router_update.patch (路由注册)

### Scope
1. WorkOrder 核心模型：基础字段、JSONB info/logs、8 个状态常量、MarkUrgent()、GORM Scopes
2. 状态机服务：TransitTo() 方法、Map 流转白名单、ErrInvalidStateTransition、回流逻辑支持
3. 数据库迁移：DDL、GIN 索引 (jsonb_path_ops)、复合索引
4. 单号生成器：WO-YYYYMMDD-C{OrgID}-XXXX 格式、接口预留
5. 工单 API：
   - 分店报修（STORE 角色）
   - 工单列表（角色视图隔离、Tenant/Store Scope）
   - 指派工单（MAIN_CONTRACTOR）
   - 接单/拒单（VENDOR/ENGINEER）
6. 日志证据链：只增不减的 JSONB 数组模式

### Checklist
- [ ] Security audit (SQL 注入防护、权限校验、JSONB 安全)
- [ ] Concurrency check (单号生成器、状态机事务)
- [ ] Error handling review (完整错误上下文、无吞错)
- [ ] Style compliance (Uber Go Style、状态机封装规范)

---

## [2026-03-08 05:00:00] | Review | WorkOrder 核心模型、状态机服务与工单 API 实现
**Reviewer**: Claude-Arch
**Status**: 🔴 REJECTED
**Previous**: Request (2026-03-08 04:50:00)

### Issues

**[Critical] pkg/utils/orderno.go:46 | 并发安全风险**
- 问题：`math/rand.Intn(10000)` 在高并发下可能生成重复单号
- Recommendation: 使用 `crypto/rand` 替代，或实现基于数据库序列/Redis 的递增计数器

**[Major] internal/api/workorder.go:134 | 日志用户名缺失**
- 问题：审计日志中 `userName` 参数传递空字符串，缺少操作人姓名
- Recommendation: 从 JWT claims 或数据库获取用户名

**[Minor] internal/api/workorder.go:285,322,359 | TODO 未实现**
- 问题：派遣/接受/拒绝工单的审计日志多处 `userName := "" // TODO`
- Recommendation: 统一实现用户名获取逻辑

**[Minor] pkg/utils/orderno.go:73-75 | 冗余代码**
- 问题：Go 1.20+ 已自动为 `math/rand` 设置随机种子，`init()` 函数冗余
- Recommendation: 删除 `init()` 函数

### Action Required
开发者请使用 `/fixreview` 指令查看并修复上述问题。

---

## [2026-03-08 05:15:00] | Fix | WorkOrder 核心模型、状态机服务与工单 API 实现
**Developer**: Claude-Dev
**Status**: 🔵 PENDING_REVIEW
**Previous**: Review (2026-03-08 05:00:00)

### Fixes Applied
- [x] [Critical] pkg/utils/orderno.go:46 - 使用 `crypto/rand` 替代 `math/rand`，确保并发安全和密码学安全性
- [x] [Major] internal/api/workorder.go:134 - 添加 `getCurrentUserName()` 辅助函数，从数据库获取用户 display_name 或 username 用于审计日志
- [x] [Minor] internal/api/workorder.go:285,322,359 - 统一使用 `getCurrentUserName()` 替换所有 TODO 占位符
- [x] [Minor] pkg/utils/orderno.go:73-75 - 删除冗余的 `init()` 函数（Go 1.20+ 自动设置随机种子）

### Changes
- pkg/utils/orderno.go: 导入 `crypto/rand` 和 `math/big`，替换 `math/rand`，删除 `init()` 函数，添加错误处理
- internal/api/workorder.go: 新增 `getCurrentUserName()` 函数，统一替换所有 `userName := "" // TODO` 为 `userName := getCurrentUserName(c, userID)`
- review_orderno_generator.patch: 更新
- review_workorder_api.patch: 更新

### Verification
- [x] 项目构建成功 (`go build ./...`)
- [x] 所有审核问题已逐条修复
- [x] Patch 文件已更新
