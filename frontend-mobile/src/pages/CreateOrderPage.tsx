import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Toast, NavBar, ImageUploader, Picker, TextArea } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { demoApi } from '../api/demo'
import { useAuthStore } from '../store/useAuthStore'
import { addPendingOrder } from '../utils/pendingOrders'

interface Contractor {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  code: string
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const defaultAddress = userInfo?.orgAddress || ''
  const [addressDetail, setAddressDetail] = useState(defaultAddress)
  const [isUrgent, setIsUrgent] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [appointmentType, setAppointmentType] = useState(1)
  
  // Time slots for appointment_type=1
  const [timeSlots, setTimeSlots] = useState<{ days: string; start_time: string; end_time: string }[]>([
    { days: 'weekday', start_time: '09:00', end_time: '18:00' },
  ])
  
  // Time picker state
  const hourOptions = Array.from({length: 24}, (_, i) => ({
    label: `${String(i).padStart(2, '0')}时`,
    value: String(i).padStart(2, '0')
  }))
  const minuteOptions = [0, 15, 30, 45].map(m => ({
    label: `${String(m).padStart(2, '0')}分`,
    value: String(m).padStart(2, '0')
  }))
  const [activeTimePicker, setActiveTimePicker] = useState<{index: number; field: 'start_time' | 'end_time'} | null>(null)
  
