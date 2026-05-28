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
  category_path: string[]
  brand_name: string
  description: string
  photo_urls: string[]
  is_urgent: boolean
  priority?: 0 | 1 | 2 // 0=普通, 1=加急, 2=紧急
  sla_deadline?: string
  priority_fee?: number
  labor_fee?: number
  material_fee?: number
  other_fee?: number
  total_fee?: number
  address_detail: string
  coordinates?: { lat: number; lng: number }
  appointed_at?: string
  started_at?: string
  finished_at?: string
  rejection_reason?: string
  rejection_comment?: string
  hop_count?: number
  max_hops?: number
  appointment_type?: number
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
    name: '寿司郎太阳宫店',
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
    name: '建王',
    code: 'contractor1',
    tenant_id: 'jm-tenant1',
    type: 'MAIN_CONTRACTOR',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-contractor2',
    name: '希望',
    code: 'contractor2',
    tenant_id: 'jm-tenant1',
    type: 'MAIN_CONTRACTOR',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'jm-vendor1',
    name: '森泉',
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
    name: '相川',
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
    display_name: '寿司郎太阳宫店 管理员',
    role: 'BRANCH_ADMIN',
    org_id: 'jm-branch1',
    org_name: '寿司郎太阳宫店',
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
    display_name: '寿司郎太阳宫店 职员',
    role: 'EMPLOYEE',
    org_id: 'jm-branch1',
    org_name: '寿司郎太阳宫店',
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
    display_name: '建王 管理员',
    role: 'CONTRACTOR_ADMIN',
    org_id: 'jm-contractor1',
    org_name: '建王',
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
    display_name: '建王 职员',
    role: 'CONTRACTOR_EMPLOYEE',
    org_id: 'jm-contractor1',
    org_name: '建王',
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
    display_name: '建王 项目组',
    role: 'ENGINEER',
    org_id: 'jm-contractor1',
    org_name: '建王',
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
    display_name: '建王 项目组2',
    role: 'ENGINEER',
    org_id: 'jm-contractor1',
    org_name: '建王',
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
    display_name: '森泉 管理员',
    role: 'VENDOR_ADMIN',
    org_id: 'jm-vendor1',
    org_name: '森泉',
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
    display_name: '森泉 职员',
    role: 'VENDOR_EMPLOYEE',
    org_id: 'jm-vendor1',
    org_name: '森泉',
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
    display_name: '森泉 项目组',
    role: 'ENGINEER',
    org_id: 'jm-vendor1',
    org_name: '森泉',
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
    org_name: '希望',
    tenant_id: 'jm-tenant1',
    is_shadow: false,
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const yesterday = new Date(Date.now() - 86400000).toISOString()
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString()

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'jm-wo-001',
    order_no: 'WO-20260414-B1-0001',
    status: 'PENDING',
    store_id: 'jm-branch1',
    store_name: '寿司郎太阳宫店',
    category_path: ['消防门', '卖场', '甲级防火门'],
    brand_name: '盼盼',
    description: '卖场消防门把手损坏，无法正常关闭',
    photo_urls: [],
    is_urgent: false,
    priority: 0,
    address_detail: '北京市朝阳区建国路88号',
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: 'jm-wo-002',
    order_no: 'WO-20260414-B1-0002',
    status: 'PENDING',
    store_id: 'jm-branch1',
    store_name: '寿司郎太阳宫店',
    category_path: ['空调', '家用', '挂机'],
    brand_name: '格力',
    description: '空调不制冷，需要加氟处理',
    photo_urls: [],
    is_urgent: true,
    priority: 1,
    address_detail: '北京市朝阳区建国路88号',
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },
  {
    id: 'jm-wo-003',
    order_no: 'WO-20260414-B1-0003',
    status: 'PENDING',
    store_id: 'jm-branch2',
    store_name: 'Branch 002',
    category_path: ['电梯', '货梯', '三菱'],
    brand_name: '三菱',
    description: '电梯运行时有异响，需要检查',
    photo_urls: [],
    is_urgent: false,
    priority: 0,
    address_detail: '北京市海淀区中关村大街1号',
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },
  {
    id: 'jm-wo-004',
    order_no: 'WO-20260414-B1-0004',
    status: 'PENDING',
    store_id: 'jm-branch3',
    store_name: 'Branch 003',
    category_path: ['消防设施', '灭火器', 'ABC干粉'],
    brand_name: '消防设施',
    description: '灭火器压力不足，需要更换',
    photo_urls: [],
    is_urgent: true,
    priority: 2, // Emergency level for testing
    sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    priority_fee: 100.00,
    address_detail: '北京市东城区王府井大街255号',
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },
];

export const mockWorkRecords: WorkRecord[] = [
  {
    id: 'wr-001',
    user_id: 'jm-user-3',
    user_name: '寿司郎太阳宫店 职员',
    action: 'CREATE',
    details: '创建工单 WO-20260414-B1-0001',
    old_status: '',
    new_status: 'PENDING',
    created_at: yesterday,
  },
  {
    id: 'wr-002',
    user_id: 'jm-user-3',
    user_name: '寿司郎太阳宫店 职员',
    action: 'CREATE',
    details: '创建工单 WO-20260414-B1-0002',
    old_status: '',
    new_status: 'PENDING',
    created_at: twoDaysAgo,
  },
];

export const mockReservations: Reservation[] = [
  {
    id: 'jm-res-1',
    work_order_id: 'jm-wo-001',
    work_order_title: '卖场消防门把手损坏',
    proposer_id: 'jm-user-5',
    proposer_name: '建王 项目组',
    proposer_role: 'ENGINEER',
    proposed_time: '2026-04-14T10:00:00Z',
    status: 'pending',
    created_at: yesterday,
    updated_at: yesterday,
  },
];

