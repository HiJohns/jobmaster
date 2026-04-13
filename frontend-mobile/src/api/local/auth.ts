import { storage, initializeMockData } from './storage'
import { STORAGE_KEYS, User, Tenant } from './mockData'

const DEMO_PASSWORD = 'demo123'

interface Session {
  user: User
  token: string
  tenant_id: string
}

interface MyTenant {
  tenant_id: string
  tenant_name: string
  tenant_code: string
  logo_url: string
  role: string
  org_id: string
  org_name: string
}

const generateToken = (): string => {
  return 'jm_token_' + Math.random().toString(36).substring(2, 15)
}

export const localAuthApi = {
  login: async (username: string, password: string) => {
    initializeMockData()

    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    const user = users.find((u) => u.username === username)

    if (!user) {
      throw new Error('用户不存在')
    }

    if (password !== DEMO_PASSWORD) {
      throw new Error('密码错误')
    }

    const tenants = storage.get<Tenant[]>(STORAGE_KEYS.TENANTS) || []
    const tenant = tenants.find((t) => t.id === user.tenant_id)

    if (!tenant) {
      throw new Error('租户不存在')
    }

    const token = generateToken()
    const session: Session = {
      user,
      token,
      tenant_id: user.tenant_id,
    }

    storage.set(STORAGE_KEYS.SESSION, session)

    return {
      token,
      user_id: user.id,
      username: user.username,
      role: user.role,
      org_id: user.org_id,
      tenant_id: user.tenant_id,
      display_name: user.display_name,
      is_impersonated: false,
    }
  },

  refreshToken: async () => {
    const session = storage.get<Session>(STORAGE_KEYS.SESSION)
    if (!session) {
      throw new Error('未登录')
    }

    const newToken = generateToken()
    session.token = newToken
    storage.set(STORAGE_KEYS.SESSION, session)

    return { token: newToken }
  },

  logout: async () => {
    storage.remove(STORAGE_KEYS.SESSION)
  },

  getSession: (): Session | null => {
    return storage.get<Session>(STORAGE_KEYS.SESSION)
  },

  getMyTenants: async (): Promise<MyTenant[]> => {
    const session = storage.get<Session>(STORAGE_KEYS.SESSION)
    if (!session) {
      throw new Error('未登录')
    }

    const tenants = storage.get<Tenant[]>(STORAGE_KEYS.TENANTS) || []
    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []

    const userTenants = users
      .filter((u) => u.email === session.user.email)
      .map((u) => {
        const tenant = tenants.find((t) => t.id === u.tenant_id)
        return {
          tenant_id: u.tenant_id,
          tenant_name: tenant?.name || '',
          tenant_code: tenant?.code || '',
          logo_url: '',
          role: u.role,
          org_id: u.org_id,
          org_name: u.org_name,
        }
      })

    return userTenants
  },

  selectTenant: async (tenantId: string): Promise<void> => {
    const session = storage.get<Session>(STORAGE_KEYS.SESSION)
    if (!session) {
      throw new Error('未登录')
    }

    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    const user = users.find(
      (u) => u.email === session.user.email && u.tenant_id === tenantId
    )

    if (!user) {
      throw new Error('用户在选定租户下不存在')
    }

    session.tenant_id = tenantId
    session.user = user
    storage.set(STORAGE_KEYS.SESSION, session)
  },
}

export default localAuthApi