/**
 * WorkOrder API Service
 * Handles all work order related API calls
 */

import { http } from '../utils/request'
import { WorkOrderStatus } from '../config/status'

export interface WorkOrder {
  id: string
  order_no: string
  status: WorkOrderStatus
  store_id: string
  store_name: string
  vendor_id?: string
  engineer_id?: string
  engineer_name?: string
  category_path: string[]
  brand_name: string
  description: string
  photo_urls: string[]
  is_urgent: boolean
  labor_fee?: number
  material_fee?: number
  other_fee?: number
  total_fee?: number
  address_detail: string
  coordinates?: { lat: number; lng: number }
  appointed_at?: string
  arrived_at?: string
  started_at?: string
  finished_at?: string
  created_at: string
  updated_at: string
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

export interface WorkOrderDetail extends WorkOrder {
  logs: WorkRecord[]
  observer_deadline?: string
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

export interface TaskStatistics {
  total: number
  by_status: Record<string, number>
}

/**
 * WorkOrder API methods
 */
export const workorderApi = {
  /**
   * List work orders with filters
   */
  list: (params: ListWorkOrdersParams) =>
    http.get<ListResponse<WorkOrder>>('/workorders', { params }),

  /**
   * Get work order detail by ID
   */
  get: (id: string) =>
    http.get<WorkOrderDetail>(`/workorders/${id}`),

  /**
   * Create new work order
   */
  create: (data: CreateWorkOrderRequest) =>
    http.post<WorkOrder>('/workorders', data),

  /**
   * Get my task list
   */
  myTasks: (params: {
    start_date?: string
    end_date?: string
    keyword?: string
    page?: number
    page_size?: number
  }) =>
    http.get<ListResponse<WorkOrder>>('/my-tasks', { params }),

  /**
   * Get task statistics
   */
  statistics: () =>
    http.get<TaskStatistics>('/my-tasks/statistics'),

  /**
   * Dispatch work order to vendor
   */
  dispatch: (id: string, vendor_id: string, engineer_id?: string) =>
    http.post<WorkOrder>(`/workorders/${id}/dispatch`, { vendor_id, engineer_id }),

  /**
   * Accept work order
   */
  accept: (id: string, scheduled_at: string) =>
    http.post<WorkOrder>(`/workorders/${id}/accept`, { scheduled_at }),

  /**
   * Reject work order
   */
  reject: (id: string, reason: string) =>
    http.post<WorkOrder>(`/workorders/${id}/reject`, { reason }),

  /**
   * Reserve appointment time
   */
  reserve: (id: string, appointed_at: string) =>
    http.post<WorkOrder>(`/workorders/${id}/reserve`, { appointed_at }),

  /**
   * Arrive at location with GPS coordinates
   */
  arrive: (id: string, latitude: number, longitude: number) =>
    http.post<WorkOrder>(`/workorders/${id}/arrive`, { latitude, longitude }),

  /**
   * Finish work order
   */
  finish: (id: string, description: string, photo_urls: string[], labor_fee: number, material_fee: number, other_fee: number) =>
    http.post<WorkOrder>(`/workorders/${id}/finish`, { description, photo_urls, labor_fee, material_fee, other_fee }),
}

export default workorderApi
