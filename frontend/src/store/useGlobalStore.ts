import { create } from 'zustand'

// Global store interface
interface GlobalState {
  // Loading state
  loading: boolean
  loadingText: string
  
  // Message/Snackbar state
  message: {
    type: 'success' | 'error' | 'warning' | 'info'
    content: string
    visible: boolean
  }
  
  // Actions
  setLoading: (loading: boolean, text?: string) => void
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void
  hideMessage: () => void
  reset: () => void
}

// Initial state
const initialState = {
  loading: false,
  loadingText: '',
  message: {
    type: 'info' as const,
    content: '',
    visible: false,
  },
}

// Create global store
export const useGlobalStore = create<GlobalState>()((set) => ({
  ...initialState,
  
  // Set loading state
  setLoading: (loading, text = '') => {
    set({ loading, loadingText: text })
  },
  
  // Show message/snackbar
  showMessage: (type, content) => {
    set({
      message: {
        type,
        content,
        visible: true,
      },
    })
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      set((state) => ({
        message: { ...state.message, visible: false },
      }))
    }, 3000)
  },
  
  // Hide message
  hideMessage: () => {
    set((state) => ({
      message: { ...state.message, visible: false },
    }))
  },
  
  // Reset all state
  reset: () => {
    set(initialState)
  },
}))

// Helper hooks for common operations
export const useLoading = () => {
  const { loading, loadingText, setLoading } = useGlobalStore()
  return { loading, loadingText, setLoading }
}

export const useMessage = () => {
  const { message, showMessage, hideMessage } = useGlobalStore()
  return { message, showMessage, hideMessage }
}

export default useGlobalStore