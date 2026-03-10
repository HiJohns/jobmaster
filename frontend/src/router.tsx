import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { useAuthStore } from './store/useAuthStore'

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter