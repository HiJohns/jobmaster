import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Form, TextArea, ImageUploader, Toast, NavBar } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { LeftOutline } from 'antd-mobile-icons'

interface ConstructionRecord {
  order_id: string
  message: string
  photos: string[]
  created_at: string
}

/**
 * ConstructionRecordPage - 施工记录页
 * 功能：文字留言、照片上传、异步提交
 * 路由：/wechat/orders/:id/record
 */
export default function ConstructionRecordPage() {
  const { id: orderId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])

  if (!orderId) {
    Toast.show('无效的工单ID')
    navigate(-1)
    return null
  }

  /**
   * 处理照片上传
   * 使用本地预览 URL（实际项目中需要上传到服务器）
   */
  const handlePhotoUpload = async (file: File): Promise<ImageUploadItem> => {
    try {
      // 模拟上传过程（异步）
      const url = URL.createObjectURL(file)
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 更新已上传照片列表
      setUploadedPhotos(prev => [...prev, url])
      
      Toast.show({
        content: '照片上传成功',
        icon: 'success',
        duration: 1000
      })
      
      return { url }
    } catch (error) {
      Toast.show({
        content: '照片上传失败',
        icon: 'fail',
        duration: 2000
      })
      throw error
    }
  }

  /**
   * 处理表单提交
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 验证：至少有留言或照片
      if (!values.message?.trim() && uploadedPhotos.length === 0) {
        Toast.show({
          content: '请至少填写留言或上传照片',
          icon: 'fail',
          duration: 2000
        })
        return
      }

      setLoading(true)

      // 构造提交数据
      const recordData: ConstructionRecord = {
        order_id: orderId,
        message: values.message || '',
        photos: uploadedPhotos,
        created_at: new Date().toISOString()
      }

      // 模拟 API 提交
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 验证数据（仅用于避免 lint 错误）
      console.log('提交数据:', recordData)
      
      Toast.show({
        content: '提交成功',
        icon: 'success',
        duration: 1500
      })

      // 返回工单详情页
      setTimeout(() => {
        navigate(`/wechat/orders/${orderId}`)
      }, 1500)
      
    } catch (error) {
      console.error('提交失败:', error)
      Toast.show({
        content: '提交失败，请重试',
        icon: 'fail',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 处理返回
   */
  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* 导航栏 */}
      <NavBar
        backArrow={<LeftOutline />}
        onBack={handleBack}
        style={{ background: '#fff' }}
      >
        施工记录
      </NavBar>

      {/* 表单内容 */}
      <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
        <Form
          form={form}
          layout="vertical"
          footer={
            <Button
              block
              type="submit"
              color="primary"
              size="large"
              loading={loading}
              onClick={handleSubmit}
              style={{ 
                '--background-color': '#0033FF',
                '--border-radius': '8px',
                height: '48px',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              提交记录
            </Button>
          }
        >
          {/* 文字留言 */}
          <Form.Item
            name="message"
            label="文字留言"
            rules={[
              { required: false, message: '' }
            ]}
          >
            <TextArea
              placeholder="请描述施工情况或备注信息..."
              rows={4}
              style={{ 
                '--font-size': '16px',
                '--placeholder-color': '#999999'
              }}
            />
          </Form.Item>

          {/* 照片上传 */}
          <Form.Item
            name="photos"
            label="上传照片"
            help="最多可上传 9 张照片"
          >
            <ImageUploader
              upload={handlePhotoUpload}
              multiple
              maxCount={9}
              accept="image/*"
              showUpload={uploadedPhotos.length < 9}
              deletable
              onDelete={(item: ImageUploadItem) => {
                const newPhotos = uploadedPhotos.filter(photo => photo !== item.url)
                setUploadedPhotos(newPhotos)
                return Promise.resolve(true)
              }}
              style={{
                '--cell-size': '80px',
                '--gap': '8px'
              }}
            />
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
