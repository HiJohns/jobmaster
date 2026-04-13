import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Toast, NavBar, Steps, Loading } from 'antd-mobile'
import { LeftOutline } from 'antd-mobile-icons'

interface WorkOrder {
  id: string
  order_no: string
  status: string
  store_name: string
  address_detail: string
  category_path: string
  brand_name: string
  description: string
  engineer_name?: string
  created_at: string
}

interface StatusStep {
  status: string
  title: string
  description: string
  action: string
}

const STATUS_STEPS: StatusStep[] = [
  { status: 'DISPATCHED', title: '接单', description: '点击接单', action: 'accept' },
  { status: 'ACCEPTED', title: '预约', description: '选择预约时间', action: 'reserve' },
  { status: 'RESERVED', title: '到场', description: '扫码确认到场', action: 'arrive' },
  { status: 'ARRIVED', title: '施工', description: '开始施工', action: 'work' },
  { status: 'WORKING', title: '离场', description: '确认离场', action: 'finish' },
]

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待处理', color: '#999999' },
  DISPATCHED: { text: '已分配', color: '#0033FF' },
  ACCEPTED: { text: '已接单', color: '#00B578' },
  RESERVED: { text: '已预约', color: '#FF8F1F' },
  ARRIVED: { text: '已到场', color: '#8B5CF6' },
  WORKING: { text: '施工中', color: '#6366F1' },
  FINISHED: { text: '已完成', color: '#10B981' },
  OBSERVING: { text: '观察期', color: '#EAB308' },
  CLOSED: { text: '已关闭', color: '#1F2937' },
}

/**
 * WorkOrderDetailPage - 工单详情页
 * 功能：展示工单详情、Step Flow、状态时间轴、扫码功能
 * 路由：/wechat/orders/:id
 */
export default function WorkOrderDetailPage() {
  const { id: orderId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  if (!orderId) {
    Toast.show('无效的工单ID')
    navigate(-1)
    return null
  }

  /**
   * 模拟获取工单数据
   */
  useEffect(() => {
    const fetchWorkOrder = async () => {
      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const mockWorkOrder: WorkOrder = {
          id: orderId,
          order_no: `WO-20240413-001`,
          status: 'DISPATCHED',
          store_name: 'Store 001',
          address_detail: '123 Main St, City',
          category_path: '内装/卖场/消防门',
          brand_name: 'Apple',
          description: '设备故障，需要维修',
          engineer_name: '工程师A',
          created_at: new Date().toISOString()
        }
        
        setWorkOrder(mockWorkOrder)
        
        // 根据状态设置当前步骤
        const stepIndex = STATUS_STEPS.findIndex(step => step.status === mockWorkOrder.status)
        if (stepIndex !== -1) {
          setCurrentStepIndex(stepIndex)
        }
      } catch (error) {
        Toast.show({
          content: '获取工单详情失败',
          icon: 'fail',
          duration: 2000
        })
      } finally {
        setLoading(false)
      }
    }

    fetchWorkOrder()
  }, [orderId])

  /**
   * 处理 Step Flow 按钮点击
   */
  const handleStepAction = async () => {
    if (!workOrder || currentStepIndex >= STATUS_STEPS.length) return

    try {
      Toast.show({
        content: '正在处理...',
        icon: 'loading',
        duration: 0
      })

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000))

      Toast.clear()
      
      Toast.show({
        content: '操作成功',
        icon: 'success',
        duration: 1500
      })

      // 更新工单状态（模拟）
      const nextStepIndex = currentStepIndex + 1
      if (nextStepIndex < STATUS_STEPS.length) {
        const nextStatus = STATUS_STEPS[nextStepIndex].status
        setWorkOrder(prev => prev ? { ...prev, status: nextStatus } : prev)
        setCurrentStepIndex(nextStepIndex)
      }
      
    } catch (error) {
      Toast.clear()
      Toast.show({
        content: '操作失败',
        icon: 'fail',
        duration: 2000
      })
    }
  }

  /**
   * 处理返回
   */
  const handleBack = () => {
    navigate(-1)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loading color="#0033FF" />
      </div>
    )
  }

  if (!workOrder) {
    return null
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* 导航栏 */}
      <NavBar
        backArrow={<LeftOutline />}
        onBack={handleBack}
        style={{ background: '#fff' }}
      >
        工单详情
      </NavBar>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* 工单基本信息 */}
        <Card title="工单信息" style={{ marginBottom: '16px' }}>
          <div style={{ lineHeight: 1.8 }}>
            <div><strong>工单号：</strong>{workOrder.order_no}</div>
            <div><strong>状态：</strong>
              <span style={{ color: STATUS_CONFIG[workOrder.status].color, fontWeight: 500 }}>
                {STATUS_CONFIG[workOrder.status].text}
              </span>
            </div>
            <div><strong>网点：</strong>{workOrder.store_name}</div>
            <div><strong>地址：</strong>{workOrder.address_detail}</div>
            <div><strong>分类：</strong>{workOrder.category_path}</div>
            <div><strong>品牌：</strong>{workOrder.brand_name}</div>
            <div><strong>描述：</strong>{workOrder.description}</div>
            <div><strong>工程师：</strong>{workOrder.engineer_name || '未分配'}</div>
          </div>
        </Card>

        {/* Step Flow - 当前步骤大按钮 */}
        <Card title="操作步骤" style={{ marginBottom: '16px' }}>
          {currentStepIndex < STATUS_STEPS.length && (
            <Button
              block
              size="large"
              style={{
                '--background-color': '#0033FF',
                '--border-radius': '12px',
                height: '60px',
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '16px'
              }}
              onClick={handleStepAction}
            >
              {STATUS_STEPS[currentStepIndex].title}
              <div style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '4px' }}>
                {STATUS_STEPS[currentStepIndex].description}
              </div>
            </Button>
          )}

          {/* 状态时间轴 */}
          <Steps current={currentStepIndex} direction="vertical">
            {STATUS_STEPS.map((step, index) => (
              <Steps.Step
                key={step.status}
                title={step.title}
                status={index < currentStepIndex ? 'finish' : index === currentStepIndex ? 'process' : 'wait'}
              />
            ))}
          </Steps>
        </Card>

        {/* 施工记录入口 */}
        {workOrder.status === 'WORKING' && (
          <Button
            block
            style={{
              '--background-color': '#00B578',
              '--border-radius': '8px',
              height: '48px',
              fontSize: '16px'
            }}
            onClick={() => navigate(`/wechat/orders/${orderId}/record`)}
          >
            施工记录
          </Button>
        )}
      </div>
    </div>
  )
}
