import { Tag } from 'antd'

interface StatusFilterProps {
  activeStatus: string | null
  onStatusChange: (status: string | null) => void
  counts?: Record<string, number>
}

const STATUS_OPTIONS = [
  { key: null, label: '全部', color: 'default' },
  { key: 'ACTIVE', label: '正常', color: '#C49A3C' },
  { key: 'BROKEN', label: '故障', color: 'orange' },
  { key: 'REPAIRING', label: '报修中', color: 'red' },
  { key: 'INACTIVE', label: '停用', color: 'gray' },
]

function StatusFilter({ activeStatus, onStatusChange, counts }: StatusFilterProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.map((option) => (
          <Tag
            key={option.key ?? 'all'}
            color={activeStatus === option.key ? option.color : 'default'}
            style={{
              cursor: 'pointer',
              padding: '4px 12px',
              fontSize: 14,
              borderRadius: 16,
            }}
            onClick={() => onStatusChange(option.key)}
          >
            {option.label}
            {counts && option.key !== null && counts[option.key] > 0 && (
              <span style={{ marginLeft: 4 }}>({counts[option.key]})</span>
            )}
          </Tag>
        ))}
      </div>
    </div>
  )
}

export default StatusFilter
