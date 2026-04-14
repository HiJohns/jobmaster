import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loading, Toast } from 'antd-mobile'
import { api } from '../api/factory'

declare global {
  interface Window {
    Html5Qrcode: any
  }
}

/**
 * QRScanHandlerPage - 扫码进场处理器
 * 功能：扫描工单二维码后自动触发 ARRIVE 并跳转到施工记录页
 */
export default function QRScanHandlerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrcodeRef = useRef<any>(null)

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [])

  const startScanner = async () => {
    try {
      // Load html5-qrcode library if not already loaded
      if (!window.Html5Qrcode) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
        script.onload = () => initScanner()
        script.onerror = () => handleError('Failed to load scanner')
        document.head.appendChild(script)
      } else {
        initScanner()
      }
    } catch (error) {
      handleError('Failed to start scanner')
    } finally {
      setLoading(false)
    }
  }

  const initScanner = async () => {
    try {
      const html5Qrcode = new window.Html5Qrcode('qr-reader')
      html5QrcodeRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          handleScan(decodedText)
        },
        () => {}
      )
      setScanning(true)
    } catch (err) {
      handleError('Camera access denied or not available')
    }
  }

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop()
        html5QrcodeRef.current = null
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setScanning(false)
  }

  const handleScan = async (qrData: string) => {
    try {
      stopScanner()
      
      // Parse QR code data (should contain order_id)
      const parsedData = JSON.parse(qrData)
      const orderId = parsedData.order_id
      
      if (!orderId) {
        throw new Error('Invalid QR code format')
      }

      // Directly trigger ARRIVE API
      Toast.show({
        content: '正在确认到场...',
        icon: 'loading',
        duration: 0
      })

      // Get current position
      const position = await getCurrentPosition()
      
      // Call ARRIVE API
      const response = await api.workorder.arrive(orderId, position.latitude, position.longitude) as any
      
      Toast.clear()
      
      if (response.code === 200) {
        // Direct navigation to construction record page (no confirmation)
        Toast.show({
          content: '到场确认成功',
          icon: 'success',
          duration: 1500
        })
        
        // Navigate to work record page
        setTimeout(() => {
          navigate(`/wechat/orders/${orderId}/record`)
        }, 500)
      } else {
        throw new Error(response.message || '到场确认失败')
      }
      
    } catch (error) {
      Toast.clear()
      
      if (error instanceof Error) {
        Toast.show({
          content: error.message || '扫码失败',
          icon: 'fail',
        })
      }
      
      // Restart scanner for retry
      startScanner()
    }
  }

  const handleError = (message: string) => {
    Toast.show({
      content: message,
      icon: 'fail',
    })
    setTimeout(() => {
      navigate(-1)
    }, 2000)
  }

  const getCurrentPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loading color="#0033FF" />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ color: '#fff', padding: '16px', textAlign: 'center' }}>
        <h2>扫码进场</h2>
        <p>请扫描工单上的二维码</p>
      </div>
      
      <div id="qr-reader" style={{ flex: 1 }}></div>
      
      <div style={{ padding: '16px', background: 'rgba(0,0,0,0.8)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
          }}
        >
          取消
        </button>
      </div>
    </div>
  )
}
