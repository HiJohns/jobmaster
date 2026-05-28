import { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, message } from 'antd'
import { SearchOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import request from '../utils/auth'

const { Option } = Select

interface Device {
  id: string
  sn: string
  name: string
  model: string
  brand: string
  org_id: string
  status: string
  site_name?: string
  created_at: string
}

const statusColors: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  MAINTENANCE: 'orange',
  REPAIRING: 'red',
}

export default function AssetList() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchDevices()
  }, [page, pageSize, statusFilter])

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      })
      if (statusFilter) {
        params.append('status', statusFilter)
      }

      const response = await request.get(`/devices?${params}`)
      if (response.data.code === 200) {
        setDevices(response.data.data || [])
        setTotal(response.data.total || 0)
      }
    } catch (error) {
      message.error('获取设备列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchDevices()
  }

  const columns = [
    {
      title: '序列号',
      dataIndex: 'sn',
      key: 'sn',
      render: (sn: string) => <code>{sn}</code>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '站点',
      dataIndex: 'site_name',
      key: 'site_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Device) => (
        <Space>
          <Link to={`/assets/${record.id}`}>
            <Button type="link" size="small">查看</Button>
          </Link>
          <Link to={`/assets/${record.id}/qr`}>
            <Button type="link" size="small" icon={<QrcodeOutlined />}>二维码</Button>
          </Link>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="设备清单"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          Add Device
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="按序列号或名称搜索"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 250 }}
        />
        <Select
          placeholder="状态"
          allowClear
          value={statusFilter || undefined}
          onChange={(value) => {
            setStatusFilter(value || '')
            setPage(1)
          }}
          style={{ width: 150 }}
        >
          <Option value="ACTIVE">启用</Option>
          <Option value="INACTIVE">停用</Option>
          <Option value="MAINTENANCE">维保中</Option>
          <Option value="REPAIRING">维修中</Option>
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={devices}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />
    </Card>
  )
}
