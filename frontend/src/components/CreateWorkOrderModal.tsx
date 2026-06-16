/**
 * Create Work Order Modal Component v2.1
 * 调整：区域选择移到分类之上，分类联动显示
 */

import { useState, useEffect, useRef } from 'react'
import {
  Modal,
  Form,
  Input,
  Toast,
  ImageUploader,
  Button,
  TextArea,
  Card,
} from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { api, demoApi } from '../api/factory'
import { CreateWorkOrderRequest } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'
import { addPendingOrder } from '../utils/pendingOrders'

interface CreateWorkOrderModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  description: string
  photoUrls: string[]
  priority: 0 | 1 | 2
  addressDetail?: string
  coordinates?: { lat: number; lng: number }
  categoryId?: string
}

/**
 * Create Work Order Modal v2.1
 * 调整：区域选择移到分类之上，分类联动显示
 */
export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [activePriority, setActivePriority] = useState<0 | 1 | 2>(0)
  const uploadFilesRef = useRef<File[]>([])

  // Region and Category states
  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [categoriesVisible, setCategoriesVisible] = useState<boolean>(false)
  const [filteredCategories, setFilteredCategories] = useState<any[]>([])
  
  // Division state (kept for backward compatibility)
  const [selectedDivisionPath, setSelectedDivisionPath] = useState<string[]>([])
  
  const { userInfo } = useAuthStore()
  const [appointmentType, setAppointmentType] = useState(1)

  // Pre-fill address for Employee role
  useEffect(() => {
    if (visible && userInfo?.role === 'EMPLOYEE') {
      form.setFieldsValue({ addressDetail: '太阳宫中路12号凯德MALL3层' })
    }
  }, [visible, userInfo?.role])

  // Load regions when modal opens
  useEffect(() => {
    if (visible) {
      loadRegions()
    }
  }, [visible])

  // Load regions
  const loadRegions = async () => {
    try {
      const response = await api.region.list()
      if (response.code === 200 && response.data) {
        const data = response.data as any
        if (data.regions && Array.isArray(data.regions)) {
          setRegions(data.regions)
        }
      }
    } catch (error) {
      console.error('Failed to load regions:', error)
    }
  }

  // Handle region change
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    setCategoriesVisible(true)
    
    // Load categories for selected region
    loadCategoriesForRegion(region)
  }

  // Load categories for selected region
  const loadCategoriesForRegion = async (region: string) => {
    try {
      const response = await api.region.getCategories(region);
      const data = response.data || response;
      if (data.categories && Array.isArray(data.categories)) {
        setFilteredCategories(data.categories.map((cat: string, idx: number) => ({
          id: `${region}_${idx}`,
          name: cat,
          path: cat
        })));
      } else {
        setFilteredCategories([]);
      }
    } catch (error) {
      console.error("Failed to load categories for region:", error);
      setFilteredCategories([]);
    }
  }

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
        title: values.title,
        description: values.description,
        photo_urls: [],
        priority: activePriority || 0,
        is_urgent: (activePriority || 0) > 0,
        address_detail: values.addressDetail,
        category_id: values.categoryId,
        coordinates: values.coordinates,
        division_id: selectedDivisionPath.length > 0 ? selectedDivisionPath[selectedDivisionPath.length - 1] : undefined,
        appointment_type: appointmentType,
      }

      const response = await api.workorder.create(requestData)
      
      if (response.code === 200) {
        const newOrderId = response.data?.id || response.id

        // Upload tracked files to the new work order
        if (newOrderId && uploadFilesRef.current.length > 0) {
          try {
            await Promise.all(
              uploadFilesRef.current.map(file => {
                const formData = new FormData()
                formData.append('file', file)
                return demoApi.request({
                  url: `/workorders/${newOrderId}/images`,
                  method: 'POST',
                  data: formData,
                  headers: { 'Content-Type': null },
                })
              })
            )
          } catch (uploadError) {
            console.error('Photo upload failed:', uploadError)
          }
          uploadFilesRef.current = []
        }

        Toast.show({
          content: '工单创建成功',
          icon: 'success',
        })
        onSuccess()
        form.resetFields()
        setActivePriority(0)
        setSelectedRegion('')
        setCategoriesVisible(false)
        setSelectedDivisionPath([])
      } else {
        const errorMsg = (response as any).message || '创建失败'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('Failed to create work order:', error)
      Toast.show({
        content: '创建失败：' + (error instanceof Error ? error.message : '未知错误'),
        icon: 'fail',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    uploadFilesRef.current = []
    form.resetFields()
    setActivePriority(0)
    setSelectedRegion('')
    setCategoriesVisible(false)
    setSelectedDivisionPath([])
    onClose()
  }

  const handleSavePending = () => {
    const values = form.getFieldsValue()
    if (!values.title || values.title.length < 3) {
      Toast.show('请输入工单标题')
      return
    }
    addPendingOrder({
      id: 'pending_' + Date.now(),
      store_id: userInfo?.orgId || '',
      title: values.title,
      description: values.description || '',
      category_id: values.categoryId,
      photo_urls: values.photoUrls,
      priority: activePriority as 0 | 1 | 2,
      is_urgent: activePriority > 0,
      address_detail: values.addressDetail,
      appointment_type: appointmentType,
      created_at: new Date().toISOString(),
    })
    Toast.show('已存入待提交')
    handleClose()
    setCategoriesVisible(false)
    setSelectedDivisionPath([])
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
          initialValues={{
            priority: 0,
          }}
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <div style={{ paddingBottom: '100px' }}>
            {/* 工单标题 */}
            <Card style={{ borderRadius: '12px', marginBottom: '12px', background: '#fff' }}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>工单标题 *</div>
                <Form.Item
                  name="title"
                  noStyle
                  rules={[
                    { required: true, message: '请输入工单标题' },
                    { min: 5, message: '标题至少需要5个字' },
                  ]}
                >
                  <Input
                    placeholder="例如：二楼打印机卡纸"
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '12px 16px',
                    }}
                  />
                </Form.Item>
              </div>
            </Card>

            {/* 区域选择 */}
            <Card style={{ borderRadius: '12px', marginBottom: '12px', background: '#fff' }}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>区域 *</div>
                <Form.Item noStyle>
                  <div style={{ position: 'relative' }}>
                    <select
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        background: '#F9FAFB',
                        fontSize: '14px',
                        color: '#333',
                        appearance: 'none',
                        cursor: 'pointer',
                      }}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      value={selectedRegion}
                    >
                      <option value="">请选择区域</option>
                      {(regions || []).map((region: string) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#999',
                    }}>
                      ▼
                    </div>
                </div>
              </Form.Item>
            </div>
          </Card>

          {/* 分类选择 - only visible after region is selected */}
          {categoriesVisible && (
            <Card style={{ borderRadius: '12px', marginBottom: '12px', background: '#fff' }}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>分类 *</div>
                <Form.Item
                  name="categoryId"
                  noStyle
                  rules={[
                    { required: true, message: '请选择分类' },
                  ]}
                >
                  <div style={{ position: 'relative' }}>
                    <select
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        background: '#F9FAFB',
                        fontSize: '14px',
                        color: '#333',
                        appearance: 'none',
                        cursor: 'pointer',
                      }}
                      onChange={(e) => {
                        form.setFieldValue('categoryId', e.target.value)
                      }}
                    >
                      <option value="">请选择分类</option>
                      {(filteredCategories || []).map((cat: any) => (
                        <option key={cat?.id || cat?.name || ''} value={cat?.id || cat?.name || ''}>
                          {cat?.name || cat?.path || '未命名分类'}
                        </option>
                      ))}
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#999',
                    }}>
                      ▼
                    </div>
                  </div>
                </Form.Item>
              </div>
            </Card>
          )}

          {/* 故障描述 */}
          <Card style={{ borderRadius: '12px', marginBottom: '12px', background: '#fff' }}>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>故障描述 *</div>
              <Form.Item
                name="description"
                noStyle
                rules={[
                  { required: true, message: '请描述故障情况' },
                  { min: 10, message: '描述至少需要10个字' },
                ]}
              >
                <TextArea
                  placeholder="例如：二楼打印机卡纸，错误代码 E-05"
                  rows={5}
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    minHeight: '120px',
                  }}
                />
              </Form.Item>
            </div>
          </Card>

          {/* 照片上传 */}
          <Card style={{ borderRadius: '12px', marginBottom: '12px', background: '#fff' }}>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>上传照片</div>
              <Form.Item
                name="photoUrls"
                noStyle
              >
                <ImageUploader
                  upload={async (file: File): Promise<ImageUploadItem> => {
                    uploadFilesRef.current.push(file)
                    return {
                      url: URL.createObjectURL(file),
                      thumbnailUrl: URL.createObjectURL(file),
                    }
                  }}
                  multiple
                  maxCount={9}
                  accept="image/*"
                  deletable
                />
              </Form.Item>
            </div>
          </Card>

          {/* 详细地址 */}
          <Card style={{ borderRadius: '12px', marginBottom: '12px', background: '#fff' }}>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>详细地址</div>
              <Form.Item name="addressDetail" noStyle>
                <Input
                  placeholder='请输入详细地址'
                  readOnly={userInfo?.role === 'EMPLOYEE'}
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                />
              </Form.Item>
            </div>
          </Card>

          {/* 上门方式 */}
          <Card style={{ borderRadius: '12px', marginBottom: '12px', background: '#fff' }}>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>上门方式</div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="appointmentType"
                    checked={appointmentType === 1}
                    onChange={() => setAppointmentType(1)}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>指定上门时段（无需预约）</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="appointmentType"
                    checked={appointmentType === 2}
                    onChange={() => setAppointmentType(2)}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>要求提前预约</span>
                </label>
              </div>
            </div>
          </Card>

          <Button
            type="submit"
            loading={loading}
            style={{
              '--background-color': '#00B578',
              '--border-radius': '8px',
              height: '48px',
              fontSize: '16px',
              fontWeight: '500',
            }}
            block
          >
            创建工单
          </Button>

          <div style={{ marginTop: 8 }}>
            <Button
              block
              fill="none"
              style={{
                '--border-color': '#1677FF',
                '--border-radius': '8px',
                height: '40px',
                fontSize: '14px',
                color: '#1677FF',
              }}
              onClick={handleSavePending}
            >
              存入待提交
            </Button>
          </div>
        </div>
      </Form>
    }
  />
)
}
