import { Card } from 'antd-mobile'
//import { useNavigate } from 'react-router-dom'
//import { UserRole } from '../api/local'
import { RightOutline } from 'antd-mobile-icons'

interface StatCardProps {
  title: string
  value: number
  color: string
  onClick?: () => void
  trend?: 'up' | 'down' | 'stable'
}

/**
 * StatCard - Reusable statistics card component
 * Displays title, value, and optional trend
 */
export function StatCard({ title, value, color, onClick, trend = 'stable' }: StatCardProps) {
  const trendColor = trend === 'up' ? '#C49A3C' : trend === 'down' ? '#FF4D4F' : '#999'
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'

  return (
    <Card
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`,
        background: '#fff',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{title}</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{value}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: trendColor }}>{trendIcon}</span>
          {onClick && <RightOutline style={{ color: '#999' }} />}
        </div>
      </div>
    </Card>
  )
}
