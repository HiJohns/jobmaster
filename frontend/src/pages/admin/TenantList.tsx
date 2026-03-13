import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, message, Drawer, Form, Result, Input, Select } from 'antd'
import { PlusOutlined, LockOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { tenantApi, Tenant, CreateTenantRequest } from '../../api/tenant'
import { useAuthStore } from '../../store/useAuthStore'
import TenantForm from './TenantForm'

// Roles that can access tenant management
const ALLOWED_ROLES = ['ADMIN', 'BRAND_HQ']

const TenantList = () => {
  const [data, setData] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [form] = Form.useForm()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  
  // Get user role from auth store
  const userInfo = useAuthStore((state) => state.userInfo)
  const userRole = userInfo?.role
  
  // Check if user has permission to access tenant management
  const hasPermission = userRole && ALLOWED_ROLES.includes(userRole)

  const fetchData = async (currentPage: number, search = '', status = '全部') => {
    setLoading(true)
    try {
      const response = await tenantApi.list(currentPage, pageSize, search, status)
      if (response.code === 200) {
        setData(response.data.tenants)
        setTotal(response.data.total)
        setPage(response.data.page)
      } else {
        message.error('获取租户列表失败')
      }
    } catch (error) {
      message.error('获取租户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch data if user has permission
    if (hasPermission) {
      fetchData(1, searchKeyword, statusFilter)
    }
  }, [hasPermission])

  const handleSearch = (value: string) => {
    setSearchKeyword(value)
    setPage(1)
    fetchData(1, value, statusFilter)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    fetchData(1, searchKeyword, value)
  }
  
  // Show permission denied page if user doesn't have access
  if (!hasPermission) {
    return (
      <Result
        status="403"
        title="无权限访问"
        icon={<LockOutlined />}
        subTitle="您没有权限访问租户管理页面。此功能仅对系统管理员和品牌总部开放。"
      />
    )
  }

  const handleCreate = () => {
    form.resetFields()
    setDrawerVisible(true)
  }

  const handleSubmit = async (values: CreateTenantRequest) => {
    try {
      const response = await tenantApi.create(values)
      if (response.code === 201) {
        message.success('创建租户成功')
        setDrawerVisible(false)
        fetchData(1)
      } else {
        message.error('创建失败: ' + (response.message || '未知错误'))
      }
    } catch (error: any) {
      message.error('创建失败: ' + (error.message || '未知错误'))
    }
  }

  const columns = [
    {
      title: '租户名称',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
    },
    {
      title: '唯一代码',
      dataIndex: 'code',
      key: 'code',
      width: '20%',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <div className={status === 1 ? 'bg-green-50 text-green-600 border-0 px-3 py-1 rounded-md' : 'bg-gray-50 text-gray-400 border-0 px-3 py-1 rounded-md'}>
          {status === 1 ? '启用' : '禁用'}
        </div>
      ),
      width: '12%',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
      width: '20%',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right' as const,
      render: () => (
        <Space size="middle">
          <Button type="link" size="small">编辑</Button>
          <Button type="link" size="small" danger>禁用</Button>
        </Space>
      ),
      width: '18%',
    },
  ]

  return (
    <div style={{ padding: '24px', background: '#fff' }}>
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <Input.Search
            placeholder="搜索租户名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={handleStatusFilter}
            style={{ width: 120 }}
          >
            <Select.Option value="全部">全部</Select.Option>
            <Select.Option value="启用">启用</Select.Option>
            <Select.Option value="禁用">禁用</Select.Option>
          </Select>
          <div className="ml-auto">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建租户
            </Button>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          onChange: (newPage) => fetchData(newPage, searchKeyword, statusFilter),
          showSizeChanger: false,
        }}
        scroll={{ x: 768 }}
      />

      <Drawer
        title="创建租户"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setDrawerVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" onClick={() => form.submit()}>
              提交
            </Button>
          </div>
        }
      >
        <TenantForm form={form} onFinish={handleSubmit} />
      </Drawer>
    </div>
  )
}

export default TenantList
