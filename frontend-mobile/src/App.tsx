import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import EngineerHomePage from './pages/EngineerHomePage'
import WorkOrderDetailPage from './pages/WorkOrderDetailPage'
import ConstructionRecordPage from './pages/ConstructionRecordPage'
import ReservationListPage from './pages/ReservationListPage'
import ReservationDetailPage from './pages/ReservationDetailPage'
import CreateOrderPage from './pages/CreateOrderPage'
import VerifyOrderPage from './pages/VerifyOrderPage'
import LoginPage from './pages/Login'
import { useAuthStore } from './store/useAuthStore'
import { initializeMockData } from './api/local'

/**
 * PrivateRoute - 路由守卫组件
 * 功能：检查用户是否已登录，未登录则跳转到登录页
 */
function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

/**
 * App - 微信端主应用
 */
export default function App() {
  const { isAuthenticated } = useAuthStore()

  // 初始化 mock 数据
  useEffect(() => {
    if (isAuthenticated) {
      initializeMockData()
    }
  }, [isAuthenticated])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/wechat/orders" 
          element={
            <PrivateRoute>
              <EngineerHomePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/wechat/orders/:id" 
          element={
            <PrivateRoute>
              <WorkOrderDetailPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/wechat/orders/:id/record" 
          element={
            <PrivateRoute>
              <ConstructionRecordPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/wechat/reservations" 
          element={
            <PrivateRoute>
              <ReservationListPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/wechat/reservations/:id" 
          element={
            <PrivateRoute>
              <ReservationDetailPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/wechat/orders/create" 
          element={
            <PrivateRoute>
              <CreateOrderPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/wechat/orders/:id/verify" 
          element={
            <PrivateRoute>
              <VerifyOrderPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/wechat/orders" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Router>
  )
}
