/**
 * Create Work Order Modal Component v2.1
 * 调整：区域选择移到分类之上，分类联动显示
 */

import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Toast,
  ImageUploader,
  Button,
  TextArea,
  Card,
  Cascader,
} from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { LocationOutline } from 'antd-mobile-icons'
import { api } from '../api/factory'
import { CreateWorkOrderRequest } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'

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

  // Region and Category states
  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [categoriesVisible, setCategoriesVisible] = useState<boolean>(false)
  const [filteredCategories, setFilteredCategories] = useState<any[]>([])
  
  // Division state (kept for backward compatibility)
  const [divisionData, setDivisionData] = useState<any[]>([])
  const [selectedDivisionPath, setSelectedDivisionPath] = useState<string[]>([])
  
  const { userInfo } = useAuthStore()

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
  // Load categories for selected region
  const loadCategoriesForRegion = async (region: string) => {
    try {
      const response = await demoApi.request({
        url: `/regions/${encodeURIComponent(region)}/categories`,
        method: "GET",
      });
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
        photo_urls: values.photoUrls || [],
        priority: activePriority || 0,
        is_urgent: (activePriority || 0) > 0,
        address_detail: values.addressDetail,
        category_id: values.categoryId,
        coordinates: values.coordinates,
        division_id: selectedDivisionPath.length > 0 ? selectedDivisionPath[selectedDivisionPath.length - 1] : undefined,
      }

      const response = await api.workorder.create(requestData)
      
      if (response.code === 200) {
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
        throw new Error(response.message || '创建失败')
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

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="创建工单"
      contentStyle={{ padding: '16px' }}
    >
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
        </div>
      </Form>
    </Modal>
  )
}
