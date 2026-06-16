import { createContext, useContext, useEffect, useState } from 'react'

export interface BrandConfig {
  logo_url: string
  primary_color: string
  brand_name: string
}

interface ThemeContextType {
  brandConfig: BrandConfig | null
  setBrandConfig: (config: BrandConfig) => void
  applyTheme: (config: BrandConfig) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null)

  const applyTheme = (config: BrandConfig) => {
    // Apply CSS variables
    const root = document.documentElement
    root.style.setProperty('--primary-color', config.primary_color)
    
    // Set theme attribute for CSS selectors
    root.setAttribute('data-theme-primary', config.primary_color)
    
    // Update document title with brand name
    document.title = `${config.brand_name} - 工单匠`
  }

  const handleSetBrandConfig = (config: BrandConfig) => {
    setBrandConfig(config)
    applyTheme(config)
  }

  useEffect(() => {
    // Load theme from localStorage if exists
    const savedTheme = localStorage.getItem('brand_config')
    if (savedTheme) {
      try {
        const config = JSON.parse(savedTheme) as BrandConfig
        setBrandConfig(config)
        applyTheme(config)
      } catch (e) {
        console.error('Failed to load saved theme:', e)
      }
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ brandConfig, setBrandConfig: handleSetBrandConfig, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export default ThemeContext
