import { useState } from 'react'
import { Form, Input, Select, Alert, Button } from 'antd'
import { InfoCircleOutlined, LockOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { pinyin } from 'pinyin-pro'

const { Option } = Select

const toPinyin = (str: string): string => {
  return pinyin(str, { separator: '_', toneType: 'none' })
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

interface TenantFormProps {
  form: FormInstance
  onFinish?: (values: any) => void
  isEditMode?: boolean
  initialValues?: {
    name?: string
    code?: string
    contact_person?: string
    status?: number
    config?: string
    admin_email?: string
    admin_phone?: string
    max_hops?: number
    initial_password?: string
  }
}

const TenantForm: React.FC<TenantFormProps> = ({ form, onFinish, isEditMode = false, initialValues }) => {
  const [configExpanded, setConfigExpanded] = useState(false)

  // Set initial values for edit mode
  useState(() => {
    if (isEditMode && initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        code: initialValues.code,
        contact_person: initialValues.contact_person,
        status: initialValues.status,
        config: initialValues.config ? JSON.stringify(initialValues.config, null, 2) : undefined,
        admin_email: initialValues.admin_email,
        admin_phone: initialValues.admin_phone,
        max_hops: initialValues.max_hops ?? 3,
        initial_password: initialValues.initial_password,
      })
    } else if (!isEditMode) {
      form.setFieldsValue({ max_hops: 3 })
    }
  })

  // 监听表单值变化
  const handleValuesChange = (changedValues: any) => {
    if ('name' in changedValues) {
      const name = changedValues.name || ''
      if (name) {
        const code = toPinyin(name)
        form.setFieldsValue({ code })
      } else {
        form.setFieldsValue({ code: '' })
      }
    }
  }

  return (
    <Form 
      form={form} 
      layout="vertical"
      onValuesChange={handleValuesChange}
      onFinish={onFinish}
    >
      {/* 重要提示 - 仅在创建模式显示 */}
      {!isEditMode && (
        <Alert
          message="重要提示"
          description="租户唯一标识码一旦生成将与数据存储挂钩，不可更改。系统会根据您输入的租户名称自动生成合适的标识码。"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      <Form.Item
        name="name"
        label={<><span style={{ color: 'red' }}>*</span> 租户名称</>}
        rules={[{ required: true, message: '请输入租户名称' }]}
      >
        <Input
          placeholder="如：优衣库中国"
          size="large"
          disabled={isEditMode}
        />
      </Form.Item>

      <Form.Item
        name="code"
        label="唯一代码"
        extra={isEditMode ? "唯一代码不可修改" : "该字段由系统自动生成，无需手动输入"}
      >
        <Input
          placeholder="系统将自动生成"
          disabled
          suffix={isEditMode ? <LockOutlined /> : null}
          style={{ backgroundColor: '#f5f5f5' }}
        />
      </Form.Item>

      <Form.Item
        name="contact_person"
        label="联系人"
      >
        <Input placeholder="请输入联系人姓名" />
      </Form.Item>

      {!isEditMode && (
        <>
          <Form.Item
            name="admin_email"
            label={<> <span style={{ color: 'red' }}>*</span> 管理员邮箱 </>}
            rules={[
              { required: true, message: '请输入管理员邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="admin@example.com" size="large" />
          </Form.Item>

          <Form.Item
            name="admin_phone"
            label={<> <span style={{ color: 'red' }}>*</span> 管理员手机 </>}
            rules={[
              { required: true, message: '请输入管理员手机号' },
              {
                pattern: /^1[3-9]\d{9}$/, 
                message: '请输入有效的中国大陆手机号'
              }
            ]}
          >
            <Input placeholder="13800000000" size="large" />
          </Form.Item>

          <Form.Item
            name="max_hops"
            label="最大转派跳数"
            initialValue={3}
            rules={[
              { required: true, message: '请输入最大转派跳数' },
              {
                validator: (_, value) => {
                  const num = Number(value)
                  if (num >= 1 && num <= 10) return Promise.resolve()
                  return Promise.reject(new Error('跳数必须在1-10之间'))
                }
              }
            ]}
          >
            <Input type="number" min={1} max={10} placeholder="1-10" size="large" />
          </Form.Item>

          <Form.Item
            name="initial_password"
            label={<> <span style={{ color: 'red' }}>*</span> 初始密码 </>}
            rules={[
              { required: true, message: '请输入初始密码' },
              { min: 8, message: '密码至少8位' },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d)/,
                message: '密码需包含字母和数字'
              }
            ]}
            extra="至少8位，包含字母和数字"
          >
            <Input.Password
              placeholder="请设置租户管理员初始密码"
              size="large"
            />
          </Form.Item>
        </>
      )}

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

      <Form.Item label="配置 (JSON)">
        <Button
          type="link"
          onClick={() => setConfigExpanded(!configExpanded)}
          style={{ padding: 0, height: 'auto' }}
        >
          {configExpanded ? '收起配置' : '展开配置'}
          {configExpanded ? <UpOutlined /> : <DownOutlined />}
        </Button>
        {configExpanded && (
          <Input.TextArea
            name="config"
            rows={3}
            placeholder='{"logo": "url", "theme": "default"}'
            style={{ marginTop: 8 }}
          />
        )}
      </Form.Item>

      <Form.Item name="must_change_password" initialValue={true} hidden>
        <input type="checkbox" checked readOnly />
      </Form.Item>
    </Form>
  )
}

export default TenantForm
