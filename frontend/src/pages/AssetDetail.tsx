import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, Timeline, Spin, message, Tag, QRCode } from 'antd'
import { ArrowLeftOutlined, QrcodeOutlined, PrinterOutlined } from '@ant-design/icons'
import request from '../utils/auth'

interface Device {
  id: string
  sn: string
  name: string
  model: string
  brand: string
  org_id: string
  status: string
  site_name?: string
  info?: Record<string, unknown>
  created_at: string
}

interface QRData {
  device_id: string
  sn: string
  qr_url: string
  expires_at: string
}

const statusColors: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  MAINTENANCE: 'orange',
  REPAIRING: 'red',
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device | null>(null)
  const [qrData, setQRData] = useState<QRData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQRLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchDevice()
    }
  }, [id])

  const fetchDevice = async () => {
    setLoading(true)
    try {
      const response = await request.get(`/devices/${id}`)
      if (response.data.code === 200) {
        setDevice(response.data.data)
      } else {
        message.error('设备未找到')
        navigate('/assets')
      }
    } catch (error) {
      message.error('获取设备详情失败')
      navigate('/assets')
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    setQRLoading(true)
    try {
      const response = await request.get(`/devices/${id}/qrcode`)
      if (response.data.code === 200) {
        setQRData(response.data.data)
        message.success('二维码已生成')
      } else {
        message.error('生成二维码失败')
      }
    } catch (error) {
      message.error('生成二维码失败')
    } finally {
      setQRLoading(false)
    }
  }

  const printQRCode = () => {
    if (!qrData) return
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>设备二维码 - ${device?.sn}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
              .qr-container { border: 1px solid #ddd; padding: 20px; display: inline-block; }
              .sn { font-size: 24px; margin-top: 10px; font-weight: bold; }
              .name { font-size: 16px; color: #666; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <img src="${qrData.qr_url}" alt="二维码" />
              <div class="sn">${device?.sn}</div>
              <div class="name">${device?.name}</div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!device) {
    return null
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/assets')}
        style={{ marginBottom: 16 }}
      >
        Back to List
      </Button>

      <Card title="设备详情">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="序列号">{device.sn}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusColors[device.status] || 'default'}>
              {device.status || 'UNKNOWN'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="名称">{device.name}</Descriptions.Item>
          <Descriptions.Item label="品牌">{device.brand}</Descriptions.Item>
          <Descriptions.Item label="型号">{device.model || '-'}</Descriptions.Item>
          <Descriptions.Item label="站点">{device.site_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(device.created_at).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="维保记录"
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Button
              icon={<QrcodeOutlined />}
              onClick={generateQRCode}
              loading={qrLoading}
            >
              Generate QR
            </Button>
            {qrData && (
              <Button
                icon={<PrinterOutlined />}
                onClick={printQRCode}
              >
                Print QR
              </Button>
            )}
          </Space>
        }
      >
        {qrData && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <QRCode value={qrData.qr_url} size={200} />
            <div style={{ marginTop: 8 }}>
              <strong>{device.sn}</strong>
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              有效期至： {new Date(qrData.expires_at).toLocaleDateString()}
            </div>
          </div>
        )}

        <Timeline
          items={[
            {
              color: '#C49A3C',
              children: '设备登记',
            },
          ]}
        />
      </Card>
    </div>
  )
}
