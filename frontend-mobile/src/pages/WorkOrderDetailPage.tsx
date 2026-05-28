import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Toast, NavBar, Steps, Loading, Radio, Selector, DatePicker, Dialog } from 'antd-mobile'
import { LeftOutline } from 'antd-mobile-icons'
import { demoApi } from '../api/demo'
import { localReservationApi } from '../api/local/reservation'
import { useAuthStore } from '../store/useAuthStore'
import WorkOrderRecords from '../components/WorkOrderRecords'

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
  appointment_type?: number
  current_hop?: number
  hop_limit?: number
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
  PENDING_EVALUATION: { text: '待评估', color: '#F59E0B' },
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
  const [dispatchType, setDispatchType] = useState<'assign' | 'distribute'>(
    userInfo?.role?.startsWith('VENDOR') ? 'distribute' : 'assign'
  )
  const [targetOrg, setTargetOrg] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [engineers, setEngineers] = useState<EngineerOption[]>([])
  const [reservePickerVisible, setReservePickerVisible] = useState(false)

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
        let stepIndex = STATUS_STEPS.findIndex(step => step.status === workOrderData.status)
        // 如果工单类型为"指定时段"且当前步为 ACCEPTED（预约），跳过预约步
        if (workOrderData.appointment_type === 1 && STATUS_STEPS[stepIndex]?.status === 'ACCEPTED') {
          stepIndex = stepIndex + 1
        }
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
   * 加载指派/分配目标数据（通过统一 API）
   */
  useEffect(() => {
    if (!userInfo || !workOrder) return

    const role = userInfo.role || ''
    const isBranch = role === 'BRANCH_ADMIN' || role === 'EMPLOYEE'
    const isContractor = role === 'CONTRACTOR_ADMIN' || role === 'CONTRACTOR_EMPLOYEE'
    const isVendor = role === 'VENDOR_ADMIN' || role === 'VENDOR_EMPLOYEE'

    const canAssign = (isBranch && workOrder.status === 'PENDING') || 
      ((isBranch || isContractor) && (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED') &&
      !(workOrder as any).engineer_id &&
       (!(workOrder as any).owner_org_id || (workOrder as any).owner_org_id === userInfo?.orgId))
    const canDistribute = (isContractor || isVendor) && 
      (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED') &&
      !(workOrder as any).engineer_id &&
       (!(workOrder as any).owner_org_id || (workOrder as any).owner_org_id === userInfo?.orgId)

    if (!canAssign && !canDistribute) return

    const loadTargets = async () => {
      try {
        const response = await demoApi.getDispatchableTargets()
        const data = response.data || response
        const respOrgs: any[] = data.organizations || []
        const respEngs: any[] = data.engineers || []

        setOrganizations(respOrgs)
        setEngineers(respEngs.map((e: any) => ({
          id: e.id,
          name: e.display_name || e.username,
          username: e.username,
        })))

        // Auto-select dispatch type based on available targets
        if (respOrgs.length === 0 && respEngs.length > 0) {
          setDispatchType('distribute')
        } else if (respOrgs.length > 0 && respEngs.length === 0) {
          setDispatchType('assign')
        }
      } catch {
        console.error('Failed to load dispatch targets')
      }
    }
    loadTargets()
    setTargetOrg([])
  }, [userInfo, workOrder])

  // Separate effect: clear selection on dispatchType change
  useEffect(() => {
    setTargetOrg([])
  }, [dispatchType])

  /**
   * 处理拒绝工单
   */
  const handleReject = () => {
    if (!workOrder) return
    Dialog.confirm({
      title: '拒绝工单',
      content: '确定要拒绝此工单吗？工单将退回上一级。',
      onConfirm: async () => {
        try {
          await demoApi.rejectWorkOrder(workOrder.id, '')
          Toast.show({ content: '已拒绝', icon: 'success' })
          navigate(-1)
        } catch {
          Toast.show({ content: '拒绝失败', icon: 'fail' })
        }
      },
    })
  }

  /**
   * 处理 Step Flow 按钮点击
   */
  const handleStepAction = async () => {
    if (!workOrder || currentStepIndex >= STATUS_STEPS.length) return

    const currentStep = STATUS_STEPS[currentStepIndex]

    if (currentStep.action === 'reserve') {
      setReservePickerVisible(true)
      return
    }

    try {
      Toast.show({
        content: '正在处理...',
        icon: 'loading',
        duration: 0
      })

      if (currentStep.action === 'accept') {
        await demoApi.acceptWorkOrder(workOrder.id, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      } else if (currentStep.action === 'work') {
        await demoApi.arriveWorkOrder(workOrder.id, [], '')
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

  const handleReserveConfirm = async (date: Date) => {
    setReservePickerVisible(false)
    if (!workOrder) return

    try {
      Toast.show({ content: '正在预约...', icon: 'loading', duration: 0 })
      const appointedAt = date.toISOString()
      await demoApi.reserveWorkOrder(workOrder.id, appointedAt)
      Toast.clear()
      Toast.show({ content: '预约成功', icon: 'success', duration: 1500 })

      const nextStepIndex = currentStepIndex + 1
      if (nextStepIndex < STATUS_STEPS.length) {
        setWorkOrder(prev => prev ? { ...prev, status: STATUS_STEPS[nextStepIndex].status } : prev)
        setCurrentStepIndex(nextStepIndex)
      }
    } catch (error) {
      Toast.clear()
      Toast.show({ content: '预约失败', icon: 'fail', duration: 2000 })
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
                {workOrder.status === 'DISPATCHED' && (workOrder as any).engineer_id ? '已分配' : STATUS_CONFIG[workOrder.status].text}
              </span>
            </div>
            <div><strong>网点：</strong>{workOrder.store_name}</div>
            <div><strong>当前归属：</strong>{(workOrder as any).owner_org_name || '未指派'}</div>
            <div><strong>地址：</strong>{workOrder.address_detail}</div>
            <div><strong>分类：</strong>{Array.isArray(workOrder.category_path) ? workOrder.category_path.join(' > ') : workOrder.category_path}</div>
            <div><strong>描述：</strong>{workOrder.description}</div>
            <div><strong>工程师：</strong>{workOrder.engineer_name || '未分配'}</div>
          </div>
          {workOrder.appointment_type === 1 && (
            <div style={{ margin: '8px 16px 0', padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
              本工单已指定上门时段，无需预约，可直接到场签到
            </div>
          )}
          {(workOrder as any).time_slots && (workOrder as any).time_slots.length > 0 && (
            <div style={{ margin: '8px 16px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>指定时段：</div>
              {(workOrder as any).time_slots.map((slot: any, i: number) => (
                <div key={i} style={{ fontSize: 12, color: '#666', marginBottom: 2, paddingLeft: 8 }}>
                  {slot.days === 'weekday' ? '工作日' : slot.days === 'weekend' ? '周末' : '每天'} {slot.startTime} - {slot.endTime}
                </div>
              ))}
            </div>
          )}
          {workOrder.appointment_type === 2 && (
            <div style={{ margin: '8px 16px 0', padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
              本工单要求提前预约，请先设置预约时间
            </div>
          )}
        </Card>

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
          const canAcceptOrder = ['VENDOR_ADMIN', 'ENGINEER'].includes(role)
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

        <DatePicker
          title="选择预约时间"
          visible={reservePickerVisible}
          onClose={() => setReservePickerVisible(false)}
          onConfirm={(val) => handleReserveConfirm(val as unknown as Date)}
          min={new Date()}
          precision="minute"
        />

        {/* 指派/分配区域 - 内联选择框 */}
        {(() => {
          const role = userInfo?.role || ''
          const isBranch = role === 'BRANCH_ADMIN' || role === 'EMPLOYEE'
          const isContractor = role === 'CONTRACTOR_ADMIN' || role === 'CONTRACTOR_EMPLOYEE'
          const isVendor = role === 'VENDOR_ADMIN' || role === 'VENDOR_EMPLOYEE'

          const canAssign = (isBranch && workOrder.status === 'PENDING') || 
            ((isBranch || isContractor) && (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED') &&
            !(workOrder as any).engineer_id &&
             (!(workOrder as any).owner_org_id || (workOrder as any).owner_org_id === userInfo?.orgId))
    const canDistribute = (isContractor || isVendor) && 
      (workOrder.status === 'DISPATCHED' || workOrder.status === 'ACCEPTED') &&
      !(workOrder as any).engineer_id &&
       (!(workOrder as any).owner_org_id || (workOrder as any).owner_org_id === userInfo?.orgId)

    if (!canAssign && !canDistribute) {
      const ownerName = (workOrder as any).owner_org_name
      const engName = workOrder.engineer_name
      const isMyOrg = (workOrder as any).owner_org_id === userInfo?.orgId
      if (ownerName || engName) {
        return (
          <Card title="工单归属" style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', fontSize: 14, color: '#333', lineHeight: 1.8 }}>
              {!isMyOrg && ownerName && <div>当前指派给：<strong>{ownerName}</strong></div>}
              {isMyOrg && engName && <div>负责工程师：<strong>{engName}</strong></div>}
            </div>
          </Card>
        )
      }
      return null
    }

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
              // Refetch work order instead of hard reload
              try {
                const resp = await demoApi.getWorkOrder(workOrder.id)
                const updated = resp.data || resp
                setWorkOrder(updated)
                setTargetOrg([])
              } catch {}
            } catch (error: any) {
              Toast.clear()
              Toast.show({ content: error.message || '操作失败', icon: 'fail', duration: 2000 })
            }
          }

          return (
            <Card title="工单处理" style={{ marginBottom: '16px' }}>
              {organizations.length > 0 && engineers.length > 0 && (
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

              <Button
                block
                fill="none"
                style={{
                  border: '1px solid #FF4D4F',
                  borderRadius: '8px',
                  height: '40px',
                  fontSize: '14px',
                  color: '#FF4D4F',
                  marginTop: 8,
                }}
                onClick={handleReject}
              >
                拒绝工单
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
