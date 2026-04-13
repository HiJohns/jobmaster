import { USE_LOCAL_API } from '../config/env'
import { localAuthApi, localWorkorderApi, localOrganizationApi, initializeMockData } from './local'
import { authApi, workorderApi } from './index'

const shouldUseLocal = (): boolean => {
  return USE_LOCAL_API
}

export const createApi = () => {
  const useLocal = shouldUseLocal()

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
    : {
        list: () => Promise.resolve({ code: 200, data: { list: [], total: 0 } }),
        get: () => Promise.resolve({ code: 200, data: null }),
        create: () => Promise.resolve({ code: 200, data: null }),
        listUsers: () => Promise.resolve({ code: 200, data: { list: [], total: 0 } }),
        createUser: () => Promise.resolve({ code: 200, data: null }),
      }

  return {
    auth,
    workorder,
    organization,
    initializeMockData,
  }
}

export const api = createApi()