import { demoApi } from './demo'

export const api = {
  workorder: {
    list: async (params?: Record<string, unknown>) => {
      const res = await demoApi.getWorkOrders(params)
      return {
        code: 200,
        data: {
          list: res.list || [],
          total: res.total || 0,
        },
      }
    },
    get: async (id: string) => {
      const res = await demoApi.getWorkOrders()
      const order = (res.list || []).find((o: any) => o.id === id)
      return {
        code: 200,
        data: order || null,
      }
    },
    create: async (data: {
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
      const res = await demoApi.createWorkOrder(data)
      return {
        code: 200,
        data: res,
      }
    },
    getRecords: async (workOrderId: string) => {
      const res = await demoApi.getWorkOrderRecords(workOrderId)
      return {
        code: 200,
        data: res,
      }
    },
  },
  auth: {
    login: async (username: string, password: string) => {
      const res = await demoApi.login(username, password)
      return {
        code: 200,
        data: res,
      }
    },
  },
}
