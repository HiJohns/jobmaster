import axios, { AxiosInstance } from 'axios'
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
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
})

export default apiClient