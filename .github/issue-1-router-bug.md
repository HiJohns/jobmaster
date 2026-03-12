# BUG: 点击租户管理菜单界面闪退回首页

**Issue Number**: #1 (Local Tracking)
**Labels**: bug, investigation, router
**Status**: INVESTIGATED

## 问题描述
点击系统设置 => 租户管理后，界面闪了一下，URL 似乎改变后又迅速跳转回首页 (/)。

## 复现步骤
1. 登录系统
2. 点击侧边栏"系统设置"
3. 点击"租户管理"子菜单
4. 观察到界面闪动后跳回首页

## 期望行为
正常显示租户管理列表页面

## 实际行为
界面闪烁后跳转回首页，URL 从 /admin/tenants 变回 /

## 根本原因 (Root Cause)

`router.tsx` 中**缺少 `/admin/tenants` 路由定义**。

代码流程：
1. `Layout.tsx:71` 执行 `navigate('/admin/tenants')` → URL 改变为 /admin/tenants
2. `router.tsx:35` 的通配符路由 `<Route path="*" element={<Navigate to="/" replace />} />` 捕获未匹配路径
3. 强制重定向到首页 `/` → 界面"闪回"

## 影响范围
- `frontend/src/router.tsx` - 缺少路由定义（主要问题）
- `frontend/src/pages/admin/TenantList.tsx` - 组件已存在但未挂载
- `frontend/src/components/Layout.tsx` - 菜单点击正常，导航目标正确

## 修复计划
在 `router.tsx` 中添加：
```tsx
import TenantList from './pages/admin/TenantList'
// ...
<Route path="/admin/tenants" element={<TenantList />} />
```

## 验证步骤
1. 重新编译前端
2. 登录系统，点击租户管理
3. 应正常显示租户列表表格

---
**Created**: 2026-03-12
**Investigator**: Claude-Debugger
