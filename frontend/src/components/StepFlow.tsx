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
  // Define the step flow sequence
  const stepSequence: WorkOrderStatus[] = [
    'PENDING',
    'DISPATCHED',
    'RESERVED',
    'ARRIVED',
    'WORKING',
    'FINISHED',
    'OBSERVING',
    'CLOSED',
  ]

  // Get current step index
  const currentIndex = stepSequence.indexOf(currentStatus)

  // Create step items with descriptions
  const stepItems = stepSequence.map((status) => {
    const statusMap: Record<WorkOrderStatus, { title: string; description: string }> = {
      PENDING: { title: '报修', description: '工单已创建' },
      DISPATCHED: { title: '已指派', description: '分配供应商' },
      RESERVED: { title: '已预约', description: '确认进场时间' },
      ARRIVED: { title: '已到场', description: '工程师签到' },
      WORKING: { title: '施工中', description: '进行中' },
      FINISHED: { title: '待验收', description: '提交完工' },
      OBSERVING: { title: '观察期', description: '等待最终验收' },
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
