import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Dialog, Toast, NavBar, ImageUploader, Picker } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { localWorkorderApi } from '../api/local/workorder'
import { demoApi } from '../api/demo'

interface Category {
  id: string
  name: string
  path: string
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // Region and Category states
  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [categoriesVisible, setCategoriesVisible] = useState(false)
  const [filteredCategories, setFilteredCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')

  const handlePhotoUpload = async (file: File): Promise<ImageUploadItem> => {
    const url = URL.createObjectURL(file)
    setPhotoUrls(prev => [...prev, url])
    return { url }
  }

  useEffect(() => {
    loadRegions()
  }, [])

  // Load regions
  const loadRegions = async () => {
    try {
      const response = await demoApi.getRegions()
      const data = response.data || response
      if (data.regions && Array.isArray(data.regions)) {
        setRegions(data.regions)
      }
    } catch (error) {
      console.error('Failed to load regions:', error)
      Toast.show('加载区域失败')
    }
  }

  // Handle region change
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    setCategoriesVisible(true)
    setSelectedCategory('')
    
    // Load categories for selected region
    loadCategoriesForRegion(region)
  }

  // Load categories for region
  const loadCategoriesForRegion = async (region: string) => {
    try {
      const response = await demoApi.getRegionCategories(region)
      const data = response.data || response
      if (data.categories && Array.isArray(data.categories)) {
        setFilteredCategories(data.categories)
      } else {
        setFilteredCategories([])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
      setFilteredCategories([])
    }
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!title.trim()) {
      Toast.show('请输入工单标题')
      return
    }
    if (!description.trim()) {
      Toast.show('请输入故障描述')
      return
    }
    if (!selectedRegion) {
      Toast.show('请选择区域')
      return
    }
    if (!selectedCategory) {
      Toast.show('请选择分类')
      return
    }

    setSubmitting(true)

    try {
      const requestData = {
        title,
        description,
        category_id: selectedCategory,
        category_path: selectedCategory,
        photo_urls: photoUrls,
        priority: isUrgent ? 1 : 0,
        is_urgent: isUrgent,
        address_detail: addressDetail,
        division_id: null, // Deprecated, keeping for compatibility
      }

      const response = await localWorkorderApi.create(requestData as any)
      
      if (response.code === 200 || response.success) {
        Toast.show({
          content: '工单创建成功',
          icon: 'success',
        })
        
        // Reset form
        setTitle('')
        setDescription('')
        setAddressDetail('')
        setIsUrgent(false)
        setPhotoUrls([])
        setSelectedRegion('')
        setSelectedCategory('')
        setCategoriesVisible(false)
        
        // Navigate back
        setTimeout(() => {
          navigate(-1)
        }, 1000)
      } else {
        throw new Error(response.message || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create work order:', error)
      Toast.show({
        content: '创建失败',
        icon: 'fail',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <NavBar
        back="返回"
        backArrow
        onBack={() => navigate(-1)}
        style={{
          '--height': '48px',
          '--border-bottom': '1px solid #eee',
          background: '#fff',
        }}
      >
        创建工单
      </NavBar>

      <div style={{ padding: '16px' }}>
        {/* 工单标题 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>工单标题 *</div>
            <Input
              placeholder="请输入工单标题"
              value={title}
              onChange={setTitle}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '8px',
              }}
            />
          </div>
        </Card>

        {/* 区域选择 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>区域 *</div>
            <Picker
              columns={[regions.map(r => ({ label: r, value: r }))]}
              visible={false}
              onConfirm={(value) => handleRegionChange(value[0])}
            >
              {(_, actions) => (
                <Button
                  block
                  onClick={() => actions.open()}
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    height: '40px',
                  }}
                >
                  {selectedRegion || '请选择区域'}
                </Button>
              )}
            </Picker>
          </div>
        </Card>

        {/* 分类选择 - shown after region is selected */}
        {categoriesVisible && (
          <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>分类 *</div>
              <Picker
                columns={[filteredCategories.map(c => ({ label: c, value: c }))]}
                visible={false}
                onConfirm={(value) => setSelectedCategory(value[0])}
              >
                {(_, actions) => (
                  <Button
                    block
                    onClick={() => actions.open()}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      height: '40px',
                    }}
                  >
                    {selectedCategory || '请选择分类'}
                  </Button>
                )}
              </Picker>
            </div>
          </Card>
        )}

        {/* 故障描述 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>故障描述 *</div>
            <Input
              placeholder="请描述故障情况"
              value={description}
              onChange={setDescription}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '8px',
                minHeight: '100px',
              }}
              textArea
              rows={4}
            />
          </div>
        </Card>

        {/* 照片上传 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>上传照片</div>
            <ImageUploader
              upload={handlePhotoUpload}
              multiple
              maxCount={9}
              accept="image/*"
              deletable
            />
          </div>
        </Card>

        {/* 详细地址 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>详细地址</div>
            <Input
              placeholder="请输入详细地址"
              value={addressDetail}
              onChange={setAddressDetail}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '8px',
              }}
            />
          </div>
        </Card>

        {/* 紧急程度 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '14px', color: '#333' }}>是否紧急</div>
            <div
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: isUrgent ? '#00B578' : '#E5E5E5',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.3s',
              }}
              onClick={() => setIsUrgent(!isUrgent)}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: isUrgent ? '22px' : '2px',
                  transition: 'left 0.3s',
                }}
              />
            </div>
          </div>
        </Card>

        <Button
          type="submit"
          loading={submitting}
          onClick={handleSubmit}
          style={{
            background: '#00B578',
            borderRadius: '8px',
            height: '48px',
            fontSize: '16px',
            fontWeight: '500',
          }}
          block
        >
          创建工单
        </Button>
      </div>
    </div>
  )
}
