import { Steps } from 'antd'
import { WorkOrderStatus } from '../config/status'

interface StepFlowProps {
  currentStatus: WorkOrderStatus
  className?: string
}

/**
 * Step Flow component to display work order status progression
 * Shows the current step based on work order status
 */
export function StepFlow({ currentStatus, className }: StepFlowProps) {
  const stepSequence: WorkOrderStatus[] = [
    'PENDING',
    'DISPATCHED',
    'ACCEPTED',
    'RESERVED',
    'WORKING',
    'FINISHED',
    'CLOSED',
  ]

  const currentIndex = stepSequence.indexOf(currentStatus)

  const stepItems = stepSequence.map((status) => {
    const statusMap: Record<WorkOrderStatus, { title: string; description: string }> = {
      PENDING: { title: '报修', description: '工单已创建' },
      DISPATCHED: { title: '已指派', description: '分配供应商' },
      ACCEPTED: { title: '已接单', description: '供应商已接单' },
      RESERVED: { title: '已预约', description: '确认进场时间' },
      WORKING: { title: '施工中', description: '进行中' },
      FINISHED: { title: '待验收', description: '提交完工' },
      CLOSED: { title: '已完成', description: '验收通过' },
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
