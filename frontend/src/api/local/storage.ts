import { STORAGE_KEYS, mockTenants, mockOrganizations, mockUsers, mockWorkOrders, mockWorkRecords, mockReservations } from './mockData'

const MOCK_VERSION_KEY = '_mock_version'
const MOCK_VERSION = 2

export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('localStorage set error:', error)
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(key)
  },

  clear: (): void => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
    localStorage.removeItem(STORAGE_KEYS.SESSION)
    localStorage.removeItem(STORAGE_KEYS.QR_TOKENS)
    localStorage.removeItem(MOCK_VERSION_KEY)
  },
}

export const initializeMockData = (): void => {
  const currentVersion = storage.get<number>(MOCK_VERSION_KEY)
  if (currentVersion !== MOCK_VERSION) {
    const keys = Object.values(STORAGE_KEYS)
    keys.forEach(key => localStorage.removeItem(key))
    localStorage.removeItem(STORAGE_KEYS.SESSION)
    localStorage.removeItem(STORAGE_KEYS.QR_TOKENS)
  }
  if (!storage.get(STORAGE_KEYS.TENANTS)) {
    storage.set(STORAGE_KEYS.TENANTS, mockTenants)
  }
  if (!storage.get(STORAGE_KEYS.ORGANIZATIONS)) {
    storage.set(STORAGE_KEYS.ORGANIZATIONS, mockOrganizations)
  }
  if (!storage.get(STORAGE_KEYS.USERS)) {
    storage.set(STORAGE_KEYS.USERS, mockUsers)
  }
  if (!storage.get(STORAGE_KEYS.WORKORDERS)) {
    storage.set(STORAGE_KEYS.WORKORDERS, mockWorkOrders)
  }
  if (!storage.get(STORAGE_KEYS.WORK_RECORDS)) {
    storage.set(STORAGE_KEYS.WORK_RECORDS, mockWorkRecords)
  }
  if (!storage.get(STORAGE_KEYS.RESERVATIONS)) {
    storage.set(STORAGE_KEYS.RESERVATIONS, mockReservations)
  }
  storage.set(MOCK_VERSION_KEY, MOCK_VERSION)
}

export const resetMockData = (): void => {
  storage.clear()
  initializeMockData()
}