  // Region and Category states
  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [categoriesVisible, setCategoriesVisible] = useState(false)
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
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
      if (data.organizations && Array.isArray(data.organizations)) {
        const contractorList: Contractor[] = data.organizations.map((org: any) => ({
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
        const cats: Category[] = data.categories.map((c: any) => ({
          id: c.id || '',
          name: c.name || '',
          code: c.code || '',
        }))
        setFilteredCategories(cats)
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
    if (appointmentType === 1) {
      const invalidSlot = timeSlots.find(s => !s.start_time || !s.end_time)
      if (invalidSlot) {
        Toast.show('请填写所有上门时段的起止时间')
        return
      }
    }

    setSubmitting(true)

    try {
      const selectedCategoryName = selectedCategory ? filteredCategories.find(c => c.id === selectedCategory)?.name || '' : ''

      const requestData = {
        title,
        description,
        category_id: selectedCategory,
        category_path: selectedCategoryName,
        photo_urls: photoUrls,
        priority: isUrgent ? 1 : 0,
        is_urgent: isUrgent,
        address_detail: addressDetail,
        division_id: null,
        appointment_type: appointmentType,
        time_slots: appointmentType === 1 ? timeSlots : undefined,
      }

      const response = await demoApi.createWorkOrder(requestData) as any
      
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

  const handleSavePending = () => {
    if (!title || title.length < 3) {
      Toast.show('请输入工单标题')
      return
    }
    addPendingOrder({
      id: 'pending_' + Date.now(),
      title,
      description,
      category_id: selectedCategory,
      photo_urls: photoUrls,
      priority: isUrgent ? 1 : 0,
      is_urgent: isUrgent,
      address_detail: addressDetail,
      appointment_type: appointmentType,
      time_slots: appointmentType === 1 ? timeSlots : undefined,
      created_at: new Date().toISOString(),
    })
    Toast.show('已存入待提交')
    navigate(-1)
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
                width: '100%',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '8px',
              }}
            />
          </div>
        </Card>

        {/* 位置信息：地址 + 区域 + 分类 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>详细地址</div>
            <Input
              placeholder="请输入详细地址"
              value={addressDetail}
              onChange={setAddressDetail}
              readOnly={userInfo?.role === 'EMPLOYEE'}
              style={{
                width: '100%',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '8px',
              }}
            />

            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', marginTop: '16px' }}>上门方式</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" checked={appointmentType === 1} onChange={() => setAppointmentType(1)} />
                <span style={{ fontSize: '13px', color: '#333' }}>指定上门时段</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" checked={appointmentType === 2} onChange={() => setAppointmentType(2)} />
                <span style={{ fontSize: '13px', color: '#333' }}>要求提前预约</span>
              </label>
            </div>

            {appointmentType === 1 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>上门时段</div>
                {timeSlots.map((slot, index) => (
                  <div key={index} style={{ marginBottom: '10px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '8px 10px' }}>
                    {/* Row 1: day type + delete */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <select
                        value={slot.days}
                        onChange={(e) => {
                          const updated = [...timeSlots]
                          updated[index] = { ...updated[index], days: e.target.value }
                          setTimeSlots(updated)
                        }}
                        style={{ flex: 1, padding: '6px 8px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', fontSize: '13px' }}
                      >
                        <option value="weekday">工作日</option>
                        <option value="weekend">周末</option>
                        <option value="everyday">每天</option>
                      </select>
                      <span
                        onClick={() => setTimeSlots(timeSlots.filter((_, i) => i !== index))}
                        style={{ color: '#FF4D4F', cursor: 'pointer', fontSize: '18px', padding: '4px 4px 4px 12px' }}
                      >
                        ×
                      </span>
                    </div>
                    {/* Row 2: time pickers */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div
                        onClick={() => setActiveTimePicker({ index, field: 'start_time' })}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', textAlign: 'center', fontSize: '15px', fontWeight: 500, color: '#333' }}
                      >
                        {slot.start_time}
                      </div>
                      <span style={{ color: '#999', fontSize: '14px' }}>—</span>
                      <div
                        onClick={() => setActiveTimePicker({ index, field: 'end_time' })}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', textAlign: 'center', fontSize: '15px', fontWeight: 500, color: '#333' }}
                      >
                        {slot.end_time}
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  size="small"
                  onClick={() => setTimeSlots([...timeSlots, { days: 'weekday', start_time: '09:00', end_time: '18:00' }])}
                  style={{ fontSize: '12px', padding: '4px 12px', color: '#1677FF', borderColor: '#1677FF' }}
                  fill="none"
                >
                  + 添加上门时段
                </Button>
                {/* Time picker */}
                {activeTimePicker && (
                  <Picker
                    columns={[hourOptions, minuteOptions]}
                    visible={true}
                    onClose={() => setActiveTimePicker(null)}
                    onConfirm={(val) => {
                      const time = `${val[0]}:${val[1]}`
                      const updated = [...timeSlots]
                      updated[activeTimePicker.index] = { ...updated[activeTimePicker.index], [activeTimePicker.field]: time }
                      setTimeSlots(updated)
                      setActiveTimePicker(null)
                    }}
                  />
                )}
              </div>
            )}

            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', marginTop: '16px' }}>区域 *</div>
            <Button
              block
              onClick={() => setRegionPickerVisible(true)}
              style={{
                width: '100%',
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
                    width: '100%',
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    height: '40px',
                  }}
                >
                  {selectedCategory ? filteredCategories.find(c => c.id === selectedCategory)?.name || '请选择分类' : '请选择分类'}
                </Button>
                <Picker
                  columns={[filteredCategories.map((c, i) => ({ label: c.name, value: c.id, key: `category-${i}` }))]}
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

        {/* 故障描述 + 照片 */}
        <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>故障描述 *</div>
            <TextArea
              placeholder="请描述故障情况"
              value={description}
              onChange={setDescription}
              style={{
                width: '100%',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '8px',
                minHeight: '100px',
              }}
            />

            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', marginTop: '16px' }}>上传照片</div>
            <ImageUploader
              upload={handlePhotoUpload}
              multiple
              maxCount={9}
              accept="image/*"
              deletable
            />
          </div>
        </Card>

        {/* 指派和紧急程度 */}
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
                    width: '100%',
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    height: '40px',
                  }}
                >
                  {selectedContractor ? contractors.find(c => c.id === selectedContractor)?.name || '请选择劳务公司' : '请选择劳务公司'}
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

        <Button
          onClick={handleSavePending}
          style={{
            background: '#fff',
            borderRadius: '8px',
            height: '44px',
            fontSize: '15px',
            fontWeight: '400',
            border: '1px solid #1677FF',
            color: '#1677FF',
            marginTop: 8,
          }}
          block
        >
          存入待提交
        </Button>
      </div>
    </div>
  )
}
