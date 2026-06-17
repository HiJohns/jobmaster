import { useState, useEffect } from 'react'
import { Card, List, Image } from 'antd-mobile'
import { api } from '../api'

interface WorkOrderRecord {
  user_name: string
  details?: string
  timestamp?: string
  photo_urls?: string[]
  type?: string
}

interface Props {
  workOrderId: string
}

export default function WorkOrderRecords({ workOrderId }: Props) {
  const [records, setRecords] = useState<WorkOrderRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecords()
  }, [workOrderId])

  const fetchRecords = async () => {
    try {
      const response = await api.workorder.getRecords(workOrderId)
      setRecords(response?.data?.list || [])
    } catch (error) {
      console.error('Failed to fetch work order records:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 10, textAlign: 'center' }}>加载中...</div>
  }

  if (records.length === 0) {
    return <div style={{ padding: 10, textAlign: 'center', color: '#999' }}>暂无施工记录</div>
  }

  return (
    <Card title="施工记录" style={{ marginTop: '16px' }}>
      <List>
        {records.map((record, idx) => (
          <List.Item key={record.timestamp || idx}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {record.user_name}
              </div>
              <div style={{ fontSize: 13, color: '#F59E0B', marginBottom: 4 }}>
                {record.type === 'arrive' ? '📋 到场签到' : record.type === 'start' ? '🛠️ 开始施工' : record.type === 'finish' ? '✅ 施工完成' : ''}
              </div>
              {record.details && (
                <div style={{ fontSize: 14, marginBottom: 8 }}>{record.details}</div>
              )}
              {record.photo_urls && record.photo_urls.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {record.photo_urls.map((url: string, j: number) => (
                    <Image key={j} src={url} alt="施工照片" style={{ width: 80, height: 80, borderRadius: 4 }} />
                  ))}
                </div>
              )}
              {record.timestamp && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {new Date(record.timestamp).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          </List.Item>
        ))}
      </List>
    </Card>
  )
}
