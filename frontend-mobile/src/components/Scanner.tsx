import { useState, useEffect, useRef } from 'react'

interface ScannerProps {
  onScan: (sn: string) => void
  loading?: boolean
}

const DEMO_DEVICES = [
  { sn: 'AC-001-2024', name: '空调-格力' },
  { sn: 'AC-002-2024', name: '空调-美的' },
  { sn: 'ELEC-001-2024', name: '配电箱-施耐德' },
]

declare global {
  interface Window {
    Html5Qrcode: any
  }
}

export default function Scanner({ onScan, loading = false }: ScannerProps) {
  const [inputSN, setInputSN] = useState('')
  const [cameraSupported, setCameraSupported] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrcodeRef = useRef<any>(null)

  useEffect(() => {
    setCameraSupported('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)

      if (!window.Html5Qrcode) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
        script.onload = () => initScanner()
        document.head.appendChild(script)
      } else {
        initScanner()
      }
    } catch (err) {
      setError('Failed to start camera')
      setIsScanning(false)
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
        (decodedText: string) => {
          onScan(decodedText)
          stopCamera()
        },
        () => {}
      )
    } catch (err) {
      setError('Camera access denied or not available')
      setIsScanning(false)
    }
  }

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop()
        html5QrcodeRef.current = null
      } catch (err) {
        console.error('Error stopping camera:', err)
      }
    }
    setIsScanning(false)
  }

  const handleManualInput = () => {
    if (inputSN.trim()) {
      onScan(inputSN.trim())
      setInputSN('')
    }
  }

  const handleSimulateScan = () => {
    const randomDevice = DEMO_DEVICES[Math.floor(Math.random() * DEMO_DEVICES.length)]
    onScan(randomDevice.sn)
  }

  return (
    <div>
      {error && (
        <div style={{ color: 'red', marginBottom: 8, fontSize: 14 }}>{error}</div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="输入设备SN码"
          value={inputSN}
          onChange={(e) => setInputSN(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px',
          }}
        />
      </div>

      <button
        onClick={handleManualInput}
        disabled={loading || !inputSN.trim()}
        style={{
          width: '100%',
          padding: '12px',
          background: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          marginBottom: 12,
        }}
      >
        {loading ? '查询中...' : '查询设备'}
      </button>

      {cameraSupported && (
        <>
          <button
            onClick={isScanning ? stopCamera : startCamera}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: isScanning ? '#ff4d4f' : '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: 12,
            }}
          >
            {isScanning ? '停止扫描' : '相机扫码'}
          </button>

          {isScanning && (
            <div
              id="qr-reader"
              ref={scannerRef}
              style={{ width: '100%', marginBottom: 12 }}
            />
          )}
        </>
      )}

      <button
        onClick={handleSimulateScan}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: '#faad14',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
        }}
      >
        模拟扫码
      </button>
    </div>
  )
}
