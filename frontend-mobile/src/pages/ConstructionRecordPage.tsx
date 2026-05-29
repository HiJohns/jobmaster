import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, TextArea, ImageUploader, Toast, NavBar, Card, Loading } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { LeftOutline } from 'antd-mobile-icons'
import { demoApi } from '../api/demo'

interface LogEntry {
  timestamp: string
  user_name: string
  type: string
  details: string
  photo_urls: string[]
}

export default function ConstructionRecordPage() {
  const { id: orderId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  if (!orderId) {
    Toast.show({ content: '无效的工单ID', icon: 'fail', duration: 2000 })
    navigate(-1)
    return null
  }

  const fetchRecords = async () => {
    setLogsLoading(true)
    try {
      const response = await demoApi.getWorkOrderRecords(orderId)
      const data = response.data || response
      setLogs(data.list || [])
    } catch {
      console.error('Failed to fetch records')
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [orderId])

  const handlePhotoUpload = async (file: File): Promise<ImageUploadItem> => {
    const url = URL.createObjectURL(file)
    setUploadedPhotos(prev => [...prev, url])
    return { url }
  }

  const submitRecord = async (andFinish: boolean) => {
    if (!message.trim() && uploadedPhotos.length === 0) {
      Toast.show({ content: '请至少填写留言或上传照片', icon: 'fail', duration: 2000 })
      return
    }
    setSubmitting(true)
    try {
      await demoApi.request({
        url: `/workorders/${orderId}/records`,
        method: 'POST',
        data: { message, photo_urls: uploadedPhotos },
      })

      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        user_name: '',
        type: 'record',
        details: message,
        photo_urls: uploadedPhotos,
      }
      setLogs(prev => [...prev, newLog])

      if (andFinish) {
        await demoApi.finishWorkOrder(orderId, { description: message, photo_urls: uploadedPhotos })
        Toast.show({ content: '施工完成', icon: 'success', duration: 1500 })
        setTimeout(() => navigate(-1), 1500)
      } else {
        Toast.show({ content: '提交成功', icon: 'success', duration: 1500 })
        setMessage('')
        setUploadedPhotos([])
        await fetchRecords()
      }
    } catch (error) {
      Toast.show({ content: '提交失败', icon: 'fail', duration: 2000 })
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <NavBar backArrow={<LeftOutline />} onBack={() => navigate(-1)} style={{ background: '#fff' }}>
        施工记录
      </NavBar>

      <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
        {/* 提交表单 */}
        <Card title="提交记录" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 0' }}>
            <TextArea
              placeholder="请描述施工情况或备注信息..."
              value={message}
              onChange={setMessage}
              rows={4}
              style={{ '--font-size': '16px', '--placeholder-color': '#999' }}
            />
            <div style={{ marginTop: '12px' }}>
              <ImageUploader
                upload={handlePhotoUpload}
                multiple
                maxCount={9}
                accept="image/*"
                deletable
                onDelete={(item: ImageUploadItem) => {
                  setUploadedPhotos(prev => prev.filter(p => p !== item.url))
                  return Promise.resolve(true)
                }}
              />
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <Button
            block
            size="large"
            loading={submitting}
            style={{ '--background-color': '#0033FF', '--text-color': '#fff', '--border-radius': '8px', height: '48px', fontSize: '16px' }}
            onClick={() => submitRecord(false)}
          >
            提交
          </Button>
          <Button
            block
            size="large"
            loading={submitting}
            style={{ '--background-color': '#00B578', '--text-color': '#fff', '--border-radius': '8px', height: '48px', fontSize: '16px' }}
            onClick={() => submitRecord(true)}
          >
            提交并结束
          </Button>
        </div>

        {/* 日志列表 */}
        <Card title="施工日志">
          {logsLoading ? (
            <Loading />
          ) : logs.length === 0 ? (
            <div style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '20px' }}>暂无记录</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>
                  {log.type === 'arrive' ? '📋 到场签到' : log.type === 'start' ? '🛠️ 开始施工' : '📝 施工记录'} · {formatTime(log.timestamp)}
                </div>
                {log.details && <div style={{ fontSize: '14px', color: '#333' }}>{log.details}</div>}
                {log.photo_urls && log.photo_urls.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {log.photo_urls.map((url: string, j: number) => (
                      <img key={j} src={url} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', background: '#eee' }} />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
