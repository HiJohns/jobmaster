/**
 * Device API Service
 * Handles all device related API calls
 */

import { http } from '../utils/request'

export interface Device {
  id: string
  sn: string
  name: string
  model: string
  brand: string
  org_id: string
  location_id?: string
  status: 'ACTIVE' | 'INACTIVE' | 'BROKEN' | 'REPAIRING'
  info?: Record<string, unknown>
  created_at: string
}

export interface ListDevicesParams {
  org_id?: string
  location_id?: string
  status?: string
  page?: number
  page_size?: number
}

export interface User {
  id: string
  username: string
  display_name: string
  role: string
  organization_id: string
  organization_name?: string
}

export interface ListUsersParams {
  organization_id?: string
  role?: string
  page?: number
  page_size?: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ListResponse<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export const deviceApi = {
  list: (params?: ListDevicesParams) =>
    http.get<Device[]>('/devices', { params }),

  get: (id: string) =>
    http.get<Device>(`/devices/${id}`),

  update: (id: string, data: Partial<Device>) =>
    http.put<Device>(`/devices/${id}`, data),
}

export const userApi = {
  list: (params?: ListUsersParams) =>
    http.get<ListResponse<User>>('/users', { params }),
}

export default deviceApi
