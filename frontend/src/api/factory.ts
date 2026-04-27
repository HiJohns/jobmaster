import { USE_LOCAL_API, USE_DEMO_API, API_BASE_URL, setDemoUserRole, getDemoUserRole } from '../config/env'
import { localAuthApi, localWorkorderApi, localOrganizationApi, localReservationApi, initializeMockData } from './local'
import { authApi, workorderApi } from './index'
import apiClient from './client'

console.log('[DEBUG] env config:', { USE_LOCAL_API, USE_DEMO_API, API_BASE_URL })

export const setUserRole = (role: string) => {
  setDemoUserRole(role)
}

const getUserRole = () => getDemoUserRole()

const shouldUseLocal = (): boolean => {
  return USE_LOCAL_API
}

const shouldUseDemo = (): boolean => {
  return USE_DEMO_API
}

console.log('[DEBUG] useLocal:', USE_LOCAL_API, 'useDemo:', USE_DEMO_API)

export const demoApi = {
  login: async (username: string, password: string) => {
    console.log('[DEBUG] demoApi.login called')
    const response = await apiClient.request({
      url: '/auth/login',
      method: 'POST',
      data: { username, password },
    })
    console.log('[DEBUG demoApi.login] response:', response)
    const data = response.data || response
    
    // Store session ID for demo mode authentication
    if (data && data.session) {
      console.log('[DEBUG demoApi.login] session:', data.session)
      localStorage.setItem('demo_session_id', data.session)
    }
    
    if (data && data.user) {
      console.log('[DEBUG demoApi.login] user:', data.user)
      setDemoUserRole(data.user.role)
    }
    return data
  },
  getWorkOrders: async (_params?: Record<string, unknown>) => {
    // 根据角色设置不同的状态过滤
    const userRole = getUserRole()
    console.log('[DEBUG demoApi.getWorkOrders] userRole:', userRole, 'statusFilter will be:', !userRole ? 'ALL' : userRole)
    
    let statusFilter = '' // 不设置则返回全部
    
    if (userRole === 'BRANCH_ADMIN' || userRole === 'EMPLOYEE') {
      // 分公司管理员、员工：查看所有工单
      statusFilter = ''
    } else if (userRole === 'ENGINEER') {
      statusFilter = 'ACCEPTED,RESERVED,WORKING'
    } else if (userRole === 'CONTRACTOR_EMPLOYEE' || userRole === 'CONTRACTOR_ADMIN') {
      statusFilter = 'DISPATCHED,ACCEPTED,RESERVED,WORKING'
    } else if (userRole === 'VENDOR_EMPLOYEE' || userRole === 'VENDOR_ADMIN') {
      statusFilter = 'DISPATCHED,ACCEPTED,RESERVED,WORKING'
    }
    
    console.log('[DEBUG demoApi.getWorkOrders] requesting with status:', statusFilter)
    const response = await apiClient.request({
      url: '/workorders',
      method: 'GET',
      params: { status: statusFilter },
    })
    // Demo API returns data directly, not wrapped in response.data
    return response.data || response
  },
  getWorkOrder: async (id: string) => {
    const response = await apiClient.request({
      url: `/workorders/${id}`,
      method: 'GET',
    })
    return response.data || response
  },
  updateWorkOrder: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.request({
      url: `/workorders/${id}`,
      method: 'PUT',
      data,
    })
    return response.data || response
  },
  dispatchWorkOrder: async (id: string, vendor_id: string, engineer_id?: string) => {
    const response = await apiClient.request({
      url: `/workorders/${id}/dispatch`,
      method: 'POST',
      data: { vendor_id, engineer_id },
    })
    return response.data || response
  },
  acceptWorkOrder: async (id: string, scheduled_at: string) => {
    const response = await apiClient.request({
      url: `/workorders/${id}/accept`,
      method: 'POST',
      data: { scheduled_at },
    })
    return response.data || response
  },
  reserveWorkOrder: async (id: string, appointed_at: string) => {
    const response = await apiClient.request({
      url: `/workorders/${id}/reserve`,
      method: 'POST',
      data: { appointed_at },
    })
    return response.data || response
  },
  arriveWorkOrder: async (id: string, latitude: number, longitude: number) => {
    const response = await apiClient.request({
      url: `/workorders/${id}/arrive`,
      method: 'POST',
      data: { latitude, longitude },
    })
    return response.data || response
  },
  finishWorkOrder: async (
    id: string,
    description: string,
    photo_urls: string[],
    labor_fee: number,
    material_fee: number,
    other_fee: number
  ) => {
    const response = await apiClient.request({
      url: `/workorders/${id}/finish`,
      method: 'POST',
      data: { description, photo_urls, labor_fee, material_fee, other_fee },
    })
    return response.data || response
  },
  verifyWorkOrder: async (id: string) => {
    const response = await apiClient.request({
      url: `/workorders/${id}/verify`,
      method: 'POST',
    })
    return response.data
  },
  rejectWorkOrder: async (id: string, reason: string) => {
    const response = await apiClient.request({
      url: `/workorders/${id}/reject`,
      method: 'POST',
      data: { reason },
    })
    return response.data
  },
  getOrganizations: async () => {
    const response = await apiClient.request({
      url: '/organizations',
      method: 'GET',
    })
    return response.data
  },
  getOrganization: async (id: string) => {
    const response = await apiClient.request({
      url: `/organizations/${id}`,
      method: 'GET',
    })
    return response.data
  },
  getUsers: async () => {
    const response = await apiClient.request({
      url: '/users',
      method: 'GET',
    })
    return response.data
  },
  request: async (config: { url: string; method: string; data?: unknown; params?: Record<string, unknown> }) => {
    const response = await apiClient.request(config)
    return response
  },
}

