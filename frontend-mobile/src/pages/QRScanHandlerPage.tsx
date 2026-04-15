import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loading, Toast } from 'antd-mobile'
import { localWorkorderApi } from '../api/local/workorder'

declare global {
  interface Window {
    Html5Qrcode: any
  }
}

/**
 * QRScanHandlerPage - 扫码进场处理器
 * 功能：扫描工单二维码后自动触发 ARRIVE 并跳转到施工记录页
 * Issue: #127 - 扫码交互优化
 */
export default function QRScanHandlerPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const html5QrcodeRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true
    
    const init = async () => {
      if (isMounted) {
        await startScanner()
      }
    }
    init()
    
    return () => {
      isMounted = false
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    try {
      // Load html5-qrcode library if not already loaded
      if (!window.Html5Qrcode) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
        script.onload = () => {
          initScanner()
        }
        script.onerror = () => {
          handleError('加载扫码库失败')
        }
        document.head.appendChild(script)
      } else {
        initScanner()
      }
    } catch (error) {
      handleError('启动扫码失败')
    } finally {
      setLoading(false)
    }
  }

  const initScanner = async () => {
    try {
      if (!window.Html5Qrcode) {
        handleError('扫码库未加载')
        return
      }
      
      const html5Qrcode = new window.Html5Qrcode('qr-reader')
      html5QrcodeRef.current = html5Qrcode
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } }
      
      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          // Success callback - stop scanner and process
          handleScan(decodedText)
        },
        (errorMessage: string) => {
          // Error callback - ignore for now
          console.debug('Scan error:', errorMessage)
        }
      )
    } catch (error) {
      handleError('初始化扫码失败')
    }
  }

  const handleScan = async (qrData: string) => {
    try {
      stopScanner()
      
      // Parse QR code data (should contain order_id)
      const parsedData = JSON.parse(qrData)
      const orderId = parsedData.order_id
      
      if (!orderId) {
        throw new Error('二维码格式错误')
      }

      // Directly trigger ARRIVE API (no confirmation dialog)
      Toast.show({
        content: '正在确认到场...',
        icon: 'loading',
        duration: 0
      })

      // Get current position
      const position = await getCurrentPosition()
      
      // Call ARRIVE API
      const response = await localWorkorderApi.arrive(orderId, position.latitude, position.longitude) as any
      
      Toast.clear()
      
      if (response.code === 200) {
        // Direct navigation to construction record page (no confirmation dialog)
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
      const message = error instanceof Error ? error.message : '扫码失败'
      Toast.show({
        content: `扫码失败: ${message}`,
        icon: 'fail'
      })
      // Restart scanner after error
      setTimeout(() => {
        startScanner()
      }, 2000)
    }
  }

  const stopScanner = () => {
    try {
      const scanner = html5QrcodeRef.current
      if (scanner && typeof scanner.stop === 'function') {
        scanner.stop()
      }
    } catch (error) {
      console.error('停止扫码失败:', error)
    }
    html5QrcodeRef.current = null
  }

  const getCurrentPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        // Use default position if geolocation not available
        resolve({ latitude: 39.9042, longitude: 116.4074 })
        return
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.warn('定位失败:', error)
          // Use default position on error
          resolve({ latitude: 39.9042, longitude: 116.4074 })
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    })
  }

  const handleError = (message: string) => {
    Toast.show({
      content: `错误: ${message}`,
      icon: 'fail'
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Loading color="#0033FF" />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#000' }}>
      <div style={{ padding: '20px', background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid #333' }}>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>扫码进场</h2>
        <p style={{ color: '#ccc', fontSize: 14 }}>请扫描工单上的二维码</p>
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
            cursor: 'pointer'
          }}
        >
          取消
        </button>
      </div>
    </div>
  )
}
