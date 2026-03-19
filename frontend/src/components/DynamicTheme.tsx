import { useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import request from '../utils/auth'

interface BrandConfig {
  logo_url: string
  primary_color: string
  brand_name: string
}

interface SessionResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  brand_config: BrandConfig
  organization?: {
    id: string
    name: string
    is_shadow: boolean
  }
}

export default function DynamicThemeLoader({ children }: { children: React.ReactNode }) {
  const { setBrandConfig } = useTheme()

  useEffect(() => {
    const loadSessionAndTheme = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return
      }

      try {
        const response = await request.get<{ data: SessionResponse }>('/auth/session')
        const { brand_config } = response.data.data

        if (brand_config) {
          setBrandConfig({
            logo_url: brand_config.logo_url || '',
            primary_color: brand_config.primary_color || '#0033FF',
            brand_name: brand_config.brand_name || 'JobMaster',
          })
        }
      } catch (error) {
        console.error('Failed to load session or theme:', error)
      }
    }

    loadSessionAndTheme()
  }, [setBrandConfig])

  return <>{children}</>
}
