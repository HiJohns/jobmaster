import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// User info interface
export interface UserInfo {
  userId: string
  username: string
  displayName: string
  role: string
  orgId: string
  tenantId: string
}

// Auth store interface
interface AuthState {
  // State
  token: string | null
  userInfo: UserInfo | null
  isImpersonated: boolean
  isAuthenticated: boolean
  
  // Actions
  setToken: (token: string) => void
  setUserInfo: (userInfo: UserInfo) => void
  setImpersonated: (isImpersonated: boolean) => void
  login: (token: string, userInfo: UserInfo, isImpersonated?: boolean) => void
  logout: () => void
  updateUserInfo: (partialInfo: Partial<UserInfo>) => void
}

// Create auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      userInfo: null,
      isImpersonated: false,
      isAuthenticated: false,
      
      // Set token
      setToken: (token) => {
        set({ token, isAuthenticated: !!token })
      },
      
      // Set user info
      setUserInfo: (userInfo) => {
        set({ userInfo })
      },
      
      // Set impersonated status
      setImpersonated: (isImpersonated) => {
        set({ isImpersonated })
      },
      
      // Login - set both token and user info
      // isImpersonated indicates if the user is viewing data as another role (e.g., admin viewing as store)
      login: (token, userInfo, isImpersonated = false) => {
        set({
          token,
          userInfo,
          isAuthenticated: true,
          isImpersonated,
        })
      },
      
      // Logout - clear all auth data
      logout: () => {
        set({
          token: null,
          userInfo: null,
          isAuthenticated: false,
          isImpersonated: false,
        })
        // Clear local storage
        localStorage.removeItem('auth-storage')
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
        isImpersonated: state.isImpersonated,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore