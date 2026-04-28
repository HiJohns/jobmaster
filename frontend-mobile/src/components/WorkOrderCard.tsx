import { Card } from 'antd-mobile'
import { theme } from '../styles/theme'

export interface WorkOrder {
  id: string
  order_no: string
  title?: string
  status: string
  store_name: string
  address_detail: string
  category_path: string
  brand_name: string
  appointed_at?: string
  description: string
  engineer_name?: string
  created_at: string
  is_urgent?: boolean
}

interface WorkOrderCardProps {
  order: WorkOrder
  onClick: (orderId: string) => void
}

const STATUS_CONFIG: Record<string, { text: string; color: string; bgColor: string }> = {
  PENDING: { text: '待处理', color: '#999999', bgColor: '#f0f0f0' },
  DISPATCHED: { text: '已分配', color: '#0033FF', bgColor: '#e6f0ff' },
  ACCEPTED: { text: '已接单', color: '#00B578', bgColor: '#e6f9f2' },
  RESERVED: { text: '已预约', color: '#FF8F1F', bgColor: '#fff4e6' },
  WORKING: { text: '施工中', color: '#6366F1', bgColor: '#e6e7ff' },
  FINISHED: { text: '已完成', color: '#10B981', bgColor: '#e6f8f1' },
  CLOSED: { text: '已关闭', color: '#1F2937', bgColor: '#f3f4f6' },
}

/**
 * WorkOrderCard - 工单卡片组件
 * 功能：显示工单基本信息，支持点击跳转
 */
export default function WorkOrderCard({ order, onClick }: WorkOrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING

  return (
    <Card
      style={{
        marginBottom: '12px',
        cursor: 'pointer',
        border: '1px solid #e8e8e8',
        borderRadius: theme.borderRadius,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
      onClick={() => onClick(order.id)}
    >
      <div style={{ padding: '16px' }}>
        {/* 工单头部：工单号 + 状态 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {order.order_no}
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 500,
              color: statusConfig.color,
              backgroundColor: statusConfig.bgColor,
            }}
          >
            {statusConfig.text}
          </div>
        </div>

        {/* 工单标题 - 视觉中心 */}
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
          {order.title || order.description}
        </div>

        {/* 工单内容 - 地址 > 网点 */}
        <div>
          <div style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '8px' }}>
            {order.address_detail}
          </div>
          <div style={{ fontSize: '13px', color: theme.textDisabled }}>
            {order.store_name}
          </div>
          {order.appointed_at && (
            <div style={{ fontSize: '13px', color: theme.textDisabled, marginBottom: '4px' }}>
              预约时间：{new Date(order.appointed_at).toLocaleString()}
            </div>
          )}
          {order.is_urgent && (
            <div
              style={{
                marginTop: '8px',
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#ff4d4f',
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
              }}
            >
              加急
            </div>
          )}
        </div>

        {/* 工单底部 */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', fontSize: '12px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
          <div>创建时间：{new Date(order.created_at).toLocaleString()}</div>
          <div>工程师：{order.engineer_name || '未分配'}</div>
        </div>
      </div>
    </Card>
  )
}
