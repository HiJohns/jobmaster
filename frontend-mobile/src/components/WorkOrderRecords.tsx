import { useState, useEffect } from 'react'
import { Card, List, Image } from 'antd-mobile'
import { api } from '../api'

interface WorkOrderRecord {
  id: string
  user_name: string
  message: string
  photo_urls?: string[]
  created_at: string
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
        {records.map((record) => (
          <List.Item key={record.id}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {record.user_name}
              </div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{record.message}</div>
              {record.photo_urls && record.photo_urls.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Image
                    src={record.photo_urls[0]}
                    alt="施工照片"
                    style={{ width: 80, height: 80, borderRadius: 4 }}
                  />
                </div>
              )}
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                {record.created_at}
              </div>
            </div>
          </List.Item>
        ))}
      </List>
    </Card>
  )
}
