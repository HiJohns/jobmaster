import { useState } from 'react'

interface ScannerProps {
  onScan: (sn: string) => void
  loading?: boolean
}

const DEMO_DEVICES = [
  { sn: 'AC-001-2024', name: '空调-格力' },
  { sn: 'AC-002-2024', name: '空调-美的' },
  { sn: 'ELEC-001-2024', name: '配电箱-施耐德' },
]

export default function Scanner({ onScan, loading = false }: ScannerProps) {
  const [inputSN, setInputSN] = useState('')

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
      <button
        onClick={handleSimulateScan}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: '#52c41a',
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
