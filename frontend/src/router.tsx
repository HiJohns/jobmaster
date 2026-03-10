import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import WorkOrderList from './pages/WorkOrderList'
import WorkOrderDetail from './pages/WorkOrderDetail'
import AppLayout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes with Layout */}
        <Route element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<Home />} />
          <Route path="/workorders" element={<WorkOrderList />} />
          <Route path="/workorder/:id" element={<WorkOrderDetail />} />
          
          {/* Tab routes */}
          <Route path="/inspection" element={<Home />} />
          <Route path="/materials" element={<Home />} />
          <Route path="/dispatch" element={<Home />} />
          <Route path="/service" element={<Home />} />
          <Route path="/cost" element={<Home />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter