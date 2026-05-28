import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  isAuthenticated: boolean
  
  // Actions
  setToken: (token: string) => void
  setUserInfo: (userInfo: UserInfo) => void
  login: (token: string, userInfo: UserInfo) => void
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
      isAuthenticated: false,
      
      // Actions
      setToken: (token: string) => {
        set({ token })
      },
      
      setUserInfo: (userInfo: UserInfo) => {
        set({ userInfo, isAuthenticated: !!userInfo })
      },
      
      login: (token: string, userInfo: UserInfo) => {
        set({
          token,
          userInfo,
          isAuthenticated: true,
        })
      },
      
      logout: () => {
        set({
          token: null,
          userInfo: null,
          isAuthenticated: false,
        })
      },
      
      updateUserInfo: (partialInfo: Partial<UserInfo>) => {
        const currentUserInfo = get().userInfo
        if (currentUserInfo) {
          set({
            userInfo: { ...currentUserInfo, ...partialInfo },
          })
        }
      },
    }),
    {
      name: 'mobile-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        userInfo: state.userInfo,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
