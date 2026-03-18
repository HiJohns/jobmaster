import { useState } from 'react'
import Scanner from '../components/Scanner'
import DeviceInfoCard from '../components/DeviceInfoCard'
import { Device } from '../types/device'

export default function MobileRepairPage() {
  const [device, setDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  const handleScan = async (sn: string) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/v1/devices/sn/${sn}`)
      const result = await response.json()
      
      if (result.code === 200) {
        setDevice(result.data)
        setError('')
      } else {
        setError('设备未找到')
        setDevice(null)
      }
    } catch (err) {
      setError('查询失败，请重试')
      setDevice(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!device || !description.trim()) {
      alert('请填写故障描述')
      return
    }

    try {
      const response = await fetch('/api/v1/workorders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: device.id,
          description: description,
          photo_urls: photos,
          equipment_info: `${device.brand} ${device.name} (SN: ${device.sn})`,
          brand_name: device.brand,
        }),
      })
      
      const result = await response.json()
      
      if (result.code === 200 || result.code === 201) {
        alert('报修成功！工单已创建')
        setDevice(null)
        setDescription('')
        setPhotos([])
      } else {
        alert('报修失败：' + result.message)
      }
    } catch (err) {
      alert('报修失败，请重试')
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Simplified photo upload simulation
    const files = e.target.files
    if (files) {
      const newPhotos = Array.from(files).slice(0, 3).map(() => `https://example.com/photo-${Date.now()}.jpg`)
      setPhotos([...photos, ...newPhotos])
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>扫码报修</h1>
      
      <Scanner onScan={handleScan} loading={loading} />
      
      <DeviceInfoCard device={device} loading={loading} error={error} />
      
      {device && (
        <div style={{ marginTop: '30px' }}>
          <h3>故障描述</h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请描述故障现象..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '20px',
            }}
          />
          
          <h3>上传照片（最多3张）</h3>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            style={{ marginBottom: '20px' }}
          />
          
          {photos.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              {photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`故障照片${index + 1}`}
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    marginRight: '10px',
                    borderRadius: '8px',
                  }}
                />
              ))}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={!description.trim()}
            style={{
              width: '100%',
              padding: '16px',
              background: description.trim() ? '#1890ff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            提交报修
          </button>
        </div>
      )}
    </div>
  )
}
