import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Toast, NavBar, Loading, Radio, Selector, DatePicker, Dialog } from 'antd-mobile'
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

interface EngineerOption {
  id: string
  name: string
  username: string
}

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待处理', color: '#999999' },
  DISPATCHED: { text: '流转中', color: '#57534E' },
  ACCEPTED: { text: '已接单', color: '#C49A3C' },
  RESERVED: { text: '已预约', color: '#FF8F1F' },
  WORKING: { text: '施工中', color: '#B45309' },
  FINISHED: { text: '已完成', color: '#0F766E' },
  PENDING_EVALUATION: { text: '待验收', color: '#0F766E' },
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
  const [dispatchType, setDispatchType] = useState<'assign' | 'distribute'>(
    userInfo?.role?.startsWith('VENDOR') ? 'distribute' : 'assign'
  )
  const [targetOrg, setTargetOrg] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [engineers, setEngineers] = useState<EngineerOption[]>([])
  const [reservePickerVisible, setReservePickerVisible] = useState(false)
  const [verifyModalAction, setVerifyModalAction] = useState<'approve' | 'reject' | null>(null)
  const [verifyComment, setVerifyComment] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

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
   * 处理验收
   */
  const handleVerify = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !verifyComment.trim()) {
      Toast.show({ content: '请输入退回理由', icon: 'fail' })
      return
    }
    setVerifyLoading(true)
    try {
      await demoApi.verifyWorkOrder(orderId, { action, comment: verifyComment })
      Toast.show({ content: action === 'approve' ? '验收合格' : '已退回整改', icon: 'success' })
      navigate(-1)
    } catch {
      Toast.show({ content: '操作失败', icon: 'fail' })
    } finally {
      setVerifyLoading(false)
    }
  }

  /**
   * 处理 Step Flow 按钮点击
   */
  const handleStartWork = async () => {
    if (!workOrder) return
    try {
      Toast.show({ content: '开始施工...', icon: 'loading', duration: 0 })
      await demoApi.arriveWorkOrder(workOrder.id, [], '')
      Toast.clear()
      Toast.show({ content: '已开始施工', icon: 'success', duration: 1500 })
      const resp = await demoApi.getWorkOrder(workOrder.id)
      const updated = resp.data || resp
      setWorkOrder(updated)
    } catch (error) {
      Toast.clear()
      Toast.show({ content: '操作失败', icon: 'fail', duration: 2000 })
    }
  }

  const handleReserve = async (date: Date) => {
    setReservePickerVisible(false)
    if (!workOrder) return
    try {
      Toast.show({ content: '正在预约...', icon: 'loading', duration: 0 })
      await demoApi.reserveWorkOrder(workOrder.id, date.toISOString())
      Toast.clear()
      Toast.show({ content: '预约成功', icon: 'success', duration: 1500 })
      const resp = await demoApi.getWorkOrder(workOrder.id)
      const updated = resp.data || resp
      setWorkOrder(updated)
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
        <Loading color="#B61C22" />
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
                  {slot.days === 'weekday' ? '工作日' : slot.days === 'weekend' ? '周末' : '每天'} {slot.start_time} - {slot.end_time}
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

        {/* 工单处理 - 根据预约类型显示不同按钮 */}
        {(() => {
          const role = userInfo?.role || ''
          const isEngVendor = ['VENDOR_ADMIN', 'ENGINEER'].includes(role)
          if (!workOrder || !isEngVendor) return null
          
          if (workOrder.appointment_type === 1 && workOrder.status === 'DISPATCHED') {
            return (
              <Card style={{ marginBottom: '16px' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#166534', background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                    本工单已指定上门时段，确认后可开始施工
                  </div>
                  <Button
                    block
                    size="large"
                    style={{ '--background-color': '#C49A3C', '--border-radius': '8px', height: '48px', fontSize: '16px' }}
                    onClick={handleStartWork}
                  >
                    开始施工
                  </Button>
                </div>
              </Card>
            )
          }
          
          if (workOrder.appointment_type === 2 && workOrder.status === 'DISPATCHED') {
            return (
              <Card style={{ marginBottom: '16px' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#1e40af', background: '#eff6ff', borderRadius: 8, padding: '10px 14px', marginBottom: '12px', border: '1px solid #bfdbfe' }}>
                    本工单要求提前预约，请选择上门时间
                  </div>
                  <Button
                    block
                    size="large"
                    style={{ '--background-color': '#FF8F1F', '--border-radius': '8px', height: '48px', fontSize: '16px' }}
                    onClick={() => setReservePickerVisible(true)}
                  >
                    选择预约时间
                  </Button>
                </div>
              </Card>
            )
          }
          
          return null
        })()}

        <DatePicker
          title="选择预约时间"
          visible={reservePickerVisible}
          onClose={() => setReservePickerVisible(false)}
          onConfirm={(val) => handleReserve(val as unknown as Date)}
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

        {/* 验收操作（仅分公司角色，FINISHED 状态） */}
        {(() => {
          const role = userInfo?.role || ''
          const isBranch = role === 'BRANCH_ADMIN' || role === 'EMPLOYEE'
          const canVerify = isBranch && workOrder.status === 'PENDING_EVALUATION'
          if (!canVerify || !workOrder) return null

          return (
            <Card style={{ marginBottom: '16px' }}>
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  工单已完成，请选择验收操作
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button
                    block
                    size="large"
                    style={{
                      '--background-color': '#C49A3C',
                      '--border-radius': '8px',
                      height: '48px',
                      fontSize: '16px',
                      flex: 1,
                    }}
                    onClick={() => {
                      setVerifyComment('')
                      setVerifyModalAction('approve')
                    }}
                  >
                    验收合格
                  </Button>
                  <Button
                    block
                    size="large"
                    style={{
                      '--background-color': '#FF4D4F',
                      '--border-radius': '8px',
                      height: '48px',
                      fontSize: '16px',
                      flex: 1,
                    }}
                    onClick={() => {
                      setVerifyComment('')
                      setVerifyModalAction('reject')
                    }}
                  >
                    退回整改
                  </Button>
                </div>
              </div>
            </Card>
          )
        })()}

        {/* 验收/退回弹窗 */}
        <Dialog
          visible={verifyModalAction !== null}
          title={verifyModalAction === 'approve' ? '验收合格' : '退回整改'}
          onClose={() => setVerifyModalAction(null)}
          content={
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                {verifyModalAction === 'approve'
                  ? '请输入验收评论（可选）'
                  : '请输入退回理由（必填）'}
              </div>
              <textarea
                value={verifyComment}
                onChange={(e) => setVerifyComment(e.target.value)}
                placeholder={verifyModalAction === 'approve' ? '选填评论' : '请填写退回理由'}
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>
          }
          actions={[
            {
              key: 'cancel',
              text: '取消',
              onClick: () => setVerifyModalAction(null),
            },
            {
              key: 'confirm',
              text: '确认',
              loading: verifyLoading,
              onClick: async () => {
                if (!verifyModalAction) return
                await handleVerify(verifyModalAction)
                setVerifyModalAction(null)
              },
            },
          ]}
        />

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
              '--background-color': '#C49A3C',
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
