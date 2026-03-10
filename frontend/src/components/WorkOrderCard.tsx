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

import React from 'react'
import { Card, Tag, Flex } from 'antd-mobile'
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
      style={{
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: 16 }}
    >
      {/* Header: Order number and Status */}
      <Flex justify="between" align="center" style={{ marginBottom: 12 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#0033FF',
          }}
        >
          {order.order_no}
        </span>
        <Tag
          color={statusConfig.color}
          style={{
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {statusConfig.text}
        </Tag>
      </Flex>

      {/* Urgent badge */}
      {order.is_urgent && (
        <Flex
          align="center"
          style={{
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
        </Flex>
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

      {/* Photo thumbnails */}
      {order.photo_urls && order.photo_urls.length > 0 && (
        <Flex style={{ marginTop: 12 }}>
          {order.photo_urls.slice(0, 3).map((url, idx) => (
            <div
              key={idx}
              style={{
                width: 64,
                height: 64,
                marginRight: 8,
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
              }}
            >
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
          {order.photo_urls.length > 3 && (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: '#666',
              }}
            >
              +{order.photo_urls.length - 3}
            </div>
          )}
        </Flex>
      )}
    </Card>
  )
}

export default WorkOrderCard
