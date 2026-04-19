export const USE_LOCAL_API = false

export const USE_DEMO_API = true

export const API_BASE_URL = '/api/demo'

export const API_TARGET = 'http://localhost:5555'

// 当前登录用户的角色（用于 Demo API 过滤）
let currentDemoUserRole = ''

export const setDemoUserRole = (role: string) => {
  currentDemoUserRole = role
}

export const getDemoUserRole = () => currentDemoUserRole
export const WorkOrderStatusPendingEvaluation = 'PENDING_EVALUATION'
