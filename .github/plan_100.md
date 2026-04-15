## 🏗️ 执行计划分析 (Issue #100)

### 📋 任务现状审计

**Issue 描述**：原来的底部横条不见了（进入预约界面后无法切换到其他界面）

**问题分析**：
- TabBar 组件只在 `EngineerHomePage.tsx` 中使用
- `ReservationListPage` 和 `ReservationDetailPage` 未导入 TabBar
- 用户进入预约界面后无法返回首页或其他页面

### 🔍 代码扫描

**TabBar 使用现状**：
| 页面 | 是否有 TabBar | 路由 |
|------|--------------|------|
| EngineerHomePage | ✅ 有 | /wechat/orders |
| WorkOrderDetailPage | ❌ 无 | /wechat/orders/:id |
| ReservationListPage | ❌ **缺失** | /wechat/reservations |
| ReservationDetailPage | ❌ **缺失** | /wechat/reservations/:id |
| ConstructionRecordPage | ❌ 无 | /wechat/orders/:id/record |

### ✅ 建议执行步骤

#### 步骤 1：添加 TabBar 到 ReservationListPage
**文件**：`frontend-mobile/src/pages/ReservationListPage.tsx`

**修改**：
```tsx
import TabBar from '../components/TabBar'

// 在页面底部添加
return (
  <div style={{ paddingBottom: '60px' }}> {/* 为 TabBar 留出空间 */}
    {/* 现有内容 */}
    <TabBar />
  </div>
)
```

#### 步骤 2：添加 TabBar 到 ReservationDetailPage
**文件**：`frontend-mobile/src/pages/ReservationDetailPage.tsx`

**同样添加 TabBar 组件**

#### 步骤 3：确保页面布局正确
- 检查各页面底部是否有足够的 padding 避免内容被 TabBar 遮挡
- 建议统一使用 `paddingBottom: '60px'` 或类似值

### 📝 验收标准

- [ ] 预约列表页面显示底部导航条
- [ ] 预约详情页面显示底部导航条
- [ ] 可以从预约界面点击底部 Tab 切换到首页/我的
- [ ] TypeScript 编译通过
- [ ] npm run build 通过

---
*Model: big-pickle*
