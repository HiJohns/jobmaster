export interface Tenant {
  id: string
  name: string
  code: string
  contact_person?: string
  status: number
  config?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  code: string
  tenant_id: string
  parent_id?: string
  type: 'HQ' | 'BRANCH' | 'MAIN_CONTRACTOR' | 'VENDOR'
  status: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  username: string
  email: string
  display_name: string
  phone?: string
  role: 'HQ_ADMIN' | 'BRANCH_ADMIN' | 'EMPLOYEE' | 'CONTRACTOR_ADMIN' | 'CONTRACTOR_EMPLOYEE' | 'ENGINEER' | 'VENDOR_ADMIN' | 'VENDOR_EMPLOYEE'
  org_id: string
  org_name: string
  tenant_id: string
  iam_sub?: string
  is_shadow: boolean
  status: number
  created_at: string
  updated_at: string
}

export interface WorkOrder {
  id: string
  order_no: string
  status: 'PENDING' | 'DISPATCHED' | 'ACCEPTED' | 'RESERVED' | 'WORKING' | 'FINISHED' | 'CLOSED'
  store_id: string
  store_name: string
  vendor_id?: string
  vendor_name?: string
  engineer_id?: string
  engineer_name?: string
  owner_org_id?: string
  owner_org_name?: string
  category_path: string
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
  started_at?: string
  finished_at?: string
  hop_count?: number
  max_hops?: number
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

export interface QRToken {
  token: string
  order_id: string
  created_at: string
  expired_at: string
}

export interface Reservation {
  id: string
  work_order_id: string
  work_order_title: string
  proposer_id: string
  proposer_name: string
  proposer_role: string
  proposed_time: string
  status: 'pending' | 'confirmed' | 'rejected' | 'expired'
  reject_reason?: string
  comment?: string
  created_at: string
  updated_at: string
}

export const STORAGE_KEYS = {
  TENANTS: 'jm_tenants',
  ORGANIZATIONS: 'jm_organizations',
  USERS: 'jm_users',
  WORKORDERS: 'jm_workorders',
  WORK_RECORDS: 'jm_work_records',
  SESSION: 'jm_session',
  QR_TOKENS: 'jm_qr_tokens',
  RESERVATIONS: 'jm_reservations',
}

export const mockTenants: Tenant[] = [
  {
    id: 'jm-tenant1',
    name: 'Tenant Alpha',
    code: 'jm-alpha',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

export const mockOrganizations: Organization[] = [
  {
    id: 'jm-hq1',
    name: 'Brand HQ',
    code: 'hq',
    tenant_id: 'jm-tenant1',
    type: 'HQ',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-branch1',
    name: 'Branch 001',
    code: 'branch1',
    tenant_id: 'jm-tenant1',
    parent_id: 'jm-hq1',
    type: 'BRANCH',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-branch2',
    name: 'Branch 002',
    code: 'branch2',
    tenant_id: 'jm-tenant1',
    parent_id: 'jm-hq1',
    type: 'BRANCH',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-contractor1',
    name: 'Contractor A',
    code: 'contractor1',
    tenant_id: 'jm-tenant1',
    type: 'MAIN_CONTRACTOR',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-contractor2',
    name: 'Contractor B',
    code: 'contractor2',
    tenant_id: 'jm-tenant1',
    type: 'MAIN_CONTRACTOR',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-vendor1',
    name: 'Vendor X',
    code: 'vendor1',
    tenant_id: 'jm-tenant1',
    parent_id: 'jm-contractor1',
    type: 'VENDOR',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-vendor2',
    name: 'Vendor Y',
    code: 'vendor2',
    tenant_id: 'jm-tenant1',
    parent_id: 'jm-contractor1',
    type: 'VENDOR',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

export const mockUsers: User[] = [
  {
    id: 'jm-user-1',
    username: 'admin@branch1',
    email: 'admin@branch1',
    display_name: 'Branch Admin 1',
    role: 'BRANCH_ADMIN',
    org_id: 'jm-branch1',
    org_name: 'Branch 001',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-2',
    username: 'employee1@branch1',
    email: 'employee1@branch1',
    display_name: 'Employee 1',
    role: 'EMPLOYEE',
    org_id: 'jm-branch1',
    org_name: 'Branch 001',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-3',
    username: 'admin@contractor1',
    email: 'admin@contractor1',
    display_name: 'Contractor Admin 1',
    role: 'CONTRACTOR_ADMIN',
    org_id: 'jm-contractor1',
    org_name: 'Contractor A',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-4',
    username: 'employee1@contractor1',
    email: 'employee1@contractor1',
    display_name: 'Contractor Employee 1',
    role: 'CONTRACTOR_EMPLOYEE',
    org_id: 'jm-contractor1',
    org_name: 'Contractor A',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-5',
    username: 'engineer1@contractor1',
    email: 'engineer1@contractor1',
    display_name: 'Engineer 1',
    role: 'ENGINEER',
    org_id: 'jm-contractor1',
    org_name: 'Contractor A',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-6',
    username: 'engineer2@contractor1',
    email: 'engineer2@contractor1',
    display_name: 'Engineer 2',
    role: 'ENGINEER',
    org_id: 'jm-contractor1',
    org_name: 'Contractor A',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-7',
    username: 'admin@vendor1',
    email: 'admin@vendor1',
    display_name: 'Vendor Admin 1',
    role: 'VENDOR_ADMIN',
    org_id: 'jm-vendor1',
    org_name: 'Vendor X',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-8',
    username: 'employee1@vendor1',
    email: 'employee1@vendor1',
    display_name: 'Vendor Employee 1',
    role: 'VENDOR_EMPLOYEE',
    org_id: 'jm-vendor1',
    org_name: 'Vendor X',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-9',
    username: 'engineer1@vendor1',
    email: 'engineer1@vendor1',
    display_name: 'Vendor Engineer 1',
    role: 'ENGINEER',
    org_id: 'jm-vendor1',
    org_name: 'Vendor X',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-user-10',
    username: 'admin@contractor2',
    email: 'admin@contractor2',
    display_name: 'Contractor Admin 2',
    role: 'CONTRACTOR_ADMIN',
    org_id: 'jm-contractor2',
    org_name: 'Contractor B',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const now = new Date().toISOString()
const yesterday = new Date(Date.now() - 86400000).toISOString()
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString()

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'jm-wo-001',
    order_no: 'WO-20260413-B1-0001',
    status: 'PENDING',
    store_id: 'jm-branch1',
    store_name: 'Branch 001',
    category_path: '消防门 > 卖场 > 甲级防火门',
    brand_name: '盼盼',
    description: '卖场消防门把手损坏，无法正常关闭',
    photo_urls: [],
    is_urgent: false,
    address_detail: '北京市朝阳区建国路88号',
    appointed_at: undefined,
    started_at: undefined,
    finished_at: undefined,
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: 'jm-wo-002',
    order_no: 'WO-20260413-B1-0002',
    status: 'DISPATCHED',
    store_id: 'jm-branch1',
    store_name: 'Branch 001',
    vendor_id: 'jm-contractor1',
    vendor_name: 'Contractor A',
    engineer_id: 'jm-user-5',
    engineer_name: 'Engineer 1',
    category_path: '空调 > 家用 > 挂机',
    brand_name: '格力',
    description: '空调不制冷，需要加氟',
    photo_urls: [],
    is_urgent: true,
    address_detail: '北京市朝阳区建国路88号',
    appointed_at: undefined,
    started_at: undefined,
    finished_at: undefined,
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },
  {
    id: 'jm-wo-003',
    order_no: 'WO-20260413-B1-0003',
    status: 'ACCEPTED',
    store_id: 'jm-branch1',
    store_name: 'Branch 001',
    vendor_id: 'jm-contractor1',
    vendor_name: 'Contractor A',
    engineer_id: 'jm-user-5',
    engineer_name: 'Engineer 1',
    category_path: '电梯 > 货梯 > 三菱',
    brand_name: '三菱',
    description: '电梯运行异响，需检查',
    photo_urls: [],
    is_urgent: false,
    address_detail: '北京市朝阳区建国路88号',
    appointed_at: '2026-04-15T10:00:00Z',
    started_at: undefined,
    finished_at: undefined,
    created_at: twoDaysAgo,
    updated_at: now,
  },
  {
    id: 'jm-wo-004',
    order_no: 'WO-20260413-B1-0004',
    status: 'RESERVED',
    store_id: 'jm-branch1',
    store_name: 'Branch 001',
    vendor_id: 'jm-contractor1',
    vendor_name: 'Contractor A',
    engineer_id: 'jm-user-5',
    engineer_name: 'Engineer 1',
    category_path: '消防设施 > 灭火器 > ABC干粉',
    brand_name: 'abc',
    description: '灭火器压力不足，需更换',
    photo_urls: [],
    is_urgent: true,
    address_detail: '北京市朝阳区建国路88号',
    appointed_at: '2026-04-14T14:00:00Z',
    started_at: undefined,
    finished_at: undefined,
    created_at: twoDaysAgo,
    updated_at: now,
  },
  {
    id: 'jm-wo-005',
    order_no: 'WO-20260413-B1-0005',
    status: 'WORKING',
    store_id: 'jm-branch1',
    store_name: 'Branch 001',
    vendor_id: 'jm-vendor1',
    vendor_name: 'Vendor X',
    engineer_id: 'jm-user-9',
    engineer_name: 'Vendor Engineer 1',
    category_path: '灯具 > 照明 > LED',
    brand_name: '飞利浦',
    description: 'LED灯具闪烁，需更换驱动',
    photo_urls: [],
    is_urgent: false,
    address_detail: '北京市朝阳区建国路88号',
    appointed_at: '2026-04-14T09:00:00Z',
    started_at: '2026-04-14T09:10:00Z',
    finished_at: undefined,
    created_at: twoDaysAgo,
    updated_at: now,
  },
  {
    id: 'jm-wo-006',
    order_no: 'WO-20260413-B1-0006',
    status: 'FINISHED',
    store_id: 'jm-branch1',
    store_name: 'Branch 001',
    vendor_id: 'jm-vendor1',
    vendor_name: 'Vendor X',
    engineer_id: 'jm-user-9',
    engineer_name: 'Vendor Engineer 1',
    category_path: '门窗 > 铝合金 > 推拉门',
    brand_name: '皇派',
    description: '推拉门轨道损坏，已修复',
    photo_urls: [],
    is_urgent: false,
    address_detail: '北京市朝阳区建国路88号',
    appointed_at: '2026-04-13T15:00:00Z',
    started_at: '2026-04-13T15:10:00Z',
    finished_at: '2026-04-13T16:30:00Z',
    labor_fee: 100,
    material_fee: 50,
    other_fee: 0,
    total_fee: 150,
    created_at: twoDaysAgo,
    updated_at: now,
  },
  {
    id: 'jm-wo-007',
    order_no: 'WO-20260413-B1-0007',
    status: 'CLOSED',
    store_id: 'jm-branch1',
    store_name: 'Branch 001',
    vendor_id: 'jm-contractor1',
    vendor_name: 'Contractor A',
    engineer_id: 'jm-user-5',
    engineer_name: 'Engineer 1',
    category_path: '水电 > 给水 > PPR管',
    brand_name: '日丰',
    description: '水管漏水，已完成修复',
    photo_urls: [],
    is_urgent: false,
    address_detail: '北京市朝阳区建国路88号',
    appointed_at: '2026-04-12T10:00:00Z',
    started_at: '2026-04-12T10:10:00Z',
    finished_at: '2026-04-12T11:30:00Z',
    labor_fee: 80,
    material_fee: 20,
    other_fee: 0,
    total_fee: 100,
    created_at: '2026-04-11T00:00:00Z',
    updated_at: now,
  },
]

export const mockWorkRecords: WorkRecord[] = [
  {
    id: 'wr-001',
    user_id: 'jm-user-2',
    user_name: 'Employee 1',
    action: 'CREATE',
    details: '创建工单',
    old_status: '',
    new_status: 'PENDING',
    created_at: yesterday,
  },
  {
    id: 'wr-002',
    user_id: 'jm-user-3',
    user_name: 'Contractor Admin 1',
    action: 'DISPATCH',
    details: '分配给工程��司 Contractor A',
    old_status: 'PENDING',
    new_status: 'DISPATCHED',
    created_at: yesterday,
  },
  {
    id: 'wr-003',
    user_id: 'jm-user-5',
    user_name: 'Engineer 1',
    action: 'ACCEPT',
    details: '接单，预约时间 2026-04-15 10:00',
    old_status: 'DISPATCHED',
    new_status: 'ACCEPTED',
    created_at: now,
  },
]

export const mockReservations: Reservation[] = [
  {
    id: 'jm-res-1',
    work_order_id: 'jm-wo-6',
    work_order_title: '空调不制冷',
    proposer_id: 'jm-user-5',
    proposer_name: 'Engineer 1',
    proposer_role: 'ENGINEER',
    proposed_time: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'jm-res-2',
    work_order_id: 'jm-wo-7',
    work_order_title: '水管漏水',
    proposer_id: 'jm-user-5',
    proposer_name: 'Engineer 1',
    proposer_role: 'ENGINEER',
    proposed_time: new Date(Date.now() + 172800000).toISOString(),
    status: 'confirmed',
    created_at: yesterday,
    updated_at: now,
  },
]