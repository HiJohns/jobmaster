import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Tag, Input, Dialog, Toast } from 'antd-mobile'
import { localReservationApi } from '../api/local/reservation'
import { Reservation } from '../api/local/mockData'

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: '#FF8F1F' },
  confirmed: { text: '已确认', color: '#00B578' },
  rejected: { text: '已拒绝', color: '#FF4D4F' },
  expired: { text: '已过期', color: '#999' },
}

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [newTime, setNewTime] = useState('')

  const fetchReservation = async () => {
    if (!id) {
      Toast.show('无效的预约ID')
      navigate(-1)
      return
    }
    try {
      const data = await localReservationApi.get(id) as Reservation
      setReservation(data)
    } catch (error) {
      console.error('Failed to fetch reservation:', error)
      Toast.show('获取预约详情失败')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservation()
  }, [id])

  const handleConfirm = async () => {
    Dialog.confirm({
      content: '确认此预约时间？',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await localReservationApi.confirm(id!, '')
          Toast.show('预约已确认')
          navigate(-1)
        } catch (error) {
          console.error('Confirm failed:', error)
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
      content: '确定拒绝此预约？',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await localReservationApi.reject(id!, rejectReason)
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

  const handleReschedule = async () => {
    if (!newTime) {
      Toast.show('请输入新预约时间')
      return
    }
    Dialog.confirm({
      content: '确定改期？',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await localReservationApi.reschedule(id!, newTime, '改期')
          Toast.show('已改期')
          navigate(-1)
        } catch (error) {
          console.error('Reschedule failed:', error)
          Toast.show('操作失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        加载中...
      </div>
    )
  }

  if (!reservation) {
    return null
  }

  const statusConfig = STATUS_LABELS[reservation.status] || STATUS_LABELS.pending

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ 
        padding: '16px', 
        background: '#fff',
        borderBottom: '1px solid #eee'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>预约详情</div>
      </div>

      <div style={{ padding: '12px' }}>
        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>工单</div>
              <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
              {reservation.work_order_title}
            </div>
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>预约时间</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF8F1F' }}>
              {formatTime(reservation.proposed_time)}
            </div>
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>申请人</div>
            <div style={{ fontSize: '16px' }}>{reservation.proposer_name}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {reservation.proposer_role === 'ENGINEER' ? '工程师' : '分公司员工'}
            </div>
          </div>
        </Card>

        {reservation.status === 'pending' && (
          <Card style={{ borderRadius: '8px' }}>
            <div style={{ padding: '12px' }}>
              <Input
                placeholder="拒绝原因（必填）"
                value={rejectReason}
                onChange={setRejectReason}
                style={{ 
                  background: '#f5f5f5', 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '12px'
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  block
                  color="success"
                  onClick={handleConfirm}
                  loading={actionLoading}
                  style={{ flex: 1 }}
                >
                  确认预约
                </Button>
                <Button
                  block
                  color="danger"
                  onClick={handleReject}
                  loading={actionLoading}
                  style={{ flex: 1 }}
                >
                  拒绝
                </Button>
              </div>
            </div>
          </Card>
        )}

        {reservation.status === 'confirmed' && (
          <Card style={{ borderRadius: '8px' }}>
            <div style={{ padding: '12px' }}>
              <Input
                placeholder="输入新预约时间"
                value={newTime}
                onChange={setNewTime}
                style={{ 
                  background: '#f5f5f5', 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '12px'
                }}
              />
              <Button
                block
                color="primary"
                onClick={handleReschedule}
                loading={actionLoading}
              >
                改期
              </Button>
            </div>
          </Card>
        )}

        {reservation.reject_reason && (
          <Card style={{ borderRadius: '8px', marginTop: '12px' }}>
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>拒绝原因</div>
              <div style={{ fontSize: '14px', color: '#FF4D4F' }}>
                {reservation.reject_reason}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}