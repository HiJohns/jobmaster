import { useState, useEffect, useCallback } from 'react'
import { Card, Toast } from 'antd-mobile'
import { SearchOutlined } from '@ant-design/icons'
import StatusFilter from '../components/StatusFilter'
import RepairingDeviceList from '../components/RepairingDeviceList'
import DispatchDialog from '../components/DispatchDialog'
import { deviceApi, Device } from '../api/device'

function AssetMonitor() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dispatchVisible, setDispatchVisible] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const params: { status?: string } = {}
      if (statusFilter) {
        params.status = statusFilter
      }
      const response = await deviceApi.list(params)
      if (response.code === 200) {
        setDevices(response.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      Toast.show({ content: '获取设备列表失败' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const handleDispatch = (device: Device) => {
    setSelectedDevice(device)
    setDispatchVisible(true)
  }

  const handleDispatchSuccess = async () => {
    setDispatchVisible(false)
    setSelectedDevice(null)

    if (selectedDevice) {
      try {
        const response = await deviceApi.update(selectedDevice.id, {
          status: 'ACTIVE',
        })
        if (response.code === 200) {
          Toast.show({ content: '设备已恢复正常状态' })
        }
      } catch (error) {
        console.error('Failed to update device status:', error)
      }
    }

    fetchDevices()
  }

  const getDeviceInfo = () => {
    if (!selectedDevice) return null
    const info = selectedDevice.info as {
      work_order_id?: string
      work_order_no?: string
    } | undefined
    return {
      id: info?.work_order_id || '',
      order_no: info?.work_order_no || selectedDevice.sn,
      store_name: '',
      category_path: [],
    }
  }

  const getCounts = () => {
    const counts: Record<string, number> = {}
    devices.forEach((device) => {
      counts[device.status] = (counts[device.status] || 0) + 1
    })
    return counts
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            <SearchOutlined style={{ marginRight: 8 }} />
            资产监控
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: 14 }}>
            监控设备状态，快速响应报修请求
          </p>
        </div>

        <StatusFilter
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
          counts={getCounts()}
        />
      </Card>

      <Card style={{ flex: 1, marginTop: 16 }}>
        <RepairingDeviceList
          devices={devices}
          loading={loading}
          onDispatch={handleDispatch}
        />
      </Card>

      <DispatchDialog
        visible={dispatchVisible}
        onCancel={() => {
          setDispatchVisible(false)
          setSelectedDevice(null)
        }}
        onSuccess={handleDispatchSuccess}
        workOrder={getDeviceInfo()}
      />
    </div>
  )
}

export default AssetMonitor
