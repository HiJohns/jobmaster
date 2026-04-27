import { useState, useEffect } from 'react'
import { Card, Button, Tag, Toast } from 'antd-mobile'
import { api } from '../api/factory'
import { useNavigate, useParams } from 'react-router-dom'

type ReservationDetail = {
  id: string
  work_order_title: string
  proposer_name: string
  proposed_time: string
  status: string
  created_at: string
}

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [reservation, setReservation] = useState<ReservationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchReservation()
  }, [id])

  const fetchReservation = async () => {
    try {
      const response = await api.reservation.get(id || '')
      setReservation(response.data || response)
    } catch (error) {
      console.error('Failed to fetch reservation:', error)
      Toast.show('加载预约详情失败')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    try {
      await api.reservation.confirm(id || '', '同意预约')
      Toast.show('预约已确认')
      setTimeout(() => navigate(-1), 1000)
    } catch (error) {
      Toast.show('操作失败')
    }
  }

  const handleReject = async () => {
    try {
      const reason = prompt('请输入拒绝原因：')
      if (reason) {
        await api.reservation.reject(id || '', reason)
        Toast.show('预约已拒绝')
        setTimeout(() => navigate(-1), 1000)
      }
    } catch (error) {
      Toast.show('操作失败')
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { text: string; color: string }> = {
      pending: { text: '待确认', color: '#FF8F1F' },
      confirmed: { text: '已确认', color: '#00B578' },
      rejected: { text: '已拒绝', color: '#FF4D4F' },
      expired: { text: '已过期', color: '#999' },
    }
    return configs[status] || { text: status, color: '#999' }
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>
  }

  if (!reservation) {
    return <div style={{ padding: 20, textAlign: 'center' }}>预约不存在</div>
  }

  const status = getStatusConfig(reservation.status)

  return (
    <div style={{ padding: 16 }}>
      <Card title="预约详情">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>工单标题</div>
          <div style={{ fontSize: 16 }}>{reservation.work_order_title}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>工程师</div>
          <div style={{ fontSize: 16 }}>{reservation.proposer_name}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>预约时间</div>
          <div style={{ fontSize: 16 }}>
            {reservation.proposed_time}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>状态</div>
          <Tag color={status.color}>{status.text}</Tag>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>创建时间</div>
          <div style={{ fontSize: 14, color: '#999' }}>
            {reservation.created_at}
          </div>
        </div>

        {reservation.status === 'pending' && (
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Button
              color="primary"
              onClick={handleConfirm}
              style={{ flex: 1 }}
            >
              确认预约
            </Button>
            <Button
              color="danger"
              onClick={handleReject}
              style={{ flex: 1 }}
            >
              拒绝预约
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
