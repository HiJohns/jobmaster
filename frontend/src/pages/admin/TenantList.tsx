import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, message, Drawer, Form, Input, Select, Result } from 'antd'
import { PlusOutlined, LockOutlined } from '@ant-design/icons'
import { tenantApi, Tenant, CreateTenantRequest } from '../../api/tenant'
import { useAuthStore } from '../../store/useAuthStore'

const { Option } = Select

// Roles that have permission to access tenant management
const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'BRAND_HQ']

const TenantList = () => {
  const [data, setData] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [form] = Form.useForm()
  const { userInfo } = useAuthStore()

  // Check if user has permission to access this page
  const hasPermission = userInfo && ALLOWED_ROLES.includes(userInfo.role)

  const fetchData = async (currentPage: number) => {
    // Skip API call if no permission to avoid 401 logout
    if (!hasPermission) {
      return
    }

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
    fetchData(1)
  }, [hasPermission])

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

  // Show permission denied page if user doesn't have access
  if (!hasPermission) {
    return (
      <div style={{ padding: '24px', background: '#fff', minHeight: 'calc(100vh - 112px)' }}>
        <Result
          icon={<LockOutlined style={{ color: '#0033FF' }} />}
          title="无权限访问"
          subTitle={`当前角色：${userInfo?.role || '未知'}。租户管理仅限系统管理员和总店角色访问。`}
        />
      </div>
    )
  }

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
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="租户名称"
            rules={[{ required: true, message: '请输入租户名称' }]}
          >
            <Input placeholder="如：优衣库中国" />
          </Form.Item>

          <Form.Item
            name="code"
            label="唯一代码"
            rules={[{ required: true, message: '请输入唯一代码' }]}
            extra="用于子域名或特定逻辑，创建后不可修改"
          >
            <Input placeholder="如：uniqlo_cn" />
          </Form.Item>

          <Form.Item
            name="contact_person"
            label="联系人"
          >
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue={1}
          >
            <Select>
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="config"
            label="配置 (JSON)"
          >
            <Input.TextArea rows={4} placeholder='{"logo": "url", "sla_threshold": 99.5}' />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export default TenantList
