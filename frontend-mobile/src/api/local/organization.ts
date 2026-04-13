import { storage } from './storage'
import { STORAGE_KEYS, Organization, User } from './mockData'

const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

const getCurrentUser = (): User | null => {
  const session = storage.get<{ user: User }>(STORAGE_KEYS.SESSION)
  return session?.user || null
}

export const localOrganizationApi = {
  list: async (params?: {
    type?: string
    parent_id?: string
    page?: number
    page_size?: number
  }) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    let orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []

    if (user.role === 'HQ_ADMIN') {
      // HQ can see all organizations
    } else if (user.role === 'BRANCH_ADMIN' || user.role === 'EMPLOYEE') {
      orgs = orgs.filter((o) => o.id === user.org_id)
    } else if (
      user.role === 'CONTRACTOR_ADMIN' ||
      user.role === 'CONTRACTOR_EMPLOYEE'
    ) {
      orgs = orgs.filter((o) => o.id === user.org_id || o.parent_id === user.org_id)
    } else if (user.role === 'VENDOR_ADMIN' || user.role === 'VENDOR_EMPLOYEE') {
      orgs = orgs.filter((o) => o.id === user.org_id)
    }

    if (params?.type) {
      orgs = orgs.filter((o) => o.type === params.type)
    }

    if (params?.parent_id) {
      orgs = orgs.filter((o) => o.parent_id === params.parent_id)
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = orgs.slice(start, end)

    return {
      list,
      total: orgs.length,
      page,
      page_size: pageSize,
    }
  },

  get: async (id: string) => {
    const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
    const org = orgs.find((o) => o.id === id)

    if (!org) {
      throw new Error('组织不存在')
    }

    return org
  },

  create: async (data: {
    name: string
    code: string
    type: Organization['type']
    parent_id?: string
  }) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    if (
      user.role !== 'HQ_ADMIN' &&
      user.role !== 'CONTRACTOR_ADMIN' &&
      user.role !== 'VENDOR_ADMIN'
    ) {
      throw new Error('无权限创建组织')
    }

    const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
    const now = new Date().toISOString()

    const newOrg: Organization = {
      id: generateId('jm-org'),
      name: data.name,
      code: data.code,
      tenant_id: user.tenant_id,
      parent_id: data.parent_id,
      type: data.type,
      status: 1,
      created_at: now,
      updated_at: now,
    }

    orgs.push(newOrg)
    storage.set(STORAGE_KEYS.ORGANIZATIONS, orgs)

    return newOrg
  },

  listUsers: async (orgId: string) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('未登录')
    }

    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    const orgUsers = users.filter((u) => u.org_id === orgId)

    return {
      list: orgUsers,
      total: orgUsers.length,
    }
  },

  createUser: async (orgId: string, data: {
    username: string
    display_name: string
    email: string
    role: User['role']
  }) => {
    const user = getCurrentUser()
    if (!user) {
      throw new Error('无权限创建用户')
    }

    const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
    const org = orgs.find((o) => o.id === orgId)
    if (!org) {
      throw new Error('组织不存在')
    }

    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    const now = new Date().toISOString()

    const newUser: User = {
      id: generateId('jm-user'),
      username: data.username,
      email: data.email,
      display_name: data.display_name,
      role: data.role,
      org_id: orgId,
      org_name: org.name,
      tenant_id: user.tenant_id,
      is_shadow: false,
      status: 1,
      created_at: now,
      updated_at: now,
    }

    users.push(newUser)
    storage.set(STORAGE_KEYS.USERS, users)

    return newUser
  },
}

export default localOrganizationApi