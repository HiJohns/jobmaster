import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = '/api/demo'

let currentUserRole = ''

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const demoApi = {
  setUserRole: (role: string) => {
    currentUserRole = role
  },
  getUserRole: () => currentUserRole,
  request: async (config: { url: string; method: string; data?: unknown; params?: Record<string, unknown> }) => {
    const response = await apiClient.request(config)
    return response
  },
  getWorkOrders: async (params?: Record<string, unknown>) => {
    // 根据角色设置不同的状态过滤
    let statusFilter = '' // 不设置则返回全部
    
    if (currentUserRole === 'BRANCH_ADMIN' || currentUserRole === 'EMPLOYEE') {
      // 分公司管理员、员工：查看所有工单
      statusFilter = ''
    } else if (currentUserRole === 'ENGINEER') {
      // 工程师：查看已分配给自己的
      statusFilter = 'ACCEPTED,RESERVED,WORKING'
    } else if (currentUserRole === 'CONTRACTOR_EMPLOYEE' || currentUserRole === 'CONTRACTOR_ADMIN') {
      // 工程公司员工：查看已分配给自己的
      statusFilter = 'DISPATCHED,ACCEPTED,RESERVED,WORKING'
    } else if (currentUserRole === 'VENDOR_EMPLOYEE' || currentUserRole === 'VENDOR_ADMIN') {
      // 供应商：查看与自己相关的（不包括 FINISHED）
      statusFilter = 'DISPATCHED,ACCEPTED,RESERVED,WORKING'
    }
    
    const response = await apiClient.request({
      url: '/workorders',
      method: 'GET',
      params: { ...params, status: statusFilter },
    })
    return response.data || response
  },
  login: async (username: string, password: string) => {
    const response = await apiClient.request({
      url: '/auth/login',
      method: 'POST',
      data: { username, password },
    })
    // Extract role from response
    if (response.data && response.data.user) {
      currentUserRole = response.data.user.role
    }
    return response.data || response
  },
}

export default apiClient