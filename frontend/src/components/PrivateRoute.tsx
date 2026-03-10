/**
 * Private Route Guard Component
 * Redirects unauthenticated users to /login
 * 
 * Features:
 * - Checks authentication status from useAuthStore
 * - Redirects to login if not authenticated
 * - Wraps protected routes with ReadOnlyWatermark
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import ReadOnlyWatermark from './ReadOnlyWatermark'

interface PrivateRouteProps {
  /** Child components to render if authenticated */
  children: React.ReactNode
}

/**
 * Private Route Guard
 * 
 * Usage:
 * ```tsx
 * <Route path="/dashboard" element={
 *   <PrivateRoute>
 *     <Dashboard />
 *   </PrivateRoute>
 * } />
 * ```
 */
function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  // Check if user is authenticated
  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Render children with read-only watermark wrapper
  return <ReadOnlyWatermark>{children}</ReadOnlyWatermark>
}

export default PrivateRoute
