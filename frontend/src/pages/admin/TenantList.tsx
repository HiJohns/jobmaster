import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, message, Drawer, Form, Result } from 'antd'
import { PlusOutlined, LockOutlined } from '@ant-design/icons'
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
  
  // Get user role from auth store
  const userInfo = useAuthStore((state) => state.userInfo)
  const userRole = userInfo?.role
  
  // Check if user has permission to access tenant management
  const hasPermission = userRole && ALLOWED_ROLES.includes(userRole)

  const fetchData = async (currentPage: number) => {
    setLoading(true)
    try {
      const response = await tenantApi.list(currentPage, pageSize)
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
      fetchData(1)
    }
  }, [hasPermission])
  
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
      width: '25%',
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
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
      width: '15%',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
      width: '25%',
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link" size="small">编辑</Button>
        </Space>
      ),
      width: '15%',
    },
  ]

  return (
    <div style={{ padding: '24px', background: '#fff' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>租户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建租户
        </Button>
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
          onChange: (page) => fetchData(page),
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
        <Form form={form} onFinish={handleSubmit}>
          <TenantForm form={form} />
        </Form>
      </Drawer>
    </div>
  )
}

export default TenantList
