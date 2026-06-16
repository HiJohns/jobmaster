import { useState } from 'react'
import { Card, Button } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { WorkOrder } from '../api/local'
import { getStatusConfig } from '../config/status'
import '../styles/workorder-center.css'

interface WorkOrderCenterProps {
  orders: WorkOrder[]
  loading: boolean
  hasMore: boolean
}

/**
 * WorkOrderCenter - Dual-column work order center
 * Left: Master list (Card-based)
 * Right: Detail view
 */
export function WorkOrderCenter({ orders, loading, hasMore }: WorkOrderCenterProps) {
  const navigate = useNavigate()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders.length > 0 ? orders[0].id : null)

  const selectedOrder = orders.find(order => order.id === selectedOrderId)

  // Filter out orders with unknown status and map ACCEPTED to DISPATCHED
  const filteredOrders = orders.filter(order => {
    // Skip orders with ACCEPTED status as it's not in the standard status config
    if (order.status === 'ACCEPTED') return false
    return true
  })

  const handleCardClick = (orderId: string) => {
    setSelectedOrderId(orderId)
  }

  const handleDetailClick = () => {
    if (selectedOrderId) {
      navigate(`/workorder/${selectedOrderId}`)
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <div className="loading-spinner" style={{ width: 32, height: 32, border: '2px solid #f3f3f3', borderTop: '2px solid #B81F25', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="workorder-center">
      {/* Master List - Left Column */}
      <div className="master-list">
        {filteredOrders.map((order) => {
          const statusConfig = getStatusConfig(order.status as any)
          const isSelected = order.id === selectedOrderId

          return (
            <Card
              key={order.id}
              className={`workorder-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleCardClick(order.id)}
              style={{
                marginBottom: 12,
                cursor: 'pointer',
                border: isSelected ? '2px solid #B81F25' : '1px solid #e8e8e8',
                backgroundColor: isSelected ? '#f0f8ff' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>{order.order_no}</span>
                <span style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: `${statusConfig.color}15`,
                  color: statusConfig.color,
                  border: `1px solid ${statusConfig.color}40`,
                }}>
                  {statusConfig.text}
                </span>
              </div>

              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                {order.store_name || '未知网点'}
              </div>

              <div style={{ fontSize: 13, color: '#888' }}>
                {order.address_detail || '地址未填写'}
              </div>

              {order.is_urgent && (
                <div style={{
                  marginTop: 8,
                  display: 'inline-block',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: '#ff4d4f15',
                  color: '#ff4d4f',
                  border: '1px solid #ff4d4f40',
                  fontWeight: 500,
                }}>
                  加急
                </div>
              )}
            </Card>
          )
        })}

        {!hasMore && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无工单数据
          </div>
        )}
      </div>

      {/* Detail View - Right Column */}
      <div className="detail-view">
        {selectedOrder ? (
          <Card title="工单详情" style={{ height: '100%' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold' }}>工单号:</span>
                <span>{selectedOrder.order_no}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold' }}>状态:</span>
                <span style={{
                  color: getStatusConfig(selectedOrder.status as any).color,
                  fontWeight: 500,
                }}>
                  {getStatusConfig(selectedOrder.status as any).text}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold' }}>网点:</span>
                <span>{selectedOrder.store_name || '未知'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold' }}>地址:</span>
                <span>{selectedOrder.address_detail || '未填写'}</span>
              </div>
            </div>

            <Button
              block
              color="primary"
              onClick={handleDetailClick}
              style={{ marginTop: 'auto' }}
            >
              查看完整详情
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
            请选择工单查看详情
          </div>
        )}
      </div>

      {/* Load more */}
      {!hasMore && orders.length > 0 && (
        <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 14 }}>
          没有更多数据了
        </div>
      )}
    </div>
  )
}
