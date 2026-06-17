import { Card, Row, Col } from 'antd'
import { theme } from '../styles/theme'

interface Props {
  stats: {
    total: number
    pending: number
    working: number
    abnormal: number
  }
  onTabChange: (key: string) => void
  activeFilter: string
}

const KPI_ITEMS = [
  { key: 'total', label: '今日工单', value: 'total' as const, color: '#1f2937' },
  { key: 'pending', label: '待处理', value: 'pending' as const, color: '#475569' },
  { key: 'working', label: '进行中', value: 'working' as const, color: '#B45309' },
  { key: 'abnormal', label: '异常', value: 'abnormal' as const, color: '#F59E0B' },
]

export default function KPIHeader({ stats, onTabChange, activeFilter }: Props) {
  return (
    <Row gutter={16} style={{ marginBottom: theme.spacing.section }}>
      {KPI_ITEMS.map(item => {
        const isActive = activeFilter === item.key
        return (
          <Col span={6} key={item.key}>
            <Card
              hoverable
              onClick={() => onTabChange(item.key)}
              style={{
                background: isActive ? '#ffffff' : '#F8FAFC',
                borderRadius: theme.borderRadius,
                textAlign: 'center',
                cursor: 'pointer',
                border: isActive ? `2px solid ${item.color}` : '1px solid #E5E7EB',
                boxShadow: isActive 
                  ? '0 4px 12px rgba(0, 51, 255, 0.15)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s ease',
                transform: isActive ? 'translateY(-2px)' : 'none',
              }}
              styles={{ body: { padding: "20px" } }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: item.color }}>
                {stats[item.value]}
              </div>
              <div style={{ fontSize: '12px', color: isActive ? item.color : '#9CA3AF', marginTop: '4px', fontWeight: isActive ? '500' : 'normal' }}>
                {item.label}
              </div>
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}
