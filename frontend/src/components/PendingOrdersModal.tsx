import { useState, useEffect } from 'react'
import { Modal, List, Button, Tag, Toast } from 'antd-mobile'
import { getPendingOrders, removePendingOrder, clearPendingOrders, PendingOrder } from '../utils/pendingOrders'
import { api } from '../api/factory'

interface PendingOrdersModalProps {
  visible: boolean
  onClose: () => void
}

export const PendingOrdersModal: React.FC<PendingOrdersModalProps> = ({ visible, onClose }) => {
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (visible) {
      setOrders(getPendingOrders())
    }
  }, [visible])

  const handleSubmitAll = async () => {
    setSubmitting(true)
    let success = 0
    let failed = 0
    for (const order of orders) {
      try {
        await api.workorder.create({
          store_id: order.store_id,
          title: order.title,
          description: order.description,
          photo_urls: order.photo_urls || [],
          priority: order.priority as 0 | 1 | 2,
          is_urgent: order.is_urgent,
          address_detail: order.address_detail,
          category_id: order.category_id,
          coordinates: order.coordinates,
          appointment_type: order.appointment_type,
        })
        success++
      } catch {
        failed++
      }
    }
    clearPendingOrders()
    setOrders([])
    setSubmitting(false)
    Toast.show(`提交完成：成功 ${success} 条${failed ? `，失败 ${failed} 条` : ''}`)
    onClose()
  }

  const handleDelete = (id: string) => {
    removePendingOrder(id)
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`待提交工单（${orders.length}）`}
      content={
        <div style={{ minHeight: 200 }}>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无待提交工单
            </div>
          ) : (
            <List>
              {orders.map(order => (
                <List.Item
                  key={order.id}
                  extra={
                    <Button
                      size="small"
                      color="danger"
                      fill="none"
                      onClick={() => handleDelete(order.id)}
                    >
                      删除
                    </Button>
                  }
                >
                  <div style={{ fontWeight: 500 }}>{order.title}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {order.description?.slice(0, 50)}
                    {order.description?.length > 50 ? '...' : ''}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Tag color="default" style={{ fontSize: 11 }}>待提交</Tag>
                  </div>
                </List.Item>
              ))}
            </List>
          )}
          {orders.length > 0 && (
            <div style={{ padding: '12px 16px' }}>
              <Button
                block
                color="primary"
                loading={submitting}
                onClick={handleSubmitAll}
                style={{ height: 44, fontSize: 16 }}
              >
                一键提交（{orders.length} 条）
              </Button>
            </div>
          )}
        </div>
      }
    />
  )
}
