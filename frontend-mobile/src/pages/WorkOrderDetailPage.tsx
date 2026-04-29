import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Toast, NavBar, Steps, Loading, Radio, Selector } from 'antd-mobile'
import { LeftOutline } from 'antd-mobile-icons'
import { demoApi } from '../api/demo'
import { localReservationApi } from '../api/local/reservation'
import { useAuthStore } from '../store/useAuthStore'
import { storage } from '../api/local/storage'
import { STORAGE_KEYS, Organization } from '../api/local/mockData'
import WorkOrderRecords from '../components/WorkOrderRecords'
import QRCodeDisplay from '../components/QRCodeDisplay'

interface WorkOrder {
  id: string
  order_no: string
  title: string
  status: string
  store_name: string
  address_detail: string
  category_path: string[]
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

interface EngineerOption {
  id: string
  name: string
  username: string
}

const STATUS_STEPS: StatusStep[] = [
  { status: 'DISPATCHED', title: '接单', description: '点击接单', action: 'accept' },
  { status: 'ACCEPTED', title: '预约', description: '选择预约时间', action: 'reserve' },
  { status: 'RESERVED', title: '施工', description: '开始施工', action: 'work' },
  { status: 'WORKING', title: '离场', description: '确认离场', action: 'finish' },
]

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待处理', color: '#999999' },
  DISPATCHED: { text: '流转中', color: '#0033FF' },
  ACCEPTED: { text: '已接单', color: '#00B578' },
  RESERVED: { text: '已预约', color: '#FF8F1F' },
  WORKING: { text: '施工中', color: '#6366F1' },
  FINISHED: { text: '已完成', color: '#10B981' },
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
  const { userInfo } = useAuthStore()
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [dispatchType, setDispatchType] = useState<'assign' | 'distribute'>('assign')
  const [targetOrg, setTargetOrg] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [engineers, setEngineers] = useState<EngineerOption[]>([])

  if (!orderId) {
    Toast.show('无效的工单ID')
    navigate(-1)
    return null
  }

