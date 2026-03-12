import request from '../utils/request'

export interface Tenant {
  id: string
  name: string
  code: string
  contact_person?: string
  status: number
  config?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateTenantRequest {
  name: string
  code: string
  contact_person?: string
  status?: number
  config?: Record<string, any>
}

export interface TenantListData {
  tenants: Tenant[]
  total: number
  page: number
  size: number
}

export interface TenantListResponse {
  code: number
  message?: string
  data: TenantListData
}

export interface CreateTenantResponse {
  code: number
  message?: string
  data: Tenant
}

class TenantApi {
  private prefix = '/api/v1/admin/tenants'

  async list(page = 1, size = 20): Promise<TenantListResponse> {
    return request.get<TenantListData>(`${this.prefix}?page=${page}&size=${size}`)
  }

  async create(data: CreateTenantRequest): Promise<CreateTenantResponse> {
    return request.post<Tenant>(this.prefix, data)
  }

  async getByCode(code: string): Promise<Tenant | null> {
    try {
      const response = await request.get<Tenant>(`${this.prefix}/${code}`)
      return response.data
    } catch (error) {
      return null
    }
  }
}

export const tenantApi = new TenantApi()
