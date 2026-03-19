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
      message.error('Failed to fetch devices')
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
      title: 'SN',
      dataIndex: 'sn',
      key: 'sn',
      render: (sn: string) => <code>{sn}</code>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Site',
      dataIndex: 'site_name',
      key: 'site_name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Device) => (
        <Space>
          <Link to={`/assets/${record.id}`}>
            <Button type="link" size="small">View</Button>
          </Link>
          <Link to={`/assets/${record.id}/qr`}>
            <Button type="link" size="small" icon={<QrcodeOutlined />}>QR</Button>
          </Link>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="Asset List"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          Add Device
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by SN or name"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 250 }}
        />
        <Select
          placeholder="Status"
          allowClear
          value={statusFilter || undefined}
          onChange={(value) => {
            setStatusFilter(value || '')
            setPage(1)
          }}
          style={{ width: 150 }}
        >
          <Option value="ACTIVE">Active</Option>
          <Option value="INACTIVE">Inactive</Option>
          <Option value="MAINTENANCE">Maintenance</Option>
          <Option value="REPAIRING">Repairing</Option>
        </Select>
        <Button onClick={handleSearch}>Search</Button>
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
