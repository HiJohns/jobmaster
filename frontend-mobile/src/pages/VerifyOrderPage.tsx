import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input, Dialog, Toast, NavBar } from 'antd-mobile'
import { localWorkorderApi } from '../api/local/workorder'

export default function VerifyOrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      try {
        const response = await localWorkorderApi.get(id) as any
        setOrder(response.data)
      } catch (error) {
        console.error('Failed to fetch order:', error)
        Toast.show('获取工单失败')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [id])

  const handleApprove = async () => {
    Dialog.confirm({
      content: '确认验收通过？',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await localWorkorderApi.verify(id!, 'approve', comment)
          Toast.show('验收通过')
          navigate(-1)
        } catch (error) {
          console.error('Approve failed:', error)
          Toast.show('操作失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Toast.show('请输入拒绝原因')
      return
    }
    Dialog.confirm({
      content: '确认验收不通过？',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await localWorkorderApi.verify(id!, 'reject', rejectReason)
          Toast.show('已拒绝')
          navigate(-1)
        } catch (error) {
          console.error('Reject failed:', error)
          Toast.show('操作失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>加载中...</div>
  }

  if (!order) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <NavBar onBack={() => navigate(-1)} style={{ background: '#fff' }}>验收工单</NavBar>

      <div style={{ padding: '12px' }}>
        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>{order.order_no}</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>网点：{order.store_name}</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>地址：{order.address_detail}</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>品牌：{order.brand_name}</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>分类：{order.category_path}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>描述：{order.description}</div>
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>验收说明（可选）</div>
            <Input
              placeholder="请输入验收说明"
              value={comment}
              onChange={setComment}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px', minHeight: '80px' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '14px', color: '#FF4D4F', marginBottom: '8px' }}>拒绝原因 *</div>
            <Input
              placeholder="请输入拒绝原因"
              value={rejectReason}
              onChange={setRejectReason}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px', minHeight: '80px' }}
            />
          </div>
        </Card>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button block color="success" onClick={handleApprove} loading={actionLoading} style={{ flex: 1 }}>验收通过</Button>
          <Button block color="danger" onClick={handleReject} loading={actionLoading} style={{ flex: 1 }}>验收不通过</Button>
        </div>
      </div>
    </div>
  )
}