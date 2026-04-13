export const USE_LOCAL_API = import.meta.env.VITE_USE_LOCAL_API === 'true'

export const API_BASE_URL = USE_LOCAL_API
  ? ''
  : import.meta.env.VITE_API_BASE_URL || '/api/v1'