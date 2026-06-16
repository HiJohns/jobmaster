import { useState } from 'react'
import { Modal, Form, Input, Button, message } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import EngineerSelector from './EngineerSelector'
import { workorderApi } from '../api/workorder'

interface DispatchDialogProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  workOrder: {
    id: string
    order_no: string
    store_name?: string
    category_path?: string[]
  } | null
}

function DispatchDialog({ visible, onCancel, onSuccess, workOrder }: DispatchDialogProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleDispatch = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const response = await workorderApi.dispatch(
        workOrder?.id || '',
        values.vendor_id || '',
        values.engineer_id
      )

      if (response.code === 200) {
        message.success('派单成功')
        form.resetFields()
        onSuccess()
      }
    } catch (error) {
      console.error('Dispatch failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!workOrder) return null

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          派单处理
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="dispatch" type="primary" loading={loading} onClick={handleDispatch}>
          确认派单
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <p style={{ margin: 0 }}>
          <strong>工单编号：</strong>
          <span style={{ color: '#B81F25' }}>{workOrder.order_no}</span>
        </p>
        {workOrder.store_name && (
          <p style={{ margin: '8px 0 0 0' }}>
            <strong>报修网点：</strong>
            {workOrder.store_name}
          </p>
        )}
        {workOrder.category_path && (
          <p style={{ margin: '8px 0 0 0' }}>
            <strong>故障类型：</strong>
            {Array.isArray(workOrder.category_path)
              ? workOrder.category_path.join(' > ')
              : workOrder.category_path}
          </p>
        )}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="engineer_id"
          label="选择维保师傅"
          rules={[{ required: true, message: '请选择维保师傅' }]}
        >
          <EngineerSelector placeholder="请选择维保师傅" />
        </Form.Item>

        <Form.Item name="vendor_id" label="供应商ID (可选)">
          <Input placeholder="留空则由系统自动分配" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default DispatchDialog
