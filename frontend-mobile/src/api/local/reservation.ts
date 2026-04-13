import { storage } from './storage'
import { Reservation, STORAGE_KEYS, mockReservations } from './mockData'

export const localReservationApi = {
  list: async (params?: { status?: string; work_order_id?: string; page?: number; page_size?: number }) => {
    let reservations = storage.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS) || []
    
    if (params?.status) {
      reservations = reservations.filter(r => r.status === params.status)
    }
    
    if (params?.work_order_id) {
      reservations = reservations.filter(r => r.work_order_id === params.work_order_id)
    }
    
    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return {
      list: reservations.slice(start, end),
      total: reservations.length,
      page,
      page_size: pageSize,
    }
  },

  get: async (id: string) => {
    const reservations = storage.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS) || []
    const reservation = reservations.find(r => r.id === id)
    if (!reservation) {
      throw new Error('预约不存在')
    }
    return reservation
  },

  confirm: async (id: string, comment?: string) => {
    const reservations = storage.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS) || []
    const index = reservations.findIndex(r => r.id === id)
    
    if (index === -1) {
      throw new Error('预约不存在')
    }
    
    reservations[index] = {
      ...reservations[index],
      status: 'confirmed',
      comment,
      updated_at: new Date().toISOString(),
    }
    
    storage.set(STORAGE_KEYS.RESERVATIONS, reservations)
    
    return {
      reservation_id: id,
      work_order_id: reservations[index].work_order_id,
      new_status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    }
  },

  reject: async (id: string, reason: string) => {
    const reservations = storage.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS) || []
    const index = reservations.findIndex(r => r.id === id)
    
    if (index === -1) {
      throw new Error('预约不存在')
    }
    
    reservations[index] = {
      ...reservations[index],
      status: 'rejected',
      reject_reason: reason,
      updated_at: new Date().toISOString(),
    }
    
    storage.set(STORAGE_KEYS.RESERVATIONS, reservations)
    
    return {
      reservation_id: id,
      work_order_id: reservations[index].work_order_id,
      new_status: 'rejected',
      rejected_at: new Date().toISOString(),
    }
  },

  reschedule: async (id: string, newTime: string, comment?: string) => {
    const reservations = storage.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS) || []
    const index = reservations.findIndex(r => r.id === id)
    
    if (index === -1) {
      throw new Error('预约不存在')
    }
    
    const oldTime = reservations[index].proposed_time
    reservations[index] = {
      ...reservations[index],
      proposed_time: newTime,
      comment,
      updated_at: new Date().toISOString(),
    }
    
    storage.set(STORAGE_KEYS.RESERVATIONS, reservations)
    
    return {
      reservation_id: id,
      work_order_id: reservations[index].work_order_id,
      old_time: oldTime,
      new_time: newTime,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    }
  },

  listByWorkOrder: async (workOrderId: string, includeRejected = false) => {
    let reservations = storage.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS) || []
    
    reservations = reservations.filter(r => r.work_order_id === workOrderId)
    
    if (!includeRejected) {
      reservations = reservations.filter(r => r.status !== 'rejected')
    }
    
    return {
      list: reservations.map(r => ({
        id: r.id,
        proposed_time: r.proposed_time,
        status: r.status,
        proposer_name: r.proposer_name,
        proposer_role: r.proposer_role,
        reject_reason: r.reject_reason,
        created_at: r.created_at,
      })),
      total: reservations.length,
    }
  },

  initialize: () => {
    if (!storage.get(STORAGE_KEYS.RESERVATIONS)) {
      storage.set(STORAGE_KEYS.RESERVATIONS, mockReservations)
    }
  },
}
