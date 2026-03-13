import { useState } from 'react'
import { Form, Input, Select, Alert, Typography } from 'antd'
import { InfoCircleOutlined, LockOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'

const { Option } = Select
const { Text } = Typography

// 拼音转换函数（简单实现）
// 注：实际项目中可以使用 pinyin 库
const pinyinMap: Record<string, string> = {
  '优': 'you', '衣': 'yi', '库': 'ku',
  '阿': 'a', '里': 'li', '巴': 'ba', '斯': 'si',
  '腾': 'teng', '讯': 'xun',
  '华': 'hua', '为': 'wei',
  '百': 'bai', '度': 'du',
  '京': 'jing', '东': 'dong',
  '美': 'mei', '团': 'tuan',
  '字': 'zi', '节': 'jie', '跳': 'tiao', '动': 'dong',
  '小': 'xiao', '米': 'mi',
  '网': 'wang', '易': 'yi',
  '新': 'xin', '浪': 'lang',
  '搜': 'sou', '狐': 'hu',
  '奇': 'qi', '虎': 'hu',
  '凤': 'feng', '凰': 'huang',
}

// 简易拼音转换（仅支持常见字）
const toPinyin = (str: string): string => {
  return str
    .split('')
    .map(char => pinyinMap[char] || char.toLowerCase())
    .join('_')
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
  }
}

const TenantForm: React.FC<TenantFormProps> = ({ form, onFinish, isEditMode = false, initialValues }) => {
  const [codePreview, setCodePreview] = useState<string>('')

  // Set initial values for edit mode
  useState(() => {
    if (isEditMode && initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        code: initialValues.code,
        contact_person: initialValues.contact_person,
        status: initialValues.status,
        config: initialValues.config ? JSON.stringify(initialValues.config, null, 2) : undefined,
      })
      if (initialValues.code) {
        setCodePreview(initialValues.code)
      }
    }
  })

  // 监听表单值变化
  const handleValuesChange = (changedValues: any) => {
    if ('name' in changedValues) {
      const name = changedValues.name || ''
      if (name) {
        const pinyin = toPinyin(name)
        setCodePreview(pinyin)
      } else {
        setCodePreview('')
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
        label="租户名称"
        rules={[{ required: true, message: '请输入租户名称' }]}
      >
        <Input 
          placeholder="如：优衣库中国" 
          size="large"
          disabled={isEditMode}
        />
      </Form.Item>

      {/* 动态代码预览 - 仅在创建模式显示 */}
      {!isEditMode && codePreview && (
        <Form.Item style={{ marginBottom: 8 }}>
          <div style={{ 
            padding: '8px 12px', 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Text type="secondary">标识码预览：</Text>
            <Text strong style={{ color: '#52c41a' }}>{codePreview}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>(系统自动生成)</Text>
          </div>
        </Form.Item>
      )}

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
        <Input.TextArea 
          rows={4} 
          placeholder='{"logo": "url", "sla_threshold": 99.5}' 
        />
      </Form.Item>
    </Form>
  )
}

export default TenantForm
