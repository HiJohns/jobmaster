/**
 * WorkOrder Card Component
 * Displays work order information in a card format
 * 
 * Features:
 * - Order number, address, store name, brand, category
 * - Thumbnail images
 * - Red urgent badge for is_urgent orders
 * - Status badge with appropriate color
 */

import { Card } from 'antd-mobile'
import { FireFill } from 'antd-mobile-icons'
import { WorkOrder } from '../api/workorder'
import { getStatusConfig } from '../config/status'

interface WorkOrderCardProps {
  /** Work order data */
  order: WorkOrder
  /** Click handler */
  onClick?: (orderId: string) => void
}

/**
 * WorkOrder Card Component
 */
function WorkOrderCard({ order, onClick }: WorkOrderCardProps) {
  const statusConfig = getStatusConfig(order.status)

  const handleClick = () => {
    if (onClick) {
      onClick(order.id)
    }
  }

  /**
   * Render category path as breadcrumbs
   * e.g., ["内装", "卖场", "消防门"] -> "内装 > 卖场 > 消防门"
   */
  const renderCategoryPath = (paths: string[]) => {
    if (!paths || paths.length === 0) return '-'
    return paths.join(' > ')
  }

  return (
    <Card
      onClick={handleClick}
      className="card-layout transition-all active:scale-[0.98] hover:shadow-lg"
      style={{
        marginBottom: 16,
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        border: 'none',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Left color bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: statusConfig.color, zIndex: 10 }} />
      
      <div style={{ padding: '16px 16px 16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
      {/* Header: Order number and Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#0033FF',
          }}
        >
          {order.order_no}
        </span>
        <div
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: `${statusConfig.color}15`, // Light background (approx 8-10% opacity)
            color: statusConfig.color,
            border: `1px solid ${statusConfig.color}40`,
            fontWeight: 500,
          }}
        >
          {statusConfig.text}
        </div>
      </div>

      {/* Urgent badge */}
      {order.is_urgent && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
            padding: '6px 12px',
            backgroundColor: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 6,
          }}
        >
          <FireFill style={{ color: '#ff4d4f', fontSize: 16, marginRight: 6 }} />
          <span style={{ color: '#ff4d4f', fontSize: 13, fontWeight: 'bold' }}>
            加急工单
          </span>
        </div>
      )}

      {/* Content */}
      <div style={{ marginBottom: 12 }}>
        {/* Store name */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#666' }}>网点: </span>
          <span style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>
            {order.store_name || order.store_id}
          </span>
        </div>

        {/* Address */}
        {order.address_detail && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#666' }}>地址: </span>
            <span style={{ fontSize: 14, color: '#333' }}>
              {order.address_detail}
            </span>
          </div>
        )}

        {/* Brand */}
        {order.brand_name && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#666' }}>品牌: </span>
            <span style={{ fontSize: 14, color: '#333' }}>
              {order.brand_name}
            </span>
          </div>
        )}

        {/* Category path */}
        {order.category_path && order.category_path.length > 0 && (
          <div>
            <span style={{ fontSize: 13, color: '#666' }}>分类: </span>
            <span
              style={{
                fontSize: 14,
                color: '#0033FF',
                fontWeight: 500,
              }}
            >
              {renderCategoryPath(order.category_path)}
            </span>
          </div>
        )}
      </div>

      </div>
        
        {/* Right side thumbnail */}
        {order.photo_urls && order.photo_urls.length > 0 && (
          <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
            <img 
              src={order.photo_urls[0]} 
              alt="Thumbnail" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {order.photo_urls.length > 1 && (
              <div style={{ position: 'absolute', right: 4, bottom: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
                {order.photo_urls.length}图
              </div>
            )}
          </div>
        )}
      </div>
      </Card>
  )
}

export default WorkOrderCard
