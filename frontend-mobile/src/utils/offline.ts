const DB_NAME = 'JobMasterOfflineDB'
const STORE_NAME = 'pending_repairs'

interface OfflineRepair {
  id: string
  device_id: string
  description: string
  photos: string[]
  created_at: string
  synced: boolean
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export async function saveOfflineRepair(repair: OfflineRepair): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(repair)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function getOfflineRepairs(): Promise<OfflineRepair[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

export async function deleteOfflineRepair(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function syncOfflineRepairs(): Promise<number> {
  const repairs = await getOfflineRepairs()
  let syncedCount = 0

  for (const repair of repairs) {
    if (repair.synced) continue

    try {
      const response = await fetch('/api/v1/workorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repair),
      })

      if (response.ok) {
        await deleteOfflineRepair(repair.id)
        syncedCount++
      }
    } catch (error) {
      console.error('Failed to sync repair:', error)
    }
  }

  return syncedCount
}

export function isOnline(): boolean {
  return navigator.onLine
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

export function generateRepairId(): string {
  return `repair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
