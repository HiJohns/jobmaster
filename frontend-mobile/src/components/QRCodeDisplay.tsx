import { useEffect, useState } from 'react'
import { Loading } from 'antd-mobile'

interface QRCodeDisplayProps {
  workOrderId: string
  size?: number
}

/**
 * QRCodeDisplay - 二维码显示组件
 * 功能：生成并显示工单二维码，用于扫码进场/离场
 */
export default function QRCodeDisplay({ workOrderId, size = 200 }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateQRCode()
  }, [workOrderId])

  const generateQRCode = async () => {
    try {
      setLoading(true)
      // 使用 Google Chart API 生成二维码
      const qrData = JSON.stringify({
        order_id: workOrderId,
        timestamp: Date.now(),
        type: 'workorder_checkin',
      })
      
      const qrUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(qrData)}`
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: size }}>
        <Loading color="#B61C22" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
      <img 
        src={qrCodeUrl} 
        alt="工单二维码" 
        style={{ width: size, height: size, border: '1px solid #f0f0f0' }}
      />
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        扫码进行到场/离场确认
      </div>
    </div>
  )
}
