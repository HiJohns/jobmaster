import { Table, Tag, Button, Space, Tooltip } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { Device } from '../api/device'
import dayjs from 'dayjs'

interface RepairingDeviceListProps {
  devices: Device[]
  loading: boolean
  onDispatch: (device: Device) => void
}

function RepairingDeviceList({ devices, loading, onDispatch }: RepairingDeviceListProps) {
  const columns = [
    {
      title: '设备SN码',
      dataIndex: 'sn',
      key: 'sn',
      width: 150,
      render: (sn: string) => (
        <span style={{ fontFamily: 'monospace', color: '#0033FF' }}>{sn}</span>
      ),
    },
    {
      title: '设备名称/型号',
      key: 'device_info',
      width: 180,
      render: (_: unknown, record: Device) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.model || '-'}</div>
        </div>
      ),
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
    },
    {
      title: '报修时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (createdAt: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#faad14' }} />
          {dayjs(createdAt).format('YYYY-MM-DD HH:mm')}
        </Space>
      ),
    },
    {
      title: '关联工单',
      key: 'work_order',
      width: 150,
      render: (_: unknown, record: Device) => {
        const info = record.info as { work_order_no?: string } | undefined
        return info?.work_order_no ? (
          <Tag color="blue">{info.work_order_no}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      },
    },
    {
      title: '故障描述',
      key: 'fault_desc',
      render: (_: unknown, record: Device) => {
        const info = record.info as { fault_description?: string } | undefined
        return (
          <Tooltip title={info?.fault_description || '暂无描述'}>
            <span style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info?.fault_description || '-'}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Device) => (
        <Button type="primary" size="small" onClick={() => onDispatch(record)}>
          处理
        </Button>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={devices}
      rowKey="id"
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条记录`,
      }}
      scroll={{ x: 1000 }}
      size="middle"
    />
  )
}

export default RepairingDeviceList
