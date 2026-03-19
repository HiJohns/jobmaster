import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_info'

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getUserInfo = () => {
  const userStr = localStorage.getItem(USER_KEY)
  return userStr ? JSON.parse(userStr) : null
}

export const isAuthenticated = (): boolean => {
  return !!getToken()
}

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  const token = getToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

function authResponseInterceptor(error: AxiosError) {
  if (error.response?.status === 401) {
    removeToken()
    window.location.href = '/login'
  }
  return Promise.reject(error)
}

export const setupInterceptors = (navigate?: (path: string) => void) => {
  axios.interceptors.request.use(authRequestInterceptor, (error) => {
    return Promise.reject(error)
  })

  axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        removeToken()
        if (navigate) {
          navigate('/login')
        } else {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )
}

export const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

request.interceptors.request.use(authRequestInterceptor)
request.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      removeToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request
