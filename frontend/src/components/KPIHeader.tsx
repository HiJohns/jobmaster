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
}

const KPI_ITEMS = [
  { key: 'total', label: '今日工单', value: 'total' as const },
  { key: 'pending', label: '待处理', value: 'pending' as const },
  { key: 'working', label: '进行中', value: 'working' as const },
  { key: 'abnormal', label: '异常', value: 'abnormal' as const },
]

export default function KPIHeader({ stats, onTabChange }: Props) {
  return (
    <Row gutter={16} style={{ marginBottom: theme.spacing.section }}>
      {KPI_ITEMS.map(item => (
        <Col span={6} key={item.key}>
          <Card
            hoverable
            onClick={() => onTabChange(item.key)}
            style={{
              background: '#F8FAFC',
              borderRadius: theme.borderRadius,
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #E5E7EB',
              transition: 'all 0.3s ease',
            }}
            styles={{ body: { padding: "20px" } }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.primary }}>
              {stats[item.value]}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
              {item.label}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}
