export interface Device {
  id: string
  sn: string
  name: string
  model: string
  brand: string
  org_id: string
  location_id?: string
  status: string
  site_name?: string
  info?: Record<string, unknown>
  created_at: string
}
