import { demoApi } from './demo'

const USE_DEMO = true

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