  /**
   * 获取工单数据
   */
  useEffect(() => {
    const fetchWorkOrder = async () => {
      try {
        const response = await demoApi.getWorkOrder(orderId)
        const workOrderData = response.data || response
        setWorkOrder(workOrderData)

        // 根据状态设置当前步骤
        const stepIndex = STATUS_STEPS.findIndex(step => step.status === workOrderData.status)
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
   * 加载指派/分配目标数据
   */
  useEffect(() => {
    if (!userInfo || !workOrder) return

    const role = userInfo.role || ''
    const isBranch = role === 'BRANCH_ADMIN' || role === 'EMPLOYEE'
    const isContractor = role === 'CONTRACTOR_ADMIN' || role === 'CONTRACTOR_EMPLOYEE'
    const isVendor = role === 'VENDOR_ADMIN' || role === 'VENDOR_EMPLOYEE'

    const canAssign = (isBranch && workOrder.status === 'PENDING') || ((isBranch || isContractor) && (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED'))
    const canDistribute = (isContractor || isVendor) && (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED')

    if (!canAssign && !canDistribute) return

    if (dispatchType === 'assign') {
      const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
      let filtered: Organization[] = []
      if (isBranch) {
        filtered = orgs.filter((o) => o.type === 'MAIN_CONTRACTOR')
      } else if (isContractor) {
        filtered = orgs.filter((o) => o.type === 'VENDOR' && o.parent_id === userInfo.orgId)
      }
      setOrganizations(filtered)
      setEngineers([])
    } else {
      const users = storage.get<any[]>(STORAGE_KEYS.USERS) || []
      const engList = users
        .filter((u: any) => u.role === 'ENGINEER' && u.org_id === userInfo.orgId)
        .map((u: any) => ({
          id: u.id,
          name: u.display_name || u.username,
          username: u.username,
        }))
      setEngineers(engList)
      setOrganizations([])
    }
    setTargetOrg([])
  }, [dispatchType, userInfo, workOrder])

  /**
   * 处理 Step Flow 按钮点击
   */
  const handleStepAction = async () => {
    if (!workOrder || currentStepIndex >= STATUS_STEPS.length) return

    const currentStep = STATUS_STEPS[currentStepIndex]

    try {
      Toast.show({
        content: '正在处理...',
        icon: 'loading',
        duration: 0
      })

      if (currentStep.action === 'accept') {
        const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await demoApi.acceptWorkOrder(workOrder.id, scheduledAt)
      } else if (currentStep.action === 'reserve') {
        const appointedAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        await demoApi.reserveWorkOrder(workOrder.id, appointedAt)
      } else if (currentStep.action === 'work') {
        await demoApi.arriveWorkOrder(workOrder.id, 0, 0)
      } else if (currentStep.action === 'finish') {
        await demoApi.verifyWorkOrder(workOrder.id)
      }

      Toast.clear()
      
      Toast.show({
        content: '操作成功',
        icon: 'success',
        duration: 1500
      })

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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5', paddingBottom: '80px' }}>
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
            <div><strong>工单标题：</strong>{workOrder.title || workOrder.description}</div>
            <div><strong>状态：</strong>
              <span style={{ color: STATUS_CONFIG[workOrder.status].color, fontWeight: 500 }}>
                {STATUS_CONFIG[workOrder.status].text}
              </span>
            </div>
            <div><strong>网点：</strong>{workOrder.store_name}</div>
            <div><strong>地址：</strong>{workOrder.address_detail}</div>
            <div><strong>分类：</strong>{Array.isArray(workOrder.category_path) ? workOrder.category_path.join(' > ') : workOrder.category_path}</div>
            <div><strong>描述：</strong>{workOrder.description}</div>
            <div><strong>工程师：</strong>{workOrder.engineer_name || '未分配'}</div>
          </div>
        </Card>

        {/* 二维码显示 - 仅工程师可见 */}
        {(() => {
          const canScan = ['ENGINEER'].includes(userInfo?.role || '')
          return canScan && (workOrder.status === 'DISPATCHED' || 
            workOrder.status === 'ACCEPTED' || 
            workOrder.status === 'RESERVED' || 
            workOrder.status === 'WORKING') && (
            <Card title="扫码确认" style={{ marginBottom: '16px' }}>
              <Button 
                block 
                style={{ marginBottom: '12px', height: '48px' }}
                onClick={() => navigate('/wechat/scan-arrive')}
              >
                扫码进场
              </Button>
              <QRCodeDisplay workOrderId={workOrder.id} />
            </Card>
          )
        })()}

        {/* Step Flow - 当前步骤大按钮 */}
                {/* 操作步骤 */}
        <Card title="操作步骤" style={{ marginBottom: '16px' }}>
          {/* 状态流程 - 水平显示 */}
          <Steps current={currentStepIndex} direction="horizontal" style={{ overflowX: 'auto' }}>
            {STATUS_STEPS.map((step, index) => (
              <Steps.Step 
                key={step.status} 
                title={step.title}
                status={index < currentStepIndex ? 'finish' : index === currentStepIndex ? 'process' : 'wait'}
              />
            ))}
          </Steps>
        </Card>
        
        {/* 检查是否有接单权限 (VENDOR 或 ENGINEER) */}
        {(() => {
          const role = userInfo?.role || ''
          const canAcceptOrder = ['VENDOR_ADMIN', 'VENDOR_EMPLOYEE', 'ENGINEER'].includes(role)
          return canAcceptOrder && currentStepIndex < STATUS_STEPS.length && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px',
            background: '#fff',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
          }}>
            <Button
              block
              size="large"
              style={{
                height: '48px',
                fontSize: '18px',
                fontWeight: 600,
                '--background-color': '#0033FF',
                '--border-radius': '12px',
              }}
              onClick={handleStepAction}
            >
              {STATUS_STEPS[currentStepIndex].title}
              <div style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '4px' }}>
                {STATUS_STEPS[currentStepIndex].description}
              </div>
            </Button>
          </div>
        )})()}

        {/* 指派/分配区域 - 内联选择框 */}
        {(() => {
          const role = userInfo?.role || ''
          const isBranch = role === 'BRANCH_ADMIN' || role === 'EMPLOYEE'
          const isContractor = role === 'CONTRACTOR_ADMIN' || role === 'CONTRACTOR_EMPLOYEE'
          const isVendor = role === 'VENDOR_ADMIN' || role === 'VENDOR_EMPLOYEE'

          const canAssign = (isBranch && workOrder.status === 'PENDING') || ((isBranch || isContractor) && (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED'))
          const canDistribute = (isContractor || isVendor) && (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED')

          if (!canAssign && !canDistribute) return null

          const handleDispatch = async () => {
            if (!targetOrg[0]) {
              Toast.show('请选择目标')
              return
            }
            try {
              Toast.show({ content: '处理中...', icon: 'loading', duration: 0 })
              if (dispatchType === 'assign') {
                await demoApi.dispatchWorkOrder(workOrder.id, targetOrg[0])
              } else {
                await demoApi.assignWorkOrder(workOrder.id, targetOrg[0])
              }
              Toast.clear()
              Toast.show(dispatchType === 'assign' ? '指派成功' : '分配成功')
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            } catch (error: any) {
              Toast.clear()
              Toast.show({ content: error.message || '操作失败', icon: 'fail', duration: 2000 })
            }
          }

          return (
            <Card title="工单处理" style={{ marginBottom: '16px' }}>
              {isContractor && canAssign && canDistribute && (
                <div style={{ marginBottom: '12px' }}>
                  <Radio.Group
                    value={dispatchType}
                    onChange={(val) => {
                      setDispatchType(val as 'assign' | 'distribute')
                      setTargetOrg([])
                    }}
                  >
                    <Radio value="assign" style={{ marginRight: '24px' }}>指派</Radio>
                    <Radio value="distribute">分配</Radio>
                  </Radio.Group>
                </div>
              )}

              {dispatchType === 'assign' && organizations.length > 0 && (
                <Selector
                  options={organizations.map((org) => ({
                    label: org.name,
                    value: org.id,
                    description: org.type === 'MAIN_CONTRACTOR' ? '工程公司' : '供应商',
                  }))}
                  value={targetOrg}
                  onChange={setTargetOrg}
                  columns={1}
                />
              )}

              {dispatchType === 'distribute' && engineers.length > 0 && (
                <Selector
                  options={engineers.map((eng) => ({
                    label: eng.name,
                    value: eng.id,
                    description: eng.username,
                  }))}
                  value={targetOrg}
                  onChange={setTargetOrg}
                  columns={1}
                />
              )}

              <Button
                block
                style={{
                  '--background-color': '#FF8F1F',
                  '--border-radius': '8px',
                  height: '48px',
                  fontSize: '16px',
                  marginTop: '12px',
                }}
                onClick={handleDispatch}
              >
                {dispatchType === 'assign' ? '确认指派' : '确认分配'}
              </Button>
            </Card>
          )
        })()}

        {/* 拒单查看 */}
        {workOrder.status === 'PENDING' && (workOrder as any).rejection_reason && (
          <Card title="拒单信息" style={{ marginBottom: '16px', borderColor: '#FF4D4F' }}>
            <div style={{ color: '#FF4D4F', fontSize: '14px', lineHeight: 1.6 }}>
              <div><strong>拒单理由：</strong>{(workOrder as any).rejection_reason}</div>
              {(workOrder as any).rejection_comment && (
                <div style={{ marginTop: '8px' }}><strong>详细说明：</strong>{(workOrder as any).rejection_comment}</div>
              )}
            </div>
          </Card>
        )}

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


        {/* 施工记录 */}
        {workOrder.status === 'WORKING' && (
          <WorkOrderRecords workOrderId={orderId} />
        )}
        {/* 预约日志 */}
        <Card title="预约日志" style={{ marginTop: '16px' }}>
          <ReservationLogs workOrderId={orderId} />
        </Card>
      </div>

    </div>
  )
}

/**
 * ReservationLogs - 预约日志组件
 */
function ReservationLogs({ workOrderId }: { workOrderId: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await localReservationApi.listByWorkOrder(workOrderId) as any
        setLogs(response.list || [])
      } catch (error) {
        console.error('Failed to fetch reservation logs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [workOrderId])

  if (loading) {
    return <div style={{ color: '#999', fontSize: '14px' }}>加载中...</div>
  }

  if (logs.length === 0) {
    return <div style={{ color: '#999', fontSize: '14px' }}>暂无预约记录</div>
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusLabels: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    rejected: '已拒绝',
    expired: '已过期',
  }

  return (
    <div>
      {logs.map((log, index) => (
        <div
          key={log.id}
          style={{
            padding: '8px 0',
            borderBottom: index < logs.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            {formatTime(log.proposed_time)}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            状态：{statusLabels[log.status] || log.status}
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
            申请人：{log.proposer_name}
          </div>
          {log.reject_reason && (
            <div style={{ fontSize: '12px', color: '#FF4D4F', marginTop: '4px' }}>
              拒绝原因：{log.reject_reason}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
