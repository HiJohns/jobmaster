import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../store/useAuthStore'

// API Configuration
const API_CONFIG = {
  BASE_URL: '/api/v1',
  TIMEOUT: 10000, // 10 seconds
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
} as const

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
})

// Request interceptor - inject token
apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState()
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return response data directly
    return response.data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Token expired or invalid
          message.error('登录已过期，请重新登录')
          useAuthStore.getState().logout()
          window.location.href = '/login'
          break
          
        case 403:
          message.error('没有权限执行此操作')
          break
          
        case 404:
          message.error('请求的资源不存在')
          break
          
        case 400:
          message.error(data?.message || '请求参数错误')
          break
          
        case 500:
          message.error('服务器内部错误')
          break
          
        default:
          message.error(data?.message || '请求失败')
      }
    } else if (error.request) {
      message.error('网络连接失败，请检查网络')
    } else {
      message.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

// API response wrapper
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// Generic request methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.get(url, config),
    
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.post(url, data, config),
    
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.put(url, data, config),
    
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.delete(url, config),
}

export default apiClient