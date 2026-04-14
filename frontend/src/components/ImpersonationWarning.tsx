import { useAuthStore } from '../store/useAuthStore'
import { Button } from 'antd-mobile'

interface Props {
  onExit?: () => void
}

export default function ImpersonationWarning({ onExit }: Props) {
  const { isImpersonated, exitImpersonation } = useAuthStore()
  
  if (!isImpersonated) return null
  
  const handleExit = () => {
    if (onExit) {
      onExit()
    } else {
      exitImpersonation()
    }
  }
  
  return (
    <div style={{
      background: '#7C3AED',
      color: '#fff',
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <span style={{ fontSize: '14px' }}>当前处于管理提权模式，操作将影响组织架构</span>
      <Button 
        size="small" 
        style={{ 
          background: 'rgba(255,255,255,0.2)', 
          border: '1px solid rgba(255,255,255,0.5)', 
          color: '#fff',
          fontSize: '12px',
        }}
        onClick={handleExit}
      >
        退出提权
      </Button>
    </div>
  )
}
