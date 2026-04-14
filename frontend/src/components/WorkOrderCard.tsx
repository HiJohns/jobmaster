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
import { useState, useEffect } from 'react'
import { theme } from '../styles/theme'



/**
 * Calculate remaining SLA time
 */
const calculateSLA = (createdAt: string, isUrgent: boolean) => {
  if (!isUrgent) return null
  
  // 4 hours SLA for urgent orders (in milliseconds)
  const SLA_DURATION = 4 * 60 * 60 * 1000
  const createdTime = new Date(createdAt).getTime()
  const deadlineTime = createdTime + SLA_DURATION
  const remaining = deadlineTime - Date.now()
  
  if (remaining <= 0) return { text: 'SLA: 已超时', isOverdue: true }
  
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  
  return { text: `SLA: ${hours}h ${minutes}m`, isOverdue: false }
}



/**
 * Calculate hop count color based on ratio
 */
const getHopColor = (currentHop?: number, hopLimit?: number) => {
  if (!currentHop || !hopLimit || hopLimit <= 0) return '#9CA3AF'
  
  const ratio = currentHop / hopLimit
  if (ratio >= 0.8) return '#F59E0B' // Warning: yellow
  if (ratio >= 0.5) return '#3B82F6'  // Normal: blue
  return '#10B981'  // Safe: green
}

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
  const [slaDisplay, setSlaDisplay] = useState<{ text: string; isOverdue: boolean } | null>(null)

  // Update SLA countdown every minute
  useEffect(() => {
    if (order.is_urgent) {
      const updateSLA = () => {
        const sla = calculateSLA(order.created_at, order.is_urgent)
        setSlaDisplay(sla)
      }
      
      updateSLA()
      const timer = setInterval(updateSLA, 60000) // Update every minute
      
      return () => clearInterval(timer)
    }
  }, [order.created_at, order.is_urgent])

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
    <>
      <style>
        {`
          @keyframes urgent-pulse {
            0%, 100% { 
              box-shadow: 0 0 0 1px #EF4444, 0 4px 12px rgba(239, 68, 68, 0.15); 
            }
            50% { 
              box-shadow: 0 0 0 2px #EF4444, 0 4px 16px rgba(239, 68, 68, 0.3); 
            }
          }
        `}
      </style>
      <Card
        onClick={handleClick}
        className={`card-layout transition-all active:scale-[0.98] hover:shadow-lg ${order.is_urgent ? 'urgent-card' : ''}`}
        style={{
          marginBottom: 16,
          position: 'relative',
          borderRadius: theme.borderRadius,
          overflow: 'hidden',
          border: 'none',
          // Urgent order styling
          ...(order.is_urgent ? {
            borderLeft: '4px solid #EF4444',
            boxShadow: '0 0 0 1px #EF4444, 0 4px 12px rgba(239, 68, 68, 0.15)',
            animation: 'urgent-pulse 2s ease-in-out infinite',
          } : {}),
        }}
        styles={{ body: { padding: 0 } }}
      >
      {/* Left color bar */}
      {!order.is_urgent && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: statusConfig.color, zIndex: 10 }} />
      )}
      
      <div style={{ padding: '16px 16px 16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
      {/* Header: Order number and Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.primary,
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

      {/* Urgent badge with SLA countdown */}
      {order.is_urgent && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: 'space-between',
            marginBottom: 12,
            padding: '6px 12px',
            backgroundColor: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FireFill style={{ color: '#ff4d4f', fontSize: 16, marginRight: 6 }} />
            <span style={{ color: '#ff4d4f', fontSize: 13, fontWeight: 'bold' }}>
              加急工单
            </span>
          </div>
          {slaDisplay && (
            <span style={{ 
              color: slaDisplay.isOverdue ? '#DC2626' : '#F59E0B', 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: slaDisplay.isOverdue ? '#FEE2E2' : '#FEF3C7',
              padding: '2px 6px',
              borderRadius: 4,
            }}>
              {slaDisplay.text}
            </span>
          )}
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
                color: theme.primary,
                fontWeight: 500,
              }}
            >
              {renderCategoryPath(order.category_path)}
            </span>
          </div>
        )}

        {/* 责任主体和跳数 */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {order.owner_org_name && (
            <span style={{
              background: '#3B82F6',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              @{order.owner_org_name}
            </span>
          )}
          {typeof order.current_hop === 'number' && typeof order.hop_limit === 'number' && order.hop_limit > 0 && (
            <span style={{
              fontSize: '12px',
              color: getHopColor(order.current_hop, order.hop_limit),
              fontWeight: 500,
              backgroundColor: order.current_hop >= order.hop_limit * 0.8 ? '#FEF3C7' : 'transparent',
              padding: order.current_hop >= order.hop_limit * 0.8 ? '2px 8px' : '2px 0px',
              borderRadius: 4,
            }}>
              Hop: {order.current_hop}/{order.hop_limit}
            </span>
          )}
        </div>
      </div>
        
        {/* Right side thumbnail */}
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
    </>
  )
}

export default WorkOrderCard
