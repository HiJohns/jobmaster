import { Steps } from 'antd'
import { WorkOrderStatus } from '../config/status'

interface StepFlowProps {
  currentStatus: WorkOrderStatus
  appointmentType?: number
  className?: string
}

/**
 * Step Flow component to display work order status progression
 * Shows the current step based on work order status.
 * For appointment_type=1 (指定上门时段), the reservation step is skipped.
 */
export function StepFlow({ currentStatus, appointmentType, className }: StepFlowProps) {
  const baseSequence: WorkOrderStatus[] = [
    'PENDING',
    'DISPATCHED',
    'ACCEPTED',
    'RESERVED',
    'WORKING',
    'PENDING_EVALUATION',
    'FINISHED',
    'CLOSED',
  ]

  // Skip RESERVED for appointment_type=1 (无需预约)
  const stepSequence = appointmentType === 1
    ? baseSequence.filter(s => s !== 'RESERVED')
    : baseSequence

  const currentIndex = stepSequence.indexOf(currentStatus)

  const stepItems = stepSequence.map((status) => {
    const statusMap: Record<WorkOrderStatus, { title: string; description: string }> = {
      PENDING: { title: '报修', description: '工单已创建' },
      DISPATCHED: { title: '已指派', description: '分配供应商' },
      ACCEPTED: { title: '已接单', description: '供应商已接单' },
      RESERVED: { title: '已预约', description: '确认进场时间' },
      WORKING: { title: '施工中', description: '进行中' },
      PENDING_EVALUATION: { title: '待验收', description: '提交完工' },
      FINISHED: { title: '已完成', description: '验收通过' },
      CLOSED: { title: '已完结', description: '评分归档' },
    }

    return {
      title: statusMap[status].title,
      description: status === currentStatus ? statusMap[status].description : '',
    }
  })

  return (
    <Steps
      className={className}
      current={currentIndex}
      items={stepItems}
      size="small"
      responsive={false}
      style={{ padding: '16px 0' }}
    />
  )
}
