import { Device } from '../types/device'

interface DeviceInfoCardProps {
  device: Device | null
  loading: boolean
  error?: string
}

export default function DeviceInfoCard({ device, loading, error }: DeviceInfoCardProps) {
  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        查询中...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        {error}
      </div>
    )
  }

  if (!device) {
    return null
  }

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      background: '#f5f5f5',
    }}>
      <h3 style={{ margin: '0 0 12px 0' }}>{device.name}</h3>
      <div style={{ fontSize: '14px', marginBottom: '8px' }}>
        <strong>SN码:</strong> {device.sn}
      </div>
      <div style={{ fontSize: '14px', marginBottom: '8px' }}>
        <strong>型号:</strong> {device.model || '-'}
      </div>
      <div style={{ fontSize: '14px', marginBottom: '8px' }}>
        <strong>品牌:</strong> {device.brand || '-'}
      </div>
      <div style={{ fontSize: '14px' }}>
        <strong>所属网点:</strong> {device.site_name || '未知'}
      </div>
    </div>
  )
}
