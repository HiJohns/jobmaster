import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Brand config interface
export interface BrandConfig {
  logo_url: string
  primary_color: string
  brand_name: string
}

// User info interface
export interface UserInfo {
  userId: string
  username: string
  displayName: string
  role: string
  orgId: string
  orgName?: string
  orgAddress?: string
  tenantId: string
}

// Auth store interface
interface AuthState {
  // State
  token: string | null
  userInfo: UserInfo | null
  brandConfig: BrandConfig | null
  isImpersonated: boolean
  isAuthenticated: boolean
  adminToken: string | null
  adminUserInfo: UserInfo | null
  
  // Actions
  setToken: (token: string) => void
  setUserInfo: (userInfo: UserInfo) => void
  setBrandConfig: (config: BrandConfig) => void
  setImpersonated: (isImpersonated: boolean) => void
  login: (token: string, userInfo: UserInfo, brandConfig?: BrandConfig, isImpersonated?: boolean) => void
  logout: () => void
  updateUserInfo: (partialInfo: Partial<UserInfo>) => void
  impersonate: (token: string, userInfo: UserInfo) => void
  exitImpersonation: () => void
}

// Create auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      userInfo: null,
      brandConfig: null,
      isImpersonated: false,
      isAuthenticated: false,
      adminToken: null,
      adminUserInfo: null,
      
      // Set token
      setToken: (token) => {
        set({ token, isAuthenticated: !!token })
      },
      
      // Set user info
      setUserInfo: (userInfo) => {
        set({ userInfo })
      },
      
      // Set brand config
      setBrandConfig: (brandConfig) => {
        set({ brandConfig })
        localStorage.setItem('brand_config', JSON.stringify(brandConfig))
      },
      
      // Set impersonated status
      setImpersonated: (isImpersonated) => {
        set({ isImpersonated })
      },
      
      // Login - set both token and user info
      // isImpersonated indicates if the user is viewing data as another role (e.g., admin viewing as store)
      login: (token, userInfo, brandConfig, isImpersonated = false) => {
        // If not impersonating, save user info for potential admin recovery
        if (!isImpersonated) {
          localStorage.setItem('admin_user_info', JSON.stringify(userInfo))
        }
        set({
          token,
          userInfo,
          brandConfig,
          isAuthenticated: true,
          isImpersonated,
        })
      },
      
      // Logout - clear all auth data
      logout: () => {
        set({
          token: null,
          userInfo: null,
          brandConfig: null,
          isAuthenticated: false,
          isImpersonated: false,
          adminToken: null,
          adminUserInfo: null,
        })
        // Clear local storage
        localStorage.removeItem('auth-storage')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user_info')
        localStorage.removeItem('brand_config')
      },
      
      // Update partial user info
      updateUserInfo: (partialInfo) => {
        const currentInfo = get().userInfo
        if (currentInfo) {
          set({
            userInfo: { ...currentInfo, ...partialInfo },
          })
        }
      },

      // Impersonate - switch to tenant user
      impersonate: (token, userInfo) => {
        const currentToken = get().token
        const currentUserInfo = get().userInfo
        
        // Save current admin token
        if (currentToken && currentUserInfo) {
          localStorage.setItem('admin_token', currentToken)
          set({
            adminToken: currentToken,
            adminUserInfo: currentUserInfo,
          })
        }
        
        set({
          token,
          userInfo,
          isAuthenticated: true,
          isImpersonated: true,
        })
      },

      // Exit impersonation - switch back to admin
      exitImpersonation: () => {
        const adminToken = get().adminToken
        const adminUserInfo = get().adminUserInfo
        
        if (adminToken && adminUserInfo) {
          set({
            token: adminToken,
            userInfo: adminUserInfo,
            isAuthenticated: true,
            isImpersonated: false,
            adminToken: null,
            adminUserInfo: null,
          })
          localStorage.removeItem('admin_token')
        }
      },
    }),
    {
      name: 'auth-storage',
      // SECURITY NOTE: Storing token in localStorage is vulnerable to XSS attacks.
      // This is a frontend architecture trade-off for SPA applications.
      // Production environments should use httpOnly cookies with CSRF protection.
      // See: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        userInfo: state.userInfo,
        brandConfig: state.brandConfig,
        isImpersonated: state.isImpersonated,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore