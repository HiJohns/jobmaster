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

export interface UpdateTenantRequest {
  name?: string
  contact_person?: string
  config?: Record<string, any>
}

export interface ImpersonateResponse {
  code: number
  message?: string
  data: {
    token: string
    expires_at: number
  }
}

class TenantApi {
  private prefix = '/admin/tenants'

  async list(page = 1, size = 20, search = '', status = '全部'): Promise<TenantListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      ...(search && { search }),
      ...(status !== '全部' && { status }),
    })
    return request.get<TenantListData>(`${this.prefix}?${params.toString()}`)
  }

  async create(data: CreateTenantRequest): Promise<CreateTenantResponse> {
    return request.post<Tenant>(this.prefix, data)
  }

  async update(id: number, data: UpdateTenantRequest): Promise<CreateTenantResponse> {
    return request.patch<Tenant>(`${this.prefix}/${id}`, data)
  }

  async updateStatus(id: number, status: 0 | 1): Promise<CreateTenantResponse> {
    return request.put<Tenant>(`${this.prefix}/${id}/status`, { status })
  }

  async impersonate(id: number): Promise<ImpersonateResponse> {
    return request.post<ImpersonateResponse['data']>(`${this.prefix}/${id}/impersonate`, {})
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
