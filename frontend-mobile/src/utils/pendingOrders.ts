const STORAGE_KEY = 'pending_orders'

export interface PendingOrder {
  id: string
  title: string
  description: string
  category_id?: string
  photo_urls?: string[]
  priority: number
  is_urgent: boolean
  address_detail?: string
  appointment_type: number
  created_at: string
}

export function getPendingOrders(): PendingOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addPendingOrder(order: PendingOrder): void {
  const orders = getPendingOrders()
  orders.unshift(order)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
}

export function removePendingOrder(id: string): void {
  const orders = getPendingOrders().filter(o => o.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
}

export function clearPendingOrders(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getPendingCount(): number {
  return getPendingOrders().length
}
