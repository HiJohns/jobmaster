import { useState, useEffect } from 'react'
import { Card, Tag, Empty } from 'antd-mobile'
import { api } from '../api/factory'
import { useNavigate } from 'react-router-dom'

export default function ReservationListPage() {
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    try {
      const response = await api.reservation.list()
      const list = response?.data?.list || response?.list || []
      setReservations(list as any[])
    } catch (error) {
      console.error('Failed to fetch reservations:', error)
    } finally {
      setLoading(false)
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

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        预约管理 ({reservations.length})
      </div>
      
      {reservations.length === 0 ? (
        <Empty description="暂无预约" />
      ) : (
        <div>
          {reservations.map((reservation) => {
            const status = getStatusConfig(reservation.status)
            return (
              <Card
                key={reservation.id}
                style={{ marginBottom: 12 }}
                onClick={() => navigate(`/reservations/${reservation.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>
                      {reservation.work_order_title}
                    </div>
                    <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                      {reservation.proposer_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {reservation.proposed_time}
                    </div>
                  </div>
                  <Tag color={status.color}>
                    {status.text}
                  </Tag>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
