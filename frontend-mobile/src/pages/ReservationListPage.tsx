import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tag, Toast, Empty } from 'antd-mobile'
import { localReservationApi } from '../api/local/reservation'
import { Reservation } from '../api/local/mockData'
import TabBar from '../components/TabBar'

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: '#FF8F1F' },
  confirmed: { text: '已确认', color: '#00B578' },
  rejected: { text: '已拒绝', color: '#FF4D4F' },
  expired: { text: '已过期', color: '#999' },
}

export default function ReservationListPage() {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await localReservationApi.list({
          page: 1,
          page_size: 20,
        }) as any
        setReservations(response.list || [])
      } catch (error) {
        console.error('Failed to fetch reservations:', error)
        Toast.show('获取预约列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchReservations()
  }, [])

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ padding: '12px', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ 
        padding: '16px 12px', 
        background: '#fff', 
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        marginBottom: '12px',
        borderBottom: '1px solid #eee'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>预约管理</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          加载中...
        </div>
      ) : reservations.length === 0 ? (
        <Empty description="暂无预约" />
      ) : (
        <div>
          {reservations.map(reservation => {
            const statusConfig = STATUS_LABELS[reservation.status] || STATUS_LABELS.pending
            return (
              <Card
                key={reservation.id}
                onClick={() => navigate(`/wechat/reservations/${reservation.id}`)}
                style={{
                  marginBottom: '12px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                }}
              >
                <div style={{ padding: '4px 0' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {reservation.work_order_title}
                    </div>
                    <Tag color={statusConfig.color} style={{ fontSize: '12px' }}>
                      {statusConfig.text}
                    </Tag>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {formatTime(reservation.proposed_time)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    申请人：{reservation.proposer_name}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <TabBar />
    </div>
  )
}