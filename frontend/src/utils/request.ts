/**
 * HTTP Request Utility
 * Axios wrapper with automatic token injection and 401 redirect
 * 
 * Features:
 * - Automatic Authorization header injection from auth store
 * - 401 automatic redirect to login page
 * - Request/Response interceptors for global error handling
 * - Type-safe API methods
 */

import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { Toast } from 'antd-mobile'
import { useAuthStore } from '../store/useAuthStore'

// API Configuration constants
const API_BASE_URL = '/api/v1'
const REQUEST_TIMEOUT = 10000 // 10 seconds

/**
 * Create configured axios instance
 */
const createRequest = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor - inject auth token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const { token } = useAuthStore.getState()
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      return config
    },
    (error: AxiosError) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor - handle errors and 401 redirect
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Return standardized response format
      return response.data
    },
    (error: AxiosError) => {
      if (error.response) {
        const { status, data } = error.response
        const errorMessage = (data as { message?: string })?.message || '请求失败'

        switch (status) {
          case 401:
            // Token expired or invalid - clear auth and redirect
            Toast.show({
              content: '登录已过期，请重新登录',
              position: 'center',
            })
            useAuthStore.getState().logout()
            window.location.href = '/login'
            break

          case 403:
            Toast.show({
              content: '没有权限执行此操作',
              position: 'center',
            })
            break

          case 404:
            Toast.show({
              content: '请求的资源不存在',
              position: 'center',
            })
            break

          case 400:
            Toast.show({
              content: errorMessage,
              position: 'center',
            })
            break

          case 500:
            Toast.show({
              content: '服务器内部错误',
              position: 'center',
            })
            break

          default:
            Toast.show({
              content: errorMessage,
              position: 'center',
            })
        }
      } else if (error.request) {
        // Network error
        Toast.show({
          content: '网络连接失败，请检查网络',
          position: 'center',
        })
      } else {
        // Request configuration error
        Toast.show({
          content: '请求配置错误',
          position: 'center',
        })
      }

      return Promise.reject(error)
    }
  )

  return instance
}

// Create singleton instance
const request = createRequest()

/**
 * API Response interface
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/**
 * HTTP request methods with type safety
 */
export const http = {
  /**
   * GET request
   */
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    request.get(url, config),

  /**
   * POST request
   */
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    request.post(url, data, config),

  /**
   * PUT request
   */
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    request.put(url, data, config),

  /**
   * DELETE request
   */
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    request.delete(url, config),

  /**
   * PATCH request
   */
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    request.patch(url, data, config),
}

/**
 * Raw axios instance for advanced usage
 */
export { request }

export default http
