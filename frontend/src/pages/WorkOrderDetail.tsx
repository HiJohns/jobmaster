import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button, Modal, TextArea, SpinLoading, Toast, Input } from 'antd-mobile'
import { api } from '../api/factory'
import type { WorkOrderDetail } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'
import { getStatusConfig, canPerformAction, WorkOrderStatus } from '../config/status'
import { StepFlow } from '../components/StepFlow'
import { theme } from '../styles/theme'
import ImpersonationWarning from '../components/ImpersonationWarning'
import ReservationNegotiation from '../components/ReservationNegotiation'

interface QuotationItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

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
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([])
  const [quotationSubmitted, setQuotationSubmitted] = useState(false)

  const fetchOrderDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await api.workorder.get(id) as any
      if (response.code === 200) {
        setOrder(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch order detail:', error)
      Toast.show('获取工单详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetail()
  }, [id])

  // Pre-fill dummy quotation data for demo work orders
  useEffect(() => {
    if (order?.id === 'jm-wo-vendor-finished') {
      setQuotationItems([
        { id: 'demo-v1', name: '灭火器更换', unitPrice: 120, quantity: 5 },
        { id: 'demo-v2', name: '压力测试服务', unitPrice: 80, quantity: 1 },
      ])
      setQuotationSubmitted(false)
    } else if (order?.id === 'jm-wo-contractor-finished1') {
      setQuotationItems([
        { id: 'demo-c1', name: '空调加氟', unitPrice: 300, quantity: 1 },
        { id: 'demo-c2', name: '检修人工费', unitPrice: 200, quantity: 1 },
        { id: 'demo-c3', name: '配件更换', unitPrice: 150, quantity: 1 },
      ])
      setQuotationSubmitted(true)
    }
  }, [order?.id])

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
      const response = await api.workorder.reserve(id, new Date(reserveTime).toISOString()) as any
      if (response.code === 200) {
        Toast.show('预约成功')
        setReserveModalVisible(false)
        fetchOrderDetail()
      }
    } catch (error) {
      console.error('Reserve failed:', error)
      Toast.show('预约失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleArrive = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const position = await getCurrentPosition()
      const response = await api.workorder.arrive(id, position.latitude, position.longitude) as any
      if (response.code === 200) {
        Toast.show('签到成功')
        fetchOrderDetail()
      }
    } catch (error) {
      console.error('Arrive failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!id || !finishDescription) return
    setActionLoading(true)
    try {
      const response = await api.workorder.finish(
        id,
        finishDescription,
        [],
        order?.labor_fee || 0,
        order?.material_fee || 0,
        order?.other_fee || 0
      ) as any
      if (response.code === 200) {
        Toast.show('完工提交成功')
        setFinishModalVisible(false)
        fetchOrderDetail()
      }
    } catch (error) {
      console.error('Finish failed:', error)
      Toast.show('完工提交失败')
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

  const canQuote = order?.status === 'FINISHED' && (
    userInfo?.role === 'CONTRACTOR_EMPLOYEE' || userInfo?.role === 'VENDOR_EMPLOYEE'
  )

  const handleAddQuotationItem = () => {
    setQuotationItems(prev => [...prev, {
      id: `qi-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      unitPrice: 0,
      quantity: 1,
    }])
  }

  const handleRemoveQuotationItem = (itemId: string) => {
    setQuotationItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleUpdateQuotationItem = (itemId: string, field: keyof QuotationItem, value: string | number) => {
    setQuotationItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmitQuotation = () => {
    if (quotationItems.length === 0 || quotationItems.some(i => !i.name)) {
      Toast.show('请填写完整的报价项目')
      return
    }
    setQuotationSubmitted(true)
    Toast.show({ content: '报价提交成功', icon: 'success' })
  }

  const quotationTotal = quotationItems.reduce((sum, item) =>
    sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0
  )

  const getActionButtons = () => {
    if (!order || isImpersonated) return null

    const buttons: React.ReactNode[] = []
    
    // The line below was removed as its return value was not being used.
    // getAvailableActions(order.status)
    
    if (canPerformAction(order.status, 'reserve')) {
      buttons.push(
        <Button key="reserve" onClick={() => setReserveModalVisible(true)} loading={actionLoading} style={isImpersonated ? {
          border: '2px dashed #8B5CF6',
          background: 'transparent',
          color: '#8B5CF6'
        } : {}}>
          预约进场
        </Button>
      )
    }
    
    if (canPerformAction(order.status, 'arrive')) {
      buttons.push(
        <Button key="arrive" onClick={handleArrive} loading={actionLoading} color="success" style={isImpersonated ? {
          border: '2px dashed #8B5CF6',
          background: 'transparent',
          color: '#8B5CF6'
        } : {}}>
          到场签到
        </Button>
      )
    }
    
    if (canPerformAction(order.status, 'finish')) {
      buttons.push(
        <Button key="finish" onClick={() => setFinishModalVisible(true)} loading={actionLoading} color="primary" style={isImpersonated ? {
          border: '2px dashed #8B5CF6',
          background: 'transparent',
          color: '#8B5CF6'
        } : {}}>
          完工提交
        </Button>
      )
    }
    
    return buttons
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 40 }}>
        <SpinLoading style={{ "--size": "32px" } as React.CSSProperties} />
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
      <ImpersonationWarning />
      <StepFlow currentStatus={order.status} />
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>{order.order_no}</span>
          <div style={{
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: `${getStatusColor(order.status)}15`,
            color: getStatusColor(order.status),
            border: `1px solid ${getStatusColor(order.status)}40`,
            fontWeight: 500,
          }}>
            {getStatusText(order.status)}
          </div>
        </div>

        {order.category_path && (
          <span style={{ display: 'block', marginBottom: 8 }}>分类: {Array.isArray(order.category_path) ? order.category_path.join(' > ') : order.category_path}</span>
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
            <span style={{ color: theme.fontSize.caption ? '#6B7280' : '#666' }}>费用合计: </span>
            <span style={{ fontWeight: 'bold' }}>CNY {totalFee.toFixed(2)}</span>
          </div>
        )}

        {order.is_urgent && (
          <div style={{
            marginTop: 8,
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: '#ff4d4f15',
            color: '#ff4d4f',
            border: '1px solid #ff4d4f40',
            fontWeight: 500,
          }}>
            加急
          </div>
        )}
      </Card>

       <ReservationNegotiation workOrderId={order.id} />

      {canQuote && (
        <Card title={quotationSubmitted ? "报价明细" : "填写报价"} style={{ marginBottom: 12 }}>
          {quotationSubmitted ? (
            <div>
              {quotationItems.map((item, idx) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: idx < quotationItems.length - 1 ? '1px solid #f0f0f0' : 'none'
                }}>
                  <span>{item.name}</span>
                  <span style={{ color: '#666' }}>
                    ¥{item.unitPrice} × {item.quantity} = ¥{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
              <div style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '2px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: 16
              }}>
                <span>总价</span>
                <span style={{ color: '#2563EB' }}>¥{quotationTotal.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div>
              {quotationItems.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                  padding: '8px',
                  background: '#f9fafb',
                  borderRadius: 8
                }}>
                  <Input
                    placeholder="项目名称"
                    value={item.name}
                    onChange={(val) => handleUpdateQuotationItem(item.id, 'name', val)}
                    style={{ flex: 2 }}
                  />
                  <Input
                    placeholder="单价"
                    type="number"
                    value={String(item.unitPrice)}
                    onChange={(val) => handleUpdateQuotationItem(item.id, 'unitPrice', Number(val) || 0)}
                    style={{ flex: 1 }}
                  />
                  <Input
                    placeholder="数量"
                    type="number"
                    value={String(item.quantity)}
                    onChange={(val) => handleUpdateQuotationItem(item.id, 'quantity', Number(val) || 0)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: 80, textAlign: 'right', color: '#666' }}>
                    ¥{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}
                  </span>
                  <Button
                    size="small"
                    color="danger"
                    onClick={() => handleRemoveQuotationItem(item.id)}
                  >
                    删除
                  </Button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Button size="small" onClick={handleAddQuotationItem}>
                  + 添加项目
                </Button>
                <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                  总价: <span style={{ color: '#2563EB' }}>¥{quotationTotal.toFixed(2)}</span>
                </span>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                <Button color="primary" onClick={handleSubmitQuotation} disabled={quotationItems.length === 0}>
                  提交报价单
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

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
