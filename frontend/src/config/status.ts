/**
 * WorkOrder Status Configuration
 * The Single Source of Truth for all status-related mappings
 * 
 * Architecture Principle: No component should hardcode status values.
 * All status text, colors, icons, and permissions must come from this config.
 */

export type WorkOrderStatus = 
  | 'PENDING' 
  | 'DISPATCHED' 
  | 'RESERVED' 
  | 'ARRIVED' 
  | 'WORKING' 
  | 'FINISHED' 
  | 'OBSERVING' 
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
  3: 'RESERVED',
  4: 'ARRIVED',
  5: 'WORKING',
  6: 'FINISHED',
  7: 'OBSERVING',
  8: 'CLOSED',
}

export const STATUS_ID_REVERSE_MAP: Record<WorkOrderStatus, number> = {
  PENDING: 1,
  DISPATCHED: 2,
  RESERVED: 3,
  ARRIVED: 4,
  WORKING: 5,
  FINISHED: 6,
  OBSERVING: 7,
  CLOSED: 8,
}

/**
 * Complete status configuration table
 * This is the ONLY place where status metadata should be defined
 */
export const STATUS_CONFIG: Record<WorkOrderStatus, StatusConfig> = {
  PENDING: {
    text: '待服务',
    color: 'orange',
    icon: 'clock-circle',
    description: '工单已创建，等待工程公司指派',
    actions: [],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR'],
  },
  DISPATCHED: {
    text: '已指派',
    color: 'blue',
    icon: 'send',
    description: '工程公司已指派供应商',
    actions: ['accept', 'reject'],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR', 'VENDOR', 'ENGINEER'],
  },
  RESERVED: {
    text: '已预约',
    color: 'cyan',
    icon: 'calendar',
    description: '供应商已确认进场时间',
    actions: ['arrive'],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR', 'VENDOR', 'ENGINEER'],
  },
  ARRIVED: {
    text: '已到场',
    color: 'green',
    icon: 'environment',
    description: '工程师已到场签到',
    actions: ['start'],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR', 'VENDOR', 'ENGINEER'],
  },
  WORKING: {
    text: '施工中',
    color: 'processing',
    icon: 'tool',
    description: '工程师正在施工中',
    actions: ['finish'],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR', 'VENDOR', 'ENGINEER'],
  },
  FINISHED: {
    text: '待验收',
    color: 'purple',
    icon: 'check-circle',
    description: '工程师已提交完工，等待验收',
    actions: ['approve', 'reject'],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR', 'VENDOR', 'ENGINEER'],
  },
  OBSERVING: {
    text: '观察期',
    color: 'magenta',
    icon: 'eye',
    description: '进入观察期，等待最终验收',
    actions: ['approve', 'reject'],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR'],
  },
  CLOSED: {
    text: '已完成',
    color: 'default',
    icon: 'file-done',
    description: '工单已关闭',
    actions: [],
    viewPermissions: ['STORE', 'BRAND_HQ', 'MAIN_CONTRACTOR', 'VENDOR', 'ENGINEER'],
  },
}

/**
 * Status grouping for list view tabs
 */
export const STATUS_GROUPS = {
  pending: {
    title: '待服务',
    statuses: ['PENDING', 'DISPATCHED'],
  },
  working: {
    title: '服务中',
    statuses: ['RESERVED', 'ARRIVED', 'WORKING'],
  },
  review: {
    title: '待修正',
    statuses: ['FINISHED', 'OBSERVING'],
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
