import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Tag, Button, Modal, TextArea, SpinLoading, Toast } from 'antd-mobile'
import dayjs from 'dayjs'
import { workorderApi } from '../api/workorder'
import type { WorkOrderDetail } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'
import { getStatusConfig, canPerformAction, getAvailableActions, WorkOrderStatus } from '../config/status'

function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>()
    const { userInfo, isImpersonated } = useAuthStore()
  const [order, setOrder] = useState<WorkOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [reserveModalVisible, setReserveModalVisible] = useState(false)
  const [reserveTime, setReserveTime] = useState('')
  const [finishModalVisible, setFinishModalVisible] = useState(false)
  const [finishDescription, setFinishDescription] = useState('')

  const fetchOrderDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await workorderApi.get(id)
      if (response.code === 200) {
        setOrder(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch order detail:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetail()
  }, [id])

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
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }

  const handleReserve = async () => {
    if (!id || !reserveTime) return
    setActionLoading(true)
    try {
      const response = await workorderApi.reserve(id, new Date(reserveTime).toISOString())
      if (response.code === 200) {
        Toast.show('预约成功')
        setReserveModalVisible(false)
        fetchOrderDetail()
      }
    } catch (error) {
      console.error('Reserve failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleArrive = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const position = await getCurrentPosition()
      const response = await workorderApi.arrive(id, position.latitude, position.longitude)
      if (response.code === 200) {
        Toast.show('签到成功')
        fetchOrderDetail()
      }
    } catch (error) {
      Toast.show('获取定位失败，请检查权限')
      console.error('Arrive failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!id || !finishDescription) return
    setActionLoading(true)
    try {
      const response = await workorderApi.finish(
        id,
        finishDescription,
        [],
        order?.labor_fee || 0,
        order?.material_fee || 0,
        order?.other_fee || 0
      )
      if (response.code === 200) {
        Toast.show('完工提交成功')
        setFinishModalVisible(false)
        fetchOrderDetail()
      }
    } catch (error) {
      console.error('Finish failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    return getStatusConfig(status as WorkOrderStatus).text
  }
  
  const getStatusColor = (status: string) => {
    return getStatusConfig(status as WorkOrderStatus).color
  }

  const getActionButtons = () => {
    if (!order || isImpersonated) return null

    getAvailableActions(order.status)
    const buttons: React.ReactNode[] = []
    
    if (canPerformAction(order.status, 'reserve')) {
      buttons.push(
        <Button key="reserve" onClick={() => setReserveModalVisible(true)} loading={actionLoading}>
          预约进场
        </Button>
      )
    }
    
    if (canPerformAction(order.status, 'arrive')) {
      buttons.push(
        <Button key="arrive" onClick={handleArrive} loading={actionLoading} color="success">
          到场签到
        </Button>
      )
    }
    
    if (canPerformAction(order.status, 'finish')) {
      buttons.push(
        <Button key="finish" onClick={() => setFinishModalVisible(true)} loading={actionLoading} color="primary">
          完工提交
        </Button>
      )
    }
    
    return buttons
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 40 }}>
        <SpinLoading style={{ "--size": "32px" } as any} />
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 40 }}>
        <span>工单不存在</span>
      </div>
    )
  }

  const totalFee = (order.labor_fee || 0) + (order.material_fee || 0) + (order.other_fee || 0)

  return (
    <div style={{ padding: 12, paddingBottom: 80 }}>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>{order.order_no}</span>
          <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
        </div>

        {order.category_path && (
          <span style={{ display: 'block', marginBottom: 8 }}>分类: {order.category_path}</span>
        )}
        {order.brand_name && (
          <span style={{ display: 'block', marginBottom: 8 }}>品牌: {order.brand_name}</span>
        )}
        {order.description && (
          <span style={{ display: 'block', marginBottom: 8 }}>故障描述: {order.description}</span>
        )}

        {order.address_detail && (
          <span style={{ display: 'block', marginBottom: 8 }}>地址: {order.address_detail}</span>
        )}

        {userInfo?.role !== 'STORE' && (
          <div style={{ display: "flex", marginTop: 12 }}>
            <span style={{ color: '#666' }}>费用合计: </span>
            <span style={{ fontWeight: 'bold' }}>CNY {totalFee.toFixed(2)}</span>
          </div>
        )}

        {order.is_urgent && <Tag color="red" style={{ marginTop: 8 }}>加急</Tag>}
      </Card>

      <Card title="时间轴" style={{ marginBottom: 12 }}>
        <div className="timeline">
          {order.logs?.map((log, index) => (
            <div className="timeline-item"
              key={index}
              
            >
              <span style={{ fontWeight: 'bold' }}>{log.action}</span>
              <br />
              <span style={{ fontSize: 12, color: '#666' }}>{log.user_name}</span>
              <br />
              <span style={{ fontSize: 12, color: '#999' }}>
                {dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}
              </span>
              {log.details && <div style={{ marginTop: 4 }}>{log.details}</div>}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        {getActionButtons()}
      </div>

      <Modal
        visible={reserveModalVisible}
        onClose={() => setReserveModalVisible(false)}
        title="预约进场时间"
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setReserveModalVisible(false) },
          { key: 'confirm', text: '确认', onClick: handleReserve },
        ]}
        content={
          <input type="datetime-local"
            value={reserveTime}
            onChange={(e: any) => setReserveTime(e.target.value)}
            placeholder="选择预约时间"
          />
        }
      />

      <Modal
        visible={finishModalVisible}
        onClose={() => setFinishModalVisible(false)}
        title="完工提交"
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setFinishModalVisible(false) },
          { key: 'confirm', text: '确认', onClick: handleFinish },
        ]}
        content={
          <TextArea
            value={finishDescription}
            onChange={setFinishDescription}
            placeholder="输入施工总结"
            rows={4}
          />
        }
      />
    </div>
  )
}

export default WorkOrderDetail
