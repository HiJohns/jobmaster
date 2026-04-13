/**
 * Create Work Order Modal Component
 * Handles work order creation form with photo upload
 */

import { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Selector,
  Switch,
  Toast,
  ImageUploader,
  Space,
  Button,
  TextArea,
} from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { api } from '../api/factory'
import { CreateWorkOrderRequest } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'

interface CreateWorkOrderModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormValues {
  categoryPath: string
  brandName: string
  description: string
  photoUrls: string[]
  isUrgent: boolean
  addressDetail?: string
  coordinates?: { lat: number; lng: number }
}

const CATEGORY_OPTIONS = [
  { label: '内装/卖场/消防门', value: '内装/卖场/消防门' },
  { label: '内装/卖场/照明', value: '内装/卖场/照明' },
  { label: '内装/后场/配电', value: '内装/后场/配电' },
  { label: '外装/招牌', value: '外装/招牌' },
  { label: '设备/空调', value: '设备/空调' },
  { label: '设备/电梯', value: '设备/电梯' },
]

const BRAND_OPTIONS = [
  { label: 'Apple', value: 'Apple' },
  { label: 'Samsung', value: 'Samsung' },
  { label: 'Huawei', value: 'Huawei' },
  { label: 'Xiaomi', value: 'Xiaomi' },
  { label: 'OPPO', value: 'OPPO' },
  { label: 'Other', value: 'Other' },
]

/**
 * Create Work Order Modal
 */
export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const { userInfo } = useAuthStore()

  /**
   * Handle form submission
   */
  const handleSubmit = async (values: FormValues) => {
    if (!userInfo?.orgId) {
      Toast.show('无法获取组织信息')
      return
    }

    setLoading(true)

    try {
      // Prepare request data
      const requestData: CreateWorkOrderRequest = {
        store_id: userInfo.orgId,
        category_path: values.categoryPath,
        brand_name: values.brandName,
        description: values.description,
        photo_urls: values.photoUrls || [],
        is_urgent: values.isUrgent || false,
        address_detail: values.addressDetail,
        coordinates: values.coordinates,
      }

      // Call API to create work order
      const response = await api.workorder.create(requestData)

      if (response.code === 200 || response.code === 0) {
        Toast.show({
          content: '工单创建成功',
          icon: 'success',
        })
        
        // Reset form and close modal
        form.resetFields()
        onClose()
        onSuccess()
      } else {
        Toast.show({
          content: `创建失败: ${(response as any).message || '未知错误'}`,
          icon: 'fail',
        })
      }
    } catch (error) {
      console.error('Failed to create work order:', error)
      Toast.show({
        content: '创建失败，请稍后重试',
        icon: 'fail',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle modal close
   */
  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="创建工单"
      content={
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          footer={
            <Space direction="vertical" block>
              <Button
                block
                type="submit"
                color="primary"
                loading={loading}
                style={{ '--background-color': '#0033FF' }}
              >
                创建工单
              </Button>
              <Button block onClick={handleClose}>
                取消
              </Button>
            </Space>
          }
        >
          {/* 故障分类 */}
          <Form.Item
            name="categoryPath"
            label="故障分类"
            rules={[
              { required: true, message: '请选择故障分类' },
            ]}
          >
            <Selector
              options={CATEGORY_OPTIONS}
              showCheckMark
            />
          </Form.Item>

          {/* 品牌名称 */}
          <Form.Item
            name="brandName"
            label="品牌名称"
            rules={[
              { required: true, message: '请选择品牌' },
            ]}
          >
            <Selector
              options={BRAND_OPTIONS}
              showCheckMark
            />
          </Form.Item>

          {/* 故障描述 */}
          <Form.Item
            name="description"
            label="故障描述"
            rules={[
              { required: true, message: '请描述故障情况' },
              { min: 10, message: '描述至少需要10个字' },
            ]}
          >
            <TextArea
              placeholder="请详细描述故障情况..."
              rows={4}
            />
          </Form.Item>

          {/* 照片上传 */}
          <Form.Item name="photoUrls" label="上传照片">
            <ImageUploader
              upload={async (file: File): Promise<ImageUploadItem> => {
                // Return a mock URL for demo purposes
                // In production, upload to server and return real URL
                return {
                  url: URL.createObjectURL(file),
                }
              }}
              multiple
              maxCount={9}
              accept="image/*"
            />
          </Form.Item>

          {/* 详细地址 */}
          <Form.Item name="addressDetail" label="详细地址">
            <Input placeholder="请输入详细地址" />
          </Form.Item>

          {/* 紧急程度 */}
          <Form.Item name="isUrgent" label="加急处理">
            <Switch />
          </Form.Item>
        </Form>
      }
    />
  )
}
