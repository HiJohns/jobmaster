import { useState, useEffect } from 'react'
import { Card, Button, Toast, NavBar, Empty } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { demoApi } from '../api/demo'
import { getPendingOrders, removePendingOrder, clearPendingOrders, PendingOrder } from '../utils/pendingOrders'

export default function PendingOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setOrders(getPendingOrders())
  }, [])

  const handleSubmitAll = async () => {
    setSubmitting(true)
    let success = 0
    let failed = 0
    for (const order of orders) {
      try {
        const resp = await demoApi.createWorkOrder({
          title: order.title,
          description: order.description,
          category_id: order.category_id || '',
          category_path: '',
          photo_urls: order.photo_urls || [],
          priority: order.priority,
          is_urgent: order.is_urgent,
          address_detail: order.address_detail || '',
          appointment_type: order.appointment_type || 1,
          time_slots: (order as any).time_slots,
        }) as any
        // If contractor was selected, dispatch
        if (order.selected_contractor && resp?.id) {
          try {
            await demoApi.dispatchWorkOrder(resp.id, order.selected_contractor)
          } catch { /* dispatch failed but order created */ }
        }
        success++
      } catch {
        failed++
      }
    }
    clearPendingOrders()
    setOrders([])
    setSubmitting(false)
    Toast.show(`提交完成：成功 ${success} 条${failed ? `，失败 ${failed} 条` : ''}`)
    navigate(-1)
  }

  const handleDelete = (id: string) => {
    removePendingOrder(id)
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <NavBar onBack={() => navigate(-1)}>待提交工单（{orders.length}）</NavBar>
      <div style={{ padding: 16 }}>
        {orders.length === 0 ? (
          <Empty description="暂无待提交工单" />
        ) : (
          orders.map(order => (
            <Card key={order.id} style={{ marginBottom: 12, borderRadius: 12 }}>
              <div style={{ padding: 8 }}>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{order.title}</div>
                <div style={{ fontSize: 13, color: '#999', marginTop: 6 }}>
                  {order.description?.slice(0, 50)}
                  {order.description?.length > 50 ? '...' : ''}
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#C45C4E' }}>待提交</span>
                  <Button size="small" color="danger" fill="none" onClick={() => handleDelete(order.id)}>
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
        {orders.length > 0 && (
          <Button
            block
            color="primary"
            loading={submitting}
            onClick={handleSubmitAll}
            style={{ height: 48, fontSize: 16, borderRadius: 12, marginTop: 16 }}
          >
            一键提交（{orders.length} 条）
          </Button>
        )}
      </div>
    </div>
  )
}
