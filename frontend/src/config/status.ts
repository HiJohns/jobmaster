/**
 * WorkOrder Status Configuration
 * The Single Source of Truth for all status-related mappings
 * 
 * Architecture Principle: No component should hardcode status values.
 * All status text, colors, icons, and permissions must come from this config.
 * 
 * Updated per Issue #95: 精简工单状态流程
 * 新流程：等待 → 流转 → 已分配 → 已预约 → 施工中 → 验收 → 完成
 */

export type WorkOrderStatus = 
  | 'PENDING'
  | 'DISPATCHED'
  | 'ACCEPTED'
  | 'RESERVED'
  | 'WORKING'
  | 'FINISHED'
  | 'CLOSED'

export interface StatusConfig {
  /** Display text for the status */
  text: string
  /** Ant Design color preset */
  color: string
  /** Icon name (if needed for UI) */
  icon: string
  /** Description of what this status means */
  description: string
  /** Allowed actions for this status */
  actions: string[]
  /** Which roles can view orders in this status */
  viewPermissions: string[]
}

/**
 * Status ID mapping for backend integration
 * Backend uses integers, frontend uses strings
 */
export const STATUS_ID_MAP: Record<number, WorkOrderStatus> = {
  1: 'PENDING',
  2: 'DISPATCHED',
  3: 'ACCEPTED',
  4: 'RESERVED',
  5: 'WORKING',
  6: 'FINISHED',
  7: 'CLOSED',
}

export const STATUS_ID_REVERSE_MAP: Record<WorkOrderStatus, number> = {
  PENDING: 1,
  DISPATCHED: 2,
  ACCEPTED: 3,
  RESERVED: 4,
  WORKING: 5,
  FINISHED: 6,
  CLOSED: 7,
}

/**
 * Complete status configuration table
 * This is the ONLY place where status metadata should be defined
 */
export const STATUS_CONFIG: Record<WorkOrderStatus, StatusConfig> = {
  PENDING: {
    text: '等待',
    color: 'default',
    icon: 'clock-circle',
    description: '工单已创建，等待指派',
    actions: ['dispatch'],
    viewPermissions: ['BRANCH_ADMIN', 'EMPLOYEE', 'CONTRACTOR_ADMIN', 'CONTRACTOR_EMPLOYEE'],
  },
  DISPATCHED: {
    text: '流转',
    color: '#B81F25',
    icon: 'send',
    description: '工单已指派，等待接收',
    actions: ['accept', 'dispatch'],
    viewPermissions: ['BRANCH_ADMIN', 'EMPLOYEE', 'CONTRACTOR_ADMIN', 'CONTRACTOR_EMPLOYEE', 'ENGINEER'],
  },
  ACCEPTED: {
    text: '已分配',
    color: 'cyan',
    icon: 'user',
    description: '已分配工程师，等待预约',
    actions: ['reserve'],
    viewPermissions: ['BRANCH_ADMIN', 'EMPLOYEE', 'CONTRACTOR_ADMIN', 'CONTRACTOR_EMPLOYEE', 'ENGINEER'],
  },
  RESERVED: {
    text: '已预约',
    color: 'purple',
    icon: 'calendar',
    description: '已确认预约时间，等待施工',
    actions: ['start'],
    viewPermissions: ['BRANCH_ADMIN', 'EMPLOYEE', 'CONTRACTOR_ADMIN', 'CONTRACTOR_EMPLOYEE', 'ENGINEER'],
  },
  WORKING: {
    text: '施工中',
    color: 'orange',
    icon: 'tool',
    description: '工程师正在施工中',
    actions: ['finish'],
    viewPermissions: ['BRANCH_ADMIN', 'EMPLOYEE', 'CONTRACTOR_ADMIN', 'CONTRACTOR_EMPLOYEE', 'ENGINEER'],
  },
  FINISHED: {
    text: '验收',
    color: '#C49A3C',
    icon: 'check-circle',
    description: '已提交完工，等待验收',
    actions: ['approve', 'reject'],
    viewPermissions: ['BRANCH_ADMIN', 'EMPLOYEE', 'CONTRACTOR_ADMIN', 'CONTRACTOR_EMPLOYEE', 'ENGINEER'],
  },
  CLOSED: {
    text: '完成',
    color: 'default',
    icon: 'file-done',
    description: '工单已关闭',
    actions: [],
    viewPermissions: ['BRANCH_ADMIN', 'EMPLOYEE', 'CONTRACTOR_ADMIN', 'CONTRACTOR_EMPLOYEE', 'ENGINEER'],
  },
}

/**
 * Status grouping for list view tabs
 */
export const STATUS_GROUPS = {
  pending: {
    title: '待指派',
    statuses: ['PENDING'],
  },
  dispatched: {
    title: '流转中',
    statuses: ['DISPATCHED', 'ACCEPTED'],
  },
  reserved: {
    title: '已预约',
    statuses: ['RESERVED'],
  },
  working: {
    title: '施工中',
    statuses: ['WORKING'],
  },
  review: {
    title: '待验收',
    statuses: ['FINISHED'],
  },
  completed: {
    title: '已完成',
    statuses: ['CLOSED'],
  },
} as const

/**
 * Helper function to get status config by status string
 */
export function getStatusConfig(status: WorkOrderStatus): StatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
}

/**
 * Helper function to get status text
 */
export function getStatusText(status: WorkOrderStatus): string {
  return getStatusConfig(status).text
}

/**
 * Helper function to get status color
 */
export function getStatusColor(status: WorkOrderStatus): string {
  return getStatusConfig(status).color
}

/**
 * Convert backend status ID to frontend status string
 */
export function parseStatusId(statusId: number): WorkOrderStatus {
  return STATUS_ID_MAP[statusId] || 'PENDING'
}

/**
 * Convert frontend status string to backend status ID
 */
export function toStatusId(status: WorkOrderStatus): number {
  return STATUS_ID_REVERSE_MAP[status] || 1
}

/**
 * Check if status allows a specific action
 */
export function canPerformAction(status: WorkOrderStatus, action: string): boolean {
  const config = getStatusConfig(status)
  return config.actions.includes(action)
}

/**
 * Get available actions for a status
 */
export function getAvailableActions(status: WorkOrderStatus): string[] {
  return getStatusConfig(status).actions
}

/**
 * Get context-aware status text based on order details
 * DISPATCHED + engineer assigned → "已指派" instead of "流转"
 */
export function getContextStatusText(status: WorkOrderStatus, engineerId?: string): string {
  if (status === 'DISPATCHED' && engineerId) {
    return '已指派'
  }
  return getStatusText(status)
}