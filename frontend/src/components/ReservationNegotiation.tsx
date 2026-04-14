import { useState, useEffect } from 'react'
import { Collapse, Timeline, Tag } from 'antd-mobile'
import { localReservationApi } from '../api/local/reservation'
import dayjs from 'dayjs'

interface Props {
  workOrderId: string
}

export default function ReservationNegotiation({ workOrderId }: Props) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNegotiationLogs()
  }, [workOrderId])

  const fetchNegotiationLogs = async () => {
    try {
      const response = await localReservationApi.listByWorkOrder(workOrderId, true)
      setLogs(response.list || [])
    } catch (error) {
      console.error('Failed to fetch negotiation logs:', error)
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
    return <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>加载中...</div>
  }

  if (logs.length === 0) {
    return <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>暂无预约协商记录</div>
  }

  return (
    <Collapse style={{ marginTop: '16px' }}>
      <Collapse.Panel title={`预约协商 (${logs.length})`} key="negotiation">
        <Timeline>
          {logs.map((log, index) => (
            <Timeline.Item key={log.id || index}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 500, fontSize: '14px' }}>
                  {dayjs(log.proposed_time).format('MM-DD HH:mm')}
                </span>
                <Tag color={getStatusConfig(log.status).color} style={{ marginLeft: 8 }}>
                  {getStatusConfig(log.status).text}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {log.proposer_name} ({log.proposer_role || '未知角色'})
              </div>
              {log.reject_reason && (
                <div style={{ fontSize: 12, color: '#FF4D4F', marginTop: 4, fontWeight: 500 }}>
                  拒绝原因：{log.reject_reason}
                </div>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      </Collapse.Panel>
    </Collapse>
  )
}
