import { api } from './client'

export interface WorkOrder {
  id: string
  order_no: string
  status: string
  store_id: string
  store_name?: string
  vendor_id?: string
  engineer_id?: string
  category_path?: string
  brand_name?: string
  description?: string
  photo_urls?: string[]
  is_urgent: boolean
  labor_fee?: number
  material_fee?: number
  other_fee?: number
  total_fee?: number
  address_detail?: string
  coordinates?: { lat: number; lng: number }
  appointed_at?: string
  arrived_at?: string
  started_at?: string
  finished_at?: string
  created_at: string
  updated_at: string
}

export interface WorkOrderDetail extends WorkOrder {
  logs: WorkRecord[]
  observer_deadline?: string
}

export interface WorkRecord {
  id: string
  user_id: string
  user_name: string
  action: string
  details: string
  old_status: string
  new_status: string
  created_at: string
}

export interface CreateWorkOrderRequest {
  store_id: string
  category_path: string
  brand_name: string
  description: string
  photo_urls?: string[]
  is_urgent?: boolean
  address_detail?: string
  coordinates?: { lat: number; lng: number }
}

export interface ListWorkOrdersParams {
  status?: string
  start_date?: string
  end_date?: string
  keyword?: string
  page?: number
  page_size?: number
  sort_by?: 'created_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

export interface ListResponse<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export const workorderApi = {
  list: (params: ListWorkOrdersParams) =>
    api.get<ListResponse<WorkOrder>>('/workorders', { params }),

  get: (id: string) =>
    api.get<WorkOrderDetail>(`/workorders/${id}`),

  create: (data: CreateWorkOrderRequest) =>
    api.post<WorkOrder>('/workorders', data),

  dispatch: (id: string, vendor_id: string, engineer_id?: string) =>
    api.post<WorkOrder>(`/workorders/${id}/dispatch`, { vendor_id, engineer_id }),

  accept: (id: string, scheduled_at: string) =>
    api.post<WorkOrder>(`/workorders/${id}/accept`, { scheduled_at }),

  reject: (id: string, reason: string) =>
    api.post<WorkOrder>(`/workorders/${id}/reject`, { reason }),

  reserve: (id: string, appointed_at: string) =>
    api.post<WorkOrder>(`/workorders/${id}/reserve`, { appointed_at }),

  arrive: (id: string, latitude: number, longitude: number) =>
    api.post<WorkOrder>(`/workorders/${id}/arrive`, { latitude, longitude }),

  finish: (id: string, description: string, photo_urls: string[], labor_fee: number, material_fee: number, other_fee: number) =>
    api.post<WorkOrder>(`/workorders/${id}/finish`, { description, photo_urls, labor_fee, material_fee, other_fee }),
}
