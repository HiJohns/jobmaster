import { demoApiClient } from './client'

let currentUserRole = ''

export const demoApi = {
  setUserRole: (role: string) => {
    currentUserRole = role
  },
  getUserRole: () => currentUserRole,
  request: async (config: { url: string; method: string; data?: unknown; params?: Record<string, unknown> }) => {
    const response = await demoApiClient.request(config)
    return response
  },
  getWorkOrders: async (_params?: Record<string, unknown>) => {
    let statusFilter = ''
    
    if (currentUserRole === 'BRANCH_ADMIN' || currentUserRole === 'EMPLOYEE') {
      statusFilter = ''
    } else if (currentUserRole === 'ENGINEER') {
      statusFilter = 'ACCEPTED,RESERVED,WORKING'
    } else if (currentUserRole === 'CONTRACTOR_EMPLOYEE' || currentUserRole === 'CONTRACTOR_ADMIN') {
      statusFilter = 'DISPATCHED,ACCEPTED,RESERVED,WORKING'
    } else if (currentUserRole === 'VENDOR_EMPLOYEE' || currentUserRole === 'VENDOR_ADMIN') {
      statusFilter = 'DISPATCHED,ACCEPTED,RESERVED,WORKING'
    }
    
    const response = await demoApiClient.request({
      url: '/workorders',
      method: 'GET',
      params: { status: statusFilter },
    })
    return response.data || response
  },
  getWorkOrder: async (id: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}`,
      method: 'GET',
    })
    return response.data || response
  },
  updateWorkOrder: async (id: string, data: Record<string, unknown>) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}`,
      method: 'PUT',
      data,
    })
    return response.data || response
  },
  dispatchWorkOrder: async (id: string, vendor_id: string, engineer_id?: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}/dispatch`,
      method: 'POST',
      data: { vendor_id, engineer_id },
    })
    return response.data || response
  },
  acceptWorkOrder: async (id: string, scheduled_at: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}/accept`,
      method: 'POST',
      data: { scheduled_at },
    })
    return response.data || response
  },
  reserveWorkOrder: async (id: string, appointed_at: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}/reserve`,
      method: 'POST',
      data: { appointed_at },
    })
    return response.data || response
  },
  arriveWorkOrder: async (id: string, latitude: number, longitude: number) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}/arrive`,
      method: 'POST',
      data: { latitude, longitude },
    })
    return response.data || response
  },
  verifyWorkOrder: async (id: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}/verify`,
      method: 'POST',
    })
    return response.data
  },
  rejectWorkOrder: async (id: string, reason: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}/reject`,
      method: 'POST',
      data: { reason },
    })
    return response.data
  },
  generateQRCode: async (id: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${id}/qrcode`,
      method: 'GET',
    })
    return response.data
  },
  login: async (username: string, password: string) => {
    const response = await demoApiClient.request({
      url: '/auth/login',
      method: 'POST',
      data: { username, password },
    })
    if (response.data && response.data.user) {
      currentUserRole = response.data.user.role
    }
    if (response.data && response.data.session) {
      localStorage.setItem('demo_session_id', response.data.session)
    }
    return response.data || response
  },
  getWorkOrderRecords: async (workOrderId: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${workOrderId}/records`,
      method: 'GET',
    })
    return response.data || response
  },
  getRegions: async () => {
    const response = await demoApiClient.request({
      url: '/regions',
      method: 'GET',
    })
    return response.data || response
  },
  getRegionCategories: async (region: string) => {
    const response = await demoApiClient.request({
      url: `/regions/${encodeURIComponent(region)}/categories`,
      method: 'GET',
    })
    return response.data || response
  },
  createWorkOrder: async (data: {
    title: string
    description: string
    category_id: string
    category_path: string
    photo_urls: string[]
    priority: number
    is_urgent: boolean
    address_detail: string
    division_id?: string | null
  }) => {
    const response = await demoApiClient.request({
      url: '/workorders',
      method: 'POST',
      data,
    })
    return response.data || response
  },
  finishWorkOrder: async (workOrderId: string, data: {description: string, photo_urls?: string[]}) => {
    const response = await demoApiClient.request({
      url: `/workorders/${workOrderId}/finish`,
      method: "POST",
      data
    })
    return response.data || response
  },
  getDispatchableTargets: async () => {
    const response = await demoApiClient.request({
      url: '/dispatchable-targets',
      method: 'GET',
    })
    return response.data || response
  },
  getOrganizationEngineers: async (orgId: string) => {
    const response = await demoApiClient.request({
      url: `/organizations/${orgId}/engineers`,
      method: 'GET',
    })
    return response.data || response
  },
  assignWorkOrder: async (workOrderId: string, engineerId: string) => {
    const response = await demoApiClient.request({
      url: `/workorders/${workOrderId}/assign`,
      method: 'POST',
      data: { engineer_id: engineerId },
    })
    return response.data || response
  },
}