export const createApi = () => {
  const useLocal = shouldUseLocal()
  const useDemo = shouldUseDemo()

  const auth = useLocal
    ? {
        login: (data: { username: string; password: string }) =>
          localAuthApi.login(data.username, data.password).then((res) => ({
            token: res.token,
            user_id: res.user_id,
            username: res.username,
            role: res.role,
            org_id: res.org_id,
            tenant_id: res.tenant_id,
            display_name: res.display_name,
            is_impersonated: res.is_impersonated,
          })),
        refreshToken: () => localAuthApi.refreshToken(),
        getMyTenants: () => localAuthApi.getMyTenants(),
        selectTenant: (tenantId: string) => localAuthApi.selectTenant(tenantId),
        logout: () => localAuthApi.logout(),
        getSession: () => localAuthApi.getSession(),
      }
    : useDemo
    ? {
        login: (data: { username: string; password: string }) =>
          demoApi.login(data.username, data.password).then((res) => ({
            token: res.token,
            user_id: res.user?.id,
            username: res.user?.username,
            role: res.user?.role,
            org_id: res.user?.orgId,
            tenant_id: res.user?.tenantId,
            display_name: res.user?.displayName,
            is_impersonated: false,
          })),
        refreshToken: () => Promise.resolve({}),
        getMyTenants: () => Promise.resolve([]),
        selectTenant: () => Promise.resolve({}),
        logout: () => Promise.resolve({}),
        getSession: () => Promise.resolve({}),
      }
    : authApi

  const workorder = useLocal
    ? {
        list: (params?: Parameters<typeof workorderApi.list>[0]) =>
          localWorkorderApi.list(params).then((res) => ({
            code: 200,
            data: {
              list: res.list,
              total: res.total,
              page: res.page,
              page_size: res.page_size,
            },
          })),
        get: (id: string) =>
          localWorkorderApi.get(id).then((res) => ({
            code: 200,
            data: res,
          })),
        create: (data: Parameters<typeof localWorkorderApi.create>[0]) =>
          localWorkorderApi.create(data).then((res) => ({
            code: 200,
            data: res,
          })),
        dispatch: (
          id: string,
          vendor_id: string,
          engineer_id?: string
        ) =>
          localWorkorderApi.dispatch(id, vendor_id, engineer_id).then((res) => ({
            code: 200,
            data: res,
          })),
        accept: (id: string, scheduled_at: string) =>
          localWorkorderApi.accept(id, scheduled_at).then((res) => ({
            code: 200,
            data: res,
          })),
        reserve: (id: string, appointed_at: string) =>
          localWorkorderApi.reserve(id, appointed_at).then((res) => ({
            code: 200,
            data: res,
          })),
        arrive: (id: string, latitude: number, longitude: number) =>
          localWorkorderApi.arrive(id, latitude, longitude).then((res) => ({
            code: 200,
            data: res,
          })),
        finish: (
          id: string,
          description: string,
          photo_urls: string[],
          labor_fee: number,
          material_fee: number,
          other_fee: number
        ) =>
          localWorkorderApi.finish(
            id,
            description,
            photo_urls,
            labor_fee,
            material_fee,
            other_fee
          ).then((res) => ({
            code: 200,
            data: res,
          })),
        verify: (id: string) =>
          localWorkorderApi.verify(id).then((res) => ({
            code: 200,
            data: res,
          })),
        reject: (id: string, reason: string) =>
          localWorkorderApi.reject(id, reason).then((res) => ({
            code: 200,
            data: res,
          })),
        generateQRCode: (id: string) =>
          localWorkorderApi.generateQRCode(id).then((res) => ({
            code: 200,
            data: res,
          })),
        myTasks: (params?: Parameters<typeof workorderApi.myTasks>[0]) =>
          localWorkorderApi.list(params).then((res) => ({
            code: 200,
            data: {
              list: res.list,
              total: res.total,
            },
          })),
        statistics: () =>
          Promise.resolve({ code: 200, data: { total: 0, by_status: {} } }),
        acceptOrder: (id: string, comment?: string, photoUrls?: string[]) =>
          localWorkorderApi.acceptOrder(id, comment, photoUrls).then((res) => ({
            code: 200,
            data: res,
          })),
        rejectOrder: (id: string, comment: string, photoUrls?: string[]) =>
          localWorkorderApi.rejectOrder(id, comment, photoUrls).then((res) => ({
            code: 200,
            data: res,
          })),
        rejectHandle: (id: string, action: 'accept' | 'reassign', reason: string) =>
          localWorkorderApi.rejectHandle(id, action, reason).then((res) => ({
            code: 200,
            data: res,
          })),
      }
    : useDemo
    ? {
        list: (_params?: Record<string, unknown>) => {
          console.log('[DEBUG factory] list called with role filtering')
          // 不传递原始params，让demoApi根据role自动过滤
          return demoApi.getWorkOrders().then((res: { list: unknown[]; total: number }) => {
            console.log('[DEBUG factory] list result:', res)
            return {
              code: 200,
              data: {
                list: res.list,
                total: res.total,
                page: 1,
                page_size: 20,
              },
            }
          })
        },
        get: (id: string) =>
          demoApi.getWorkOrder(id).then((res) => ({
            code: 200,
            data: res,
          })),
        create: (data: unknown) =>
          demoApi.updateWorkOrder('', data as Record<string, unknown>).then((res) => ({
            code: 200,
            data: res,
          })),
        dispatch: () =>
          Promise.resolve({ code: 200, data: {} }),
        accept: () =>
          Promise.resolve({ code: 200, data: {} }),
        reserve: () =>
          Promise.resolve({ code: 200, data: {} }),
        arrive: () =>
          Promise.resolve({ code: 200, data: {} }),
        finish: () =>
          Promise.resolve({ code: 200, data: {} }),
        verify: () =>
          Promise.resolve({ code: 200, data: {} }),
        reject: () =>
          Promise.resolve({ code: 200, data: {} }),
        generateQRCode: () =>
          Promise.resolve({ code: 200, data: { qrcode: '' } }),
        myTasks: () =>
          demoApi.getWorkOrders().then((res: { list: unknown[]; total: number }) => ({
            code: 200,
            data: {
              list: res.list,
              total: res.total,
            },
          })),
        statistics: () =>
          Promise.resolve({ code: 200, data: { total: 0, by_status: {} } }),
        acceptOrder: () =>
          Promise.resolve({ code: 200, data: {} }),
        rejectOrder: () =>
          Promise.resolve({ code: 200, data: {} }),
        rejectHandle: () =>
          Promise.resolve({ code: 200, data: null }),
      }
    : workorderApi

  const organization = useLocal
    ? {
        list: (params?: Parameters<typeof localOrganizationApi.list>[0]) =>
          localOrganizationApi.list(params).then((res) => ({
            code: 200,
            data: {
              list: res.list,
              total: res.total,
            },
          })),
        get: (id: string) =>
          localOrganizationApi.get(id).then((res) => ({
            code: 200,
            data: res,
          })),
        create: (
          data: Parameters<typeof localOrganizationApi.create>[0]
        ) =>
          localOrganizationApi.create(data).then((res) => ({
            code: 200,
            data: res,
          })),
        listUsers: (orgId: string) =>
          localOrganizationApi.listUsers(orgId).then((res) => ({
            code: 200,
            data: res,
          })),
        createUser: (
          orgId: string,
          data: Parameters<typeof localOrganizationApi.createUser>[1]
        ) =>
          localOrganizationApi.createUser(orgId, data).then((res) => ({
            code: 200,
            data: res,
          })),
      }
    : useDemo
    ? {
        list: () =>
          demoApi.getOrganizations().then((res: { list: unknown[]; total: number }) => ({
            code: 200,
            data: {
              list: res.list,
              total: res.total,
            },
          })),
        get: (_id: string) =>
          demoApi.getOrganization(_id).then((res) => ({
            code: 200,
            data: res,
          })),
        create: () => Promise.resolve({ code: 200, data: null }),
        listUsers: () =>
          demoApi.getUsers().then((res: { list: unknown[]; total: number }) => ({
            code: 200,
            data: {
              list: res.list,
              total: res.total,
            },
          })),
        createUser: () => Promise.resolve({ code: 200, data: null }),
      }
    : {
        list: () => Promise.resolve({ code: 200, data: { list: [], total: 0 } }),
        get: () => Promise.resolve({ code: 200, data: null }),
        create: () => Promise.resolve({ code: 200, data: null }),
        listUsers: () => Promise.resolve({ code: 200, data: { list: [], total: 0 } }),
        createUser: () => Promise.resolve({ code: 200, data: null }),
      }

  const reservation = useLocal
    ? {
        list: (params?: Parameters<typeof localReservationApi.list>[0]) =>
          localReservationApi.list(params).then((res) => ({
            code: 200,
            data: res,
          })),
        get: (id: string) =>
          localReservationApi.get(id).then((res) => ({
            code: 200,
            data: res,
          })),
        confirm: (id: string, comment?: string) =>
          localReservationApi.confirm(id, comment).then((res) => ({
            code: 200,
            data: res,
          })),
        reject: (id: string, reason: string) =>
          localReservationApi.reject(id, reason).then((res) => ({
            code: 200,
            data: res,
          })),
        reschedule: (id: string, newTime: string, comment?: string) =>
          localReservationApi.reschedule(id, newTime, comment).then((res) => ({
            code: 200,
            data: res,
          })),
        listByWorkOrder: (workOrderId: string, includeRejected?: boolean) =>
          localReservationApi.listByWorkOrder(workOrderId, includeRejected).then((res) => ({
            code: 200,
            data: res,
          })),
      }
    : useDemo
    ? {
        list: () => {
          return demoApi.request({
            url: '/reservations',
            method: 'GET'
          }).then((res: any) => ({
            code: 200,
            data: {
              list: res.list || [],
              total: res.total || 0,
            },
          }))
        },
        get: (id: string) => {
          return demoApi.request({
            url: `/reservations/${id}`,
            method: 'GET'
          }).then((res: any) => ({
            code: 200,
            data: res,
          }))
        },
        confirm: (id: string, comment?: string) => {
          return demoApi.request({
            url: `/reservations/${id}/confirm`,
            method: 'POST',
            data: { comment }
          }).then((res: any) => ({
            code: 200,
            data: res,
          }))
        },
        reject: (id: string, reason: string) => {
          return demoApi.request({
            url: `/reservations/${id}/reject`,
            method: 'POST',
            data: { reason }
          }).then((res: any) => ({
            code: 200,
            data: res,
          }))
        },
        reschedule: (id: string, newTime: string, comment?: string) =>
          Promise.resolve({ code: 200, data: null }),
        listByWorkOrder: (workOrderId: string, includeRejected?: boolean) => {
          return demoApi.request({
            url: `/reservations`,
            method: 'GET',
            params: { work_order_id: workOrderId }
          }).then((res: any) => ({
            code: 200,
            data: res,
          }))
        },
      }
    : {
        list: () => Promise.resolve({ code: 200, data: { list: [], total: 0 } }),
        get: () => Promise.resolve({ code: 200, data: null }),
        confirm: () => Promise.resolve({ code: 200, data: null }),
        reject: () => Promise.resolve({ code: 200, data: null }),
        reschedule: () => Promise.resolve({ code: 200, data: null }),
        listByWorkOrder: () => Promise.resolve({ code: 200, data: { list: [], total: 0 } }),
      }

  const region = {
    list: () =>
      demoApi.request({
        url: '/regions',
        method: 'GET',
      }).then((res: any) => ({
        code: 200,
        data: res,
      })),
    getCategories: (region: string) =>
      demoApi.request({
        url: `/regions/$\{encodeURIComponent(region)}/categories`,
        method: 'GET',
      }).then((res: any) => ({
        code: 200,
        data: res,
      })),
  }

  return {
    auth,
    workorder,
    organization,
    reservation,
    category: {
      list: (params?: { parent_id?: string }) =>
        demoApi.request({
          url: '/categories',
          method: 'GET',
          params,
        }).then((res: any) => ({
          code: 200,
          data: res.data?.data || res.data || [],
        })),
      get: (id: string) =>
        demoApi.request({
          url: `/categories/${id}`,
          method: 'GET',
        }).then((res: any) => ({
          code: 200,
          data: res.data,
        })),
      create: (data: { name: string; code: string; parent_id?: string; sort_order?: number }) =>
        demoApi.request({
          url: '/categories',
          method: 'POST',
          data,
        }).then((res: any) => ({
          code: 200,
          data: res.data,
        })),
      update: (id: string, data: { name?: string; sort_order?: number; status?: number }) =>
        demoApi.request({
          url: `/categories/${id}`,
          method: 'PUT',
          data,
        }).then((res: any) => ({
          code: 200,
          data: res.data,
        })),
      delete: (id: string) =>
        demoApi.request({
          url: `/categories/${id}`,
          method: 'DELETE',
        }).then((res: any) => ({
          code: 200,
          data: res.data,
        })),
    },
    initializeMockData,
  }
}

export const api = createApi()