import axios from 'axios'
import { API_BASE_URL, API_TARGET } from '../config/env'

console.log('[DEBUG client] USE_DEMO_API: true, API_BASE_URL:', API_BASE_URL, 'API_TARGET:', API_TARGET)

// API Configuration
const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 10000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
} as const

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
})

// Request interceptor - add session ID for demo mode
apiClient.interceptors.request.use(
  (config) => {
    // Add session ID header for demo mode authentication
    const sessionId = localStorage.getItem('demo_session_id')
    if (sessionId && config.headers) {
      // Use bracket notation or type assertion to avoid type issues
      (config.headers as any)['X-Session-Id'] = sessionId
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient
