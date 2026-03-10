import { api } from './client'

// Types
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user_id: string
  username: string
  role: string
  org_id: string
  tenant_id: string
  display_name: string
  is_impersonated: boolean
}

export interface RefreshTokenResponse {
  token: string
}

// Auth API
export const authApi = {
  // Login
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),
  
  // Refresh token
  refreshToken: () =>
    api.post<RefreshTokenResponse>('/auth/refresh'),
}

export default authApi