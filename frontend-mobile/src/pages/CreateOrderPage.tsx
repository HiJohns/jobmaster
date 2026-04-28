import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Toast, NavBar, ImageUploader, Picker } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { api } from '../api'
import { demoApi } from '../api/demo'
import { useAuthStore } from '../store/useAuthStore'

interface Contractor {
  id: string
  name: string
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()
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
  
  // Contractor states (for Branch role)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [selectedContractor, setSelectedContractor] = useState<string>('')
  const [contractorPickerVisible, setContractorPickerVisible] = useState(false)
  
  // Picker visibility states
  const [regionPickerVisible, setRegionPickerVisible] = useState(false)
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false)

  // Check if user is Branch role
  const isBranchRole = userInfo?.role === 'BRANCH_ADMIN' || userInfo?.role === 'EMPLOYEE'

  const handlePhotoUpload = async (file: File): Promise<ImageUploadItem> => {
    const url = URL.createObjectURL(file)
    setPhotoUrls(prev => [...prev, url])
    return { url }
  }

  useEffect(() => {
    loadRegions()
    if (isBranchRole) {
      loadContractors()
    }
  }, [isBranchRole])

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

  // Load contractors for Branch role
  const loadContractors = async () => {
    try {
      const response = await demoApi.getDispatchableTargets()
      const data = response.data || response
      if (data.list && Array.isArray(data.list)) {
        const contractorList: Contractor[] = data.list.map((org: any) => ({
          id: org.id,
          name: org.name,
        }))
        setContractors(contractorList)
        // Auto-select first contractor
        if (contractorList.length > 0) {
          setSelectedContractor(contractorList[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load contractors:', error)
      Toast.show('加载指派目标失败')
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

      const response = await api.workorder.create(requestData) as any
      
      if (response.code === 200 || response.id) {
        const workOrderId = response.id || response.data?.id
        
        // If Branch role and contractor selected, dispatch the order
        if (isBranchRole && selectedContractor && workOrderId) {
          try {
            await demoApi.dispatchWorkOrder(workOrderId, selectedContractor)
            Toast.show({
              content: '工单已指派给劳务公司',
              icon: 'success',
            })
          } catch (dispatchError) {
            console.error('Failed to dispatch work order:', dispatchError)
            Toast.show({
              content: '工单创建成功，但指派失败',
              icon: 'fail',
            })
          }
        } else {
          Toast.show({
            content: '工单创建成功',
            icon: 'success',
          })
        }
        
        // Reset form
        setTitle('')
        setDescription('')
        setAddressDetail('')
        setIsUrgent(false)
        setPhotoUrls([])
        setSelectedRegion('')
        setSelectedCategory('')
        setCategoriesVisible(false)
        if (isBranchRole && contractors.length > 0) {
          setSelectedContractor(contractors[0]?.id || '')
        }
        
        // Navigate back
        setTimeout(() => {
          navigate(-1)
        }, 1000)
      } else {
        throw new Error('创建失败')
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

        {/* 区域和分类选择 - 合并在一个 Card */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>区域 *</div>
            <Button
              block
              onClick={() => setRegionPickerVisible(true)}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                height: '40px',
              }}
            >
              {selectedRegion || '请选择区域'}
            </Button>
            <Picker
              columns={[regions.map(r => ({ label: r, value: r, key: r }))]}
              visible={regionPickerVisible}
              onClose={() => setRegionPickerVisible(false)}
              onConfirm={(value) => {
                if (value && value[0]) {
                  handleRegionChange(String(value[0]))
                }
                setRegionPickerVisible(false)
              }}
            />

            {categoriesVisible && (
              <>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', marginTop: '16px' }}>分类 *</div>
                <Button
                  block
                  onClick={() => setCategoryPickerVisible(true)}
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    height: '40px',
                  }}
                >
                  {selectedCategory || '请选择分类'}
                </Button>
                <Picker
                  columns={[filteredCategories.map(c => ({ label: c, value: c, key: c }))]}
                  visible={categoryPickerVisible}
                  onClose={() => setCategoryPickerVisible(false)}
                  onConfirm={(value) => {
                    if (value && value[0]) {
                      setSelectedCategory(String(value[0]))
                    }
                    setCategoryPickerVisible(false)
                  }}
                />
              </>
            )}
          </div>
        </Card>

        {/* 区域和分类选择 - 合并在一个 Card */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>区域 *</div>
            <Button
              block
              onClick={() => setRegionPickerVisible(true)}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                height: '40px',
              }}
            >
              {selectedRegion || '请选择区域'}
            </Button>
            <Picker
              columns={[regions.map((r, i) => ({ label: r, value: r, key: `region-${i}` }))]}
              visible={regionPickerVisible}
              onClose={() => setRegionPickerVisible(false)}
              onConfirm={(value) => {
                if (value && value[0]) {
                  handleRegionChange(String(value[0]))
                }
                setRegionPickerVisible(false)
              }}
            />

            {categoriesVisible && (
              <>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', marginTop: '16px' }}>分类 *</div>
                <Button
                  block
                  onClick={() => setCategoryPickerVisible(true)}
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    height: '40px',
                  }}
                >
                  {selectedCategory || '请选择分类'}
                </Button>
                <Picker
                  columns={[filteredCategories.map((c, i) => ({ label: c, value: c, key: `category-${i}` }))]}
                  visible={categoryPickerVisible}
                  onClose={() => setCategoryPickerVisible(false)}
                  onConfirm={(value) => {
                    if (value && value[0]) {
                      setSelectedCategory(String(value[0]))
                    }
                    setCategoryPickerVisible(false)
                  }}
                />
              </>
            )}
          </div>
        </Card>

        {/* 指派和紧急程度 - 合并在一个 Card */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            {/* 指派给 - 仅 Branch 角色显示 */}
            {isBranchRole && contractors.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>指派给</div>
                <Button
                  block
                  onClick={() => setContractorPickerVisible(true)}
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    height: '40px',
                  }}
                >
                  {selectedContractor || '请选择劳务公司'}
                </Button>
                <Picker
                  columns={[contractors.map((c, i) => ({ label: c.name, value: c.id, key: `contractor-${i}` }))]}
                  visible={contractorPickerVisible}
                  onClose={() => setContractorPickerVisible(false)}
                  onConfirm={(value) => {
                    if (value && value[0]) {
                      setSelectedContractor(String(value[0]))
                    }
                    setContractorPickerVisible(false)
                  }}
                />
              </div>
            )}

            {/* 是否紧急 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          </div>
        </Card>

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
