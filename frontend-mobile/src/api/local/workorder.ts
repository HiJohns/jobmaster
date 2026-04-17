import { storage } from './storage'
import { STORAGE_KEYS, WorkOrder, WorkRecord, User, Organization } from './mockData'

const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

const generateOrderNo = (storeCode: string): string => {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, '0')
  return `WO-${yyyy}${mm}${dd}-${storeCode}-${random}`
}

const getCurrentUser = (): User | null => {
  const session = storage.get<{ user: User }>(STORAGE_KEYS.SESSION)
  return session?.user || null
}

export interface CreateWorkOrderRequest {
  title?: string
  store_id?: string
  category_path?: string[]
  brand_name?: string
  description: string
  photo_urls?: string[]
  is_urgent?: boolean
  address_detail?: string
  coordinates?: { lat: number; lng: number }
}

export const localWorkorderApi = {
  list: async (params?: {
    status?: string
    start_date?: string
    end_date?: string
    keyword?: string
    page?: number
    page_size?: number
    sort_by?: 'created_at' | 'updated_at'
    sort_order?: 'asc' | 'desc'
  }) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    let workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []

    if (user.role === 'ENGINEER') {
      workorders = workorders.filter((wo) => wo.engineer_id === user.id)
    } else if (
      user.role === 'BRANCH_ADMIN' ||
      user.role === 'EMPLOYEE'
    ) {
      workorders = workorders.filter((wo) => wo.store_id === user.org_id)
    } else if (user.role === 'CONTRACTOR_ADMIN' || user.role === 'CONTRACTOR_EMPLOYEE') {
      const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
      const vendorIds = orgs
        .filter(
          (o) =>
            o.parent_id === user.org_id ||
            o.id === user.org_id
        )
        .map((o) => o.id)
      workorders = workorders.filter(
        (wo) =>
          wo.vendor_id === user.org_id || vendorIds.includes(wo.vendor_id || '')
      )
    } else if (user.role === 'VENDOR_ADMIN' || user.role === 'VENDOR_EMPLOYEE') {
      workorders = workorders.filter((wo) => wo.vendor_id === user.org_id)
    }

    if (params?.status && params.status !== 'ALL') {
      workorders = workorders.filter((wo) => wo.status === params.status)
    }

    if (params?.keyword) {
      const kw = params.keyword.toLowerCase()
      workorders = workorders.filter(
        (wo) =>
          wo.order_no.toLowerCase().includes(kw) ||
          wo.description.toLowerCase().includes(kw) ||
          wo.brand_name.toLowerCase().includes(kw)
      )
    }

    const sortBy = params?.sort_by || 'created_at'
    const sortOrder = params?.sort_order || 'desc'
    workorders.sort((a, b) => {
      const aVal = a[sortBy as keyof WorkOrder] || ''
      const bVal = b[sortBy as keyof WorkOrder] || ''
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = workorders.slice(start, end)

    return {
      list,
      total: workorders.length,
      page,
      page_size: pageSize,
    }
  },

  get: async (id: string) => {
    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const workorder = workorders.find((wo) => wo.id === id)

    if (!workorder) {
      throw new Error('工单不存在')
    }

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    const logs = records.filter((r) => r.id.startsWith(id))

    return {
      ...workorder,
      logs,
    }
  },

  create: async (data: CreateWorkOrderRequest) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
    const storeId = data.store_id || user.org_id
    const store = orgs.find((o) => o.id === storeId)
    if (!store) {
      throw new Error('分店不存在')
    }

    const now = new Date().toISOString()
    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []

    const newWorkOrder: WorkOrder = {
      id: generateId('jm-wo'),
      order_no: generateOrderNo(store.code),
      status: 'PENDING',
      store_id: storeId,
      store_name: store.name,
      category_path: data.category_path || [],
      brand_name: data.brand_name || '',
      description: data.description,
      photo_urls: data.photo_urls || [],
      is_urgent: data.is_urgent || false,
      address_detail: data.address_detail || '',
      coordinates: data.coordinates,
      created_at: now,
      updated_at: now,
    }

    workorders.push(newWorkOrder)
    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'CREATE',
      details: '创建工单',
      old_status: '',
      new_status: 'PENDING',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return newWorkOrder
  },

  dispatch: async (id: string, vendor_id: string, engineer_id?: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'PENDING') {
      throw new Error('当前状态无法分配')
    }

    const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
    const vendor = orgs.find((o) => o.id === vendor_id)

    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    const engineer = engineer_id
      ? users.find((u) => u.id === engineer_id)
      : null

    const now = new Date().toISOString()
    workorders[idx] = {
      ...workorders[idx],
      vendor_id,
      vendor_name: vendor?.name,
      engineer_id,
      engineer_name: engineer?.display_name,
      status: 'DISPATCHED',
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'DISPATCH',
      details: `分配给 ${vendor?.name}`,
      old_status: 'PENDING',
      new_status: 'DISPATCHED',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return workorders[idx]
  },

  accept: async (id: string, scheduled_at: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'DISPATCHED') {
      throw new Error('当前状态无法接单')
    }

    const now = new Date().toISOString()
    workorders[idx] = {
      ...workorders[idx],
      appointed_at: scheduled_at,
      status: 'ACCEPTED',
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'ACCEPT',
      details: `接单，预约时间 ${scheduled_at}`,
      old_status: 'DISPATCHED',
      new_status: 'ACCEPTED',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return workorders[idx]
  },

  reserve: async (id: string, appointed_at: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'ACCEPTED') {
      throw new Error('当前状态无法预约')
    }

    const now = new Date().toISOString()
    workorders[idx] = {
      ...workorders[idx],
      appointed_at,
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'RESERVE',
      details: `预约时间 ${appointed_at}`,
      old_status: 'ACCEPTED',
      new_status: 'ACCEPTED',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return workorders[idx]
  },

  arrive: async (
    id: string,
    latitude: number,
    longitude: number
  ) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'RESERVED') {
      throw new Error('当前状态无法进场')
    }

    const now = new Date().toISOString()
    workorders[idx] = {
      ...workorders[idx],
      status: 'WORKING',
      coordinates: { lat: latitude, lng: longitude },
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'ARRIVE',
      details: `进场签到 (${latitude}, ${longitude})`,
      old_status: 'RESERVED',
      new_status: 'WORKING',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return workorders[idx]
  },

  finish: async (
    id: string,
    description: string,
    _photo_urls: string[],
    labor_fee: number,
    material_fee: number,
    other_fee: number
  ) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'WORKING') {
      throw new Error('当前状态无法完工')
    }

    const now = new Date().toISOString()
    const total = labor_fee + material_fee + other_fee

    workorders[idx] = {
      ...workorders[idx],
      status: 'FINISHED',
      labor_fee,
      material_fee,
      other_fee,
      total_fee: total,
      finished_at: now,
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'FINISH',
      details: description,
      old_status: 'WORKING',
      new_status: 'FINISHED',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return workorders[idx]
  },

  verify: async (id: string, action: string = 'approve', comment?: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'FINISHED') {
      throw new Error('当前状态无法验收')
    }

    const now = new Date().toISOString()
    const newStatus = action === 'approve' ? 'CLOSED' : 'DISPATCHED'
    const details = action === 'approve' ? '验收通过' : `验收拒绝: ${comment || ''}`

    workorders[idx] = {
      ...workorders[idx],
      status: newStatus,
      labor_fee: workorders[idx].labor_fee,
      material_fee: workorders[idx].material_fee,
      other_fee: workorders[idx].other_fee,
      total_fee: workorders[idx].total_fee,
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: action === 'approve' ? 'APPROVE' : 'REJECT',
      details,
      old_status: 'FINISHED',
      new_status: newStatus,
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return workorders[idx]
  },

  rejectHandle: async (id: string, action: 'accept' | 'reassign', reason: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'PENDING') {
      throw new Error('当前状态无法处理')
    }

    const now = new Date().toISOString()
    const oldStatus = workorders[idx].status
    const newStatus = action === 'accept' ? 'CLOSED' : 'DISPATCHED'

    workorders[idx] = {
      ...workorders[idx],
      status: newStatus,
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'REJECT_HANDLE',
      details: `${action === 'accept' ? '接受' : '重新分配'}: ${reason}`,
      old_status: oldStatus,
      new_status: newStatus,
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return {
      work_order_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      handled_at: now,
      action,
    }
  },

  generateQRCode: async (id: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const workorder = workorders.find((wo) => wo.id === id)

    if (!workorder) {
      throw new Error('工单不存在')
    }

    const token = `qr_${id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const qrTokens = storage.get<Record<string, unknown>[]>(STORAGE_KEYS.QR_TOKENS) || []

    qrTokens.push({
      token,
      order_id: id,
      created_at: new Date().toISOString(),
      expired_at: new Date(Date.now() + 3600000).toISOString(),
    })

    storage.set(STORAGE_KEYS.QR_TOKENS, qrTokens)

    return { qr_url: `jobmaster://order/${id}?token=${token}` }
  },

  acceptOrder: async (id: string, comment?: string, photoUrls?: string[]) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'FINISHED') {
      throw new Error('当前状态无法验收')
    }

    const now = new Date().toISOString()
    const oldStatus = workorders[idx].status
    workorders[idx] = {
      ...workorders[idx],
      status: 'CLOSED',
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'ACCEPTED',
      details: comment || '验收通过',
      old_status: oldStatus,
      new_status: 'CLOSED',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return {
      work_order_id: id,
      old_status: oldStatus,
      new_status: 'CLOSED',
      accepted_at: now,
      comment,
      photo_urls: photoUrls,
    }
  },

  rejectOrder: async (id: string, comment: string, photoUrls?: string[]) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'FINISHED') {
      throw new Error('当前状态无法验收不通过')
    }

    const now = new Date().toISOString()
    const oldStatus = workorders[idx].status
    workorders[idx] = {
      ...workorders[idx],
      status: 'PENDING',
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'REJECT',
      details: comment,
      old_status: oldStatus,
      new_status: 'PENDING',
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return {
      work_order_id: id,
      old_status: oldStatus,
      new_status: 'PENDING',
      rejected_at: now,
      comment,
      photo_urls: photoUrls,
    }
  },

  forward: async (id: string, target_org_id: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const workorders = storage.get<WorkOrder[]>(STORAGE_KEYS.WORKORDERS) || []
    const idx = workorders.findIndex((wo) => wo.id === id)

    if (idx === -1) {
      throw new Error('工单不存在')
    }

    if (workorders[idx].status !== 'DISPATCHED' && workorders[idx].status !== 'ACCEPTED') {
      throw new Error('当前状态无法转发')
    }

    const now = new Date().toISOString()
    const oldOwnerOrg = workorders[idx].owner_org_name || '未知组织'

    workorders[idx] = {
      ...workorders[idx],
      owner_org_id: target_org_id,
      owner_org_name: target_org_id, // 简化为ID，实际应用中应该查询组织名称
      hop_count: (workorders[idx].hop_count || 0) + 1,
      updated_at: now,
    }

    storage.set(STORAGE_KEYS.WORKORDERS, workorders)

    const records = storage.get<WorkRecord[]>(STORAGE_KEYS.WORK_RECORDS) || []
    records.push({
      id: generateId('wr'),
      user_id: user.id,
      user_name: user.display_name,
      action: 'FORWARD',
      details: `从 ${oldOwnerOrg} 转发到 ${target_org_id}`,
      old_status: workorders[idx].status,
      new_status: workorders[idx].status,
      created_at: now,
    })
    storage.set(STORAGE_KEYS.WORK_RECORDS, records)

    return workorders[idx]
  },
}

export default localWorkorderApi