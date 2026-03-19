import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import WorkOrderList from './pages/WorkOrderList'
import WorkOrderDetail from './pages/WorkOrderDetail'
import AssetList from './pages/AssetList'
import AssetDetail from './pages/AssetDetail'
import AssetMonitor from './pages/AssetMonitor'
import TenantList from './pages/admin/TenantList'
import TenantCreateSuccess from './pages/admin/TenantCreateSuccess'
import AppLayout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import DynamicThemeLoader from './components/DynamicTheme'

function AppRouter() {
  return (
    <BrowserRouter>
      <DynamicThemeLoader>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/home" element={<Home />} />
            <Route path="/workorders" element={<WorkOrderList />} />
            <Route path="/workorder/:id" element={<WorkOrderDetail />} />
            <Route path="/assets" element={<AssetList />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/asset-monitor" element={<AssetMonitor />} />
            
            <Route path="/inspection" element={<Home />} />
            <Route path="/materials" element={<Home />} />
            <Route path="/dispatch" element={<Home />} />
            <Route path="/service" element={<Home />} />
            <Route path="/cost" element={<Home />} />
            
             <Route path="/admin/tenants" element={<TenantList />} />
             <Route path="/admin/tenants/success" element={<TenantCreateSuccess />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DynamicThemeLoader>
    </BrowserRouter>
  )
}

export default AppRouter
