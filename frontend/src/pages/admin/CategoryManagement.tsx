import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { api } from '../api/factory'

interface Category {
  id: string
  name: string
  code: string
  level: number
  path: string
  parent_id: string | null
  sort_order: number
  status: number
  children?: Category[]
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await api.category.list({ parent_id: '' })
      const data = res.data || []
      setCategories(data)
    } catch (error) {
      message.error('加载分类失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleAdd = (parentId?: string) => {
    setEditingCategory(null)
    setParentId(parentId || null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Category) => {
    setEditingCategory(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      sort_order: record.sort_order,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.category.delete(id)
      message.success('删除成功')
      loadCategories()
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingCategory) {
        await api.category.update(editingCategory.id, {
          name: values.name,
          sort_order: values.sort_order,
        })
        message.success('更新成功')
      } else {
        await api.category.create({
          ...values,
          parent_id: parentId || undefined,
        })
        message.success('创建成功')
      }
      setModalVisible(false)
      loadCategories()
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败')
    }
  }

  const renderTreeData = (cats: Category[], level = 0): Category[] => {
    const result: Category[] = []
    cats.forEach(cat => {
      result.push({ ...cat, level })
      if (cat.children && cat.children.length > 0) {
        result.push(...renderTreeData(cat.children, level + 1))
      }
    })
    return result
  }

  const flatCategories = renderTreeData(categories)

  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Category) => (
        <span style={{ paddingLeft: record.level * 20 }}>{text}</span>
      ),
    },
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="link"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => handleAdd(record.id)}
          >
            添加子分类
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此分类吗？"
            onConfirm={() => handleDelete(record.id)}
            disabled={record.children && record.children.length > 0}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={record.children && record.children.length > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="工单分类管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadCategories}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd()}>
              添加顶级分类
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={flatCategories}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="分类编码"
            rules={[{ required: true, message: '请输入分类编码' }]}
            disabled={!!editingCategory}
          >
            <Input placeholder="请输入分类编码" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <Input type="number" placeholder="请输入排序号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

interface Category {
  id: string
  name: string
  code: string
  level: number
  path: string
  parent_id: string | null
  sort_order: number
  status: number
  children?: Category[]
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await api.get('/categories', { params: { parent_id: '' } })
      const data = res.data?.data || res.data || []
      setCategories(data)
    } catch (error) {
      message.error('加载分类失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleAdd = (parentId?: string) => {
    setEditingCategory(null)
    setParentId(parentId || null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Category) => {
    setEditingCategory(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      sort_order: record.sort_order,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`)
      message.success('删除成功')
      loadCategories()
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/categories', {
          ...values,
          parent_id: parentId,
        })
        message.success('创建成功')
      }
      setModalVisible(false)
      loadCategories()
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败')
    }
  }

  const renderTreeData = (cats: Category[], level = 0): Category[] => {
    const result: Category[] = []
    cats.forEach(cat => {
      result.push({ ...cat, level })
      if (cat.children && cat.children.length > 0) {
        result.push(...renderTreeData(cat.children, level + 1))
      }
    })
    return result
  }

  const flatCategories = renderTreeData(categories)

  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Category) => (
        <span style={{ paddingLeft: record.level * 20 }}>{text}</span>
      ),
    },
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="link"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => handleAdd(record.id)}
          >
            添加子分类
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此分类吗？"
            onConfirm={() => handleDelete(record.id)}
            disabled={record.children && record.children.length > 0}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={record.children && record.children.length > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="工单分类管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadCategories}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd()}>
              添加顶级分类
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={flatCategories}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="分类编码"
            rules={[{ required: true, message: '请输入分类编码' }]}
            disabled={!!editingCategory}
          >
            <Input placeholder="请输入分类编码" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <Input type="number" placeholder="请输入排序号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}