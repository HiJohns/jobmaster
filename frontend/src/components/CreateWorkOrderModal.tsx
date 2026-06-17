import { useState, useEffect, useRef } from 'react'
import { Toast, ImageUploader } from 'antd-mobile'
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

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false)
  const [activePriority, setActivePriority] = useState<0 | 1 | 2>(0)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categoriesVisible, setCategoriesVisible] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [appointmentType, setAppointmentType] = useState(1)
  const uploadFilesRef = useRef<File[]>([])

  const [regions, setRegions] = useState<string[]>([])
  const [filteredCategories, setFilteredCategories] = useState<any[]>([])
  const [selectedDivisionPath, setSelectedDivisionPath] = useState<string[]>([])

  const { userInfo } = useAuthStore()

  useEffect(() => {
    if (visible && userInfo?.role === 'EMPLOYEE') {
      setAddressDetail('太阳宫中路12号凯德MALL3层')
    }
  }, [visible, userInfo?.role])

  useEffect(() => {
    if (visible) {
      loadRegions()
    }
  }, [visible])

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

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    setSelectedCategory('')
    setCategoriesVisible(true)
    loadCategoriesForRegion(region)
  }

  const loadCategoriesForRegion = async (region: string) => {
    try {
      const response = await api.region.getCategories(region)
      const data = response.data || response
      if (data.categories && Array.isArray(data.categories)) {
        setFilteredCategories(data.categories.map((cat: string, idx: number) => ({
          id: `${region}_${idx}`,
          name: cat,
          path: cat,
        })))
      } else {
        setFilteredCategories([])
      }
    } catch (error) {
      console.error('Failed to load categories for region:', error)
      setFilteredCategories([])
    }
  }

  const validate = (): string | null => {
    if (!title.trim()) return '请输入工单标题'
    if (title.trim().length < 5) return '标题至少需要5个字'
    if (!selectedRegion) return '请选择区域'
    if (!selectedCategory) return '请选择分类'
    if (!description.trim()) return '请输入故障描述'
    if (description.trim().length < 10) return '描述至少需要10个字'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      Toast.show({ content: err, icon: 'fail' })
      return
    }
    if (!userInfo?.orgId) {
      Toast.show({ content: '无法获取组织信息', icon: 'fail' })
      return
    }

    setLoading(true)
    try {
      const requestData: CreateWorkOrderRequest = {
        store_id: userInfo.orgId,
        title: title.trim(),
        description: description.trim(),
        photo_urls: [],
        priority: activePriority,
        is_urgent: activePriority > 0,
        address_detail: addressDetail,
        category_id: selectedCategory,
        division_id: selectedDivisionPath.length > 0 ? selectedDivisionPath[selectedDivisionPath.length - 1] : undefined,
        appointment_type: appointmentType,
      }

      const response = await api.workorder.create(requestData)

      if (response.code === 200) {
        const newOrderId = (response as any).data?.id || (response as any).id

        if (newOrderId && uploadFilesRef.current.length > 0) {
          try {
            await Promise.all(
              uploadFilesRef.current.map(file => {
                const formData = new FormData()
                formData.append('file', file)
                return (demoApi.request as any)({
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

        Toast.show({ content: '工单创建成功', icon: 'success' })
        onSuccess()
        resetForm()
      } else {
        throw new Error((response as any).message || '创建失败')
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

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setAddressDetail('')
    setSelectedRegion('')
    setSelectedCategory('')
    setCategoriesVisible(false)
    setUploadedPhotos([])
    setActivePriority(0)
    setAppointmentType(1)
    setSelectedDivisionPath([])
  }

  const handleClose = () => {
    uploadFilesRef.current = []
    resetForm()
    onClose()
  }

  const handleSavePending = () => {
    if (!title || title.trim().length < 3) {
      Toast.show({ content: '请输入工单标题', icon: 'fail' })
      return
    }
    addPendingOrder({
      id: 'pending_' + Date.now(),
      store_id: userInfo?.orgId || '',
      title: title.trim(),
      description: description.trim(),
      category_id: selectedCategory,
      photo_urls: uploadedPhotos,
      priority: activePriority as 0 | 1 | 2,
      is_urgent: activePriority > 0,
      address_detail: addressDetail,
      appointment_type: appointmentType,
      created_at: new Date().toISOString(),
    })
    Toast.show({ content: '已存入待提交', icon: 'success' })
    handleClose()
  }

  const handlePhotoUpload = async (file: File): Promise<ImageUploadItem> => {
    uploadFilesRef.current.push(file)
    const url = URL.createObjectURL(file)
    setUploadedPhotos(prev => [...prev, url])
    return { url, thumbnailUrl: url }
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)',
      padding: 16, fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div style={{
        background: '#F8FAFC', width: '100%', maxWidth: 480,
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        border: '1px solid #E2E8F0', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', background: '#fff', borderBottom: '1px solid #F1F5F9',
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E293B', letterSpacing: '0.5px' }}>
            创建新工单
          </h3>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, borderRadius: '50%', color: '#94A3B8', fontSize: 18, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Card 1: 基本情报 */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ borderLeft: '2px solid #991B1B', paddingLeft: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', textTransform: 'uppercase' }}>基本情报</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                工单标题 <span style={{ color: '#DC2626', fontSize: 10, background: '#FEF2F2', padding: '1px 6px', borderRadius: 3, fontWeight: 400, marginLeft: 4 }}>必須</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例：二楼制冰机漏水"
                style={{
                  width: '100%', fontSize: 13, padding: '8px 12px',
                  background: '#F1F5F9', border: '1px solid #E2E8F0',
                  borderRadius: 6, outline: 'none',
                  color: '#1E293B', boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F1F5F9' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                所在区域 <span style={{ color: '#DC2626', fontSize: 10, background: '#FEF2F2', padding: '1px 6px', borderRadius: 3, fontWeight: 400, marginLeft: 4 }}>必須</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedRegion}
                  onChange={e => handleRegionChange(e.target.value)}
                  style={{
                    width: '100%', fontSize: 13, padding: '8px 12px',
                    background: '#F1F5F9', border: '1px solid #E2E8F0',
                    borderRadius: 6, outline: 'none',
                    color: selectedRegion ? '#1E293B' : '#94A3B8',
                    appearance: 'none', cursor: 'pointer', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F1F5F9' }}
                >
                  <option value="" style={{ color: '#94A3B8' }}>请选择区域</option>
                  {(regions || []).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8', fontSize: 11 }}>▼</div>
              </div>
            </div>

            {categoriesVisible && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  设备分类 <span style={{ color: '#DC2626', fontSize: 10, background: '#FEF2F2', padding: '1px 6px', borderRadius: 3, fontWeight: 400, marginLeft: 4 }}>必須</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%', fontSize: 13, padding: '8px 12px',
                      background: '#F1F5F9', border: '1px solid #E2E8F0',
                      borderRadius: 6, outline: 'none',
                      color: selectedCategory ? '#1E293B' : '#94A3B8',
                      appearance: 'none', cursor: 'pointer', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F1F5F9' }}
                  >
                    <option value="" style={{ color: '#94A3B8' }}>请选择分类</option>
                    {(filteredCategories || []).map(cat => (
                      <option key={cat?.id || cat?.name || ''} value={cat?.id || cat?.name || ''}>
                        {cat?.name || cat?.path || '未命名分類'}
                      </option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8', fontSize: 11 }}>▼</div>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                故障描述 <span style={{ color: '#DC2626', fontSize: 10, background: '#FEF2F2', padding: '1px 6px', borderRadius: 3, fontWeight: 400, marginLeft: 4 }}>必須</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="请描述详细的故障情况&#10;例：错误码 E-05 闪烁，排水口不断溢水。"
                style={{
                  width: '100%', fontSize: 13, padding: '8px 12px',
                  background: '#F1F5F9', border: '1px solid #E2E8F0',
                  borderRadius: 6, outline: 'none', resize: 'none',
                  color: '#1E293B', lineHeight: 1.6, boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F1F5F9' }}
              />
            </div>
          </div>

          {/* Card 2: 现场状况 */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ borderLeft: '2px solid #475569', paddingLeft: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', textTransform: 'uppercase' }}>现场状况 & 位置</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>上传现场照片</label>
              <ImageUploader
                upload={handlePhotoUpload}
                value={uploadedPhotos.map(u => ({ url: u }))}
                onChange={items => setUploadedPhotos(items.map(i => i.url))}
                multiple
                maxCount={9}
                accept="image/*"
                deletable
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>详细地址</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={addressDetail}
                  onChange={e => setAddressDetail(e.target.value)}
                  placeholder="请输入店铺的准确地址、楼层位置"
                  readOnly={userInfo?.role === 'EMPLOYEE'}
                  style={{
                    width: '100%', fontSize: 13, padding: '8px 12px',
                    background: userInfo?.role === 'EMPLOYEE' ? '#F8FAFC' : '#F1F5F9',
                    border: '1px solid #E2E8F0', borderRadius: 6, outline: 'none',
                    color: '#1E293B', boxSizing: 'border-box',
                  }}
                  onFocus={e => { if (!e.target.readOnly) { e.target.style.borderColor = '#94A3B8'; e.target.style.background = '#fff' } }}
                  onBlur={e => { if (!e.target.readOnly) { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F1F5F9' } }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14, pointerEvents: 'none' }}>📍</span>
              </div>
            </div>
          </div>

          {/* Card 3: 紧急度 + 上门方式 */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ borderLeft: '2px solid #475569', paddingLeft: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', textTransform: 'uppercase' }}>紧急度设定</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>处理优先级</label>
              <div style={{ display: 'flex', background: '#F1F5F9', padding: 2, borderRadius: 8, border: '1px solid rgba(226,232,240,0.3)' }}>
                <button
                  type="button"
                  onClick={() => setActivePriority(0)}
                  style={{
                    flex: 1, fontSize: 12, padding: '8px 0', fontWeight: activePriority === 0 ? 700 : 500,
                    borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: activePriority === 0 ? '#fff' : 'transparent',
                    color: activePriority === 0 ? '#57534E' : '#64748B',
                    boxShadow: activePriority === 0 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  通常
                </button>
                <button
                  type="button"
                  onClick={() => setActivePriority(1)}
                  style={{
                    flex: 1, fontSize: 12, padding: '8px 0', fontWeight: activePriority === 1 ? 700 : 500,
                    borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: activePriority === 1 ? '#F59E0B' : 'transparent',
                    color: activePriority === 1 ? '#fff' : '#64748B',
                    boxShadow: activePriority === 1 ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  加急
                </button>
                <button
                  type="button"
                  onClick={() => setActivePriority(2)}
                  style={{
                    flex: 1, fontSize: 12, padding: '8px 0', fontWeight: activePriority === 2 ? 700 : 500,
                    borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: activePriority === 2 ? '#DC2626' : 'transparent',
                    color: activePriority === 2 ? '#fff' : '#64748B',
                    boxShadow: activePriority === 2 ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  紧急
                </button>
              </div>
            </div>

            {activePriority > 0 && (
              <div style={{
                background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8,
                padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start',
                fontSize: 12, color: '#92400E', marginBottom: 14,
              }}>
                <span style={{ fontSize: 14, color: '#D97706', flexShrink: 0 }}>⚠️</span>
                <div>
                  <p style={{ fontWeight: 700, margin: 0, marginBottom: 2 }}>SLA 响应警告：</p>
                  <p style={{ margin: 0, color: '#A16207', lineHeight: 1.5 }}>
                    已变更优先级。根据 SLA 规定，工程师需在 4 小时内到达现场。
                  </p>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>上门方式</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#334155' }}>
                  <input type="radio" name="apt" checked={appointmentType === 1} onChange={() => setAppointmentType(1)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }} />
                  指定上门时段（无需预约）
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#334155' }}>
                  <input type="radio" name="apt" checked={appointmentType === 2} onChange={() => setAppointmentType(2)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }} />
                  要求提前预约
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', background: '#fff', borderTop: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
        }}>
          <button onClick={handleSavePending} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 700,
            color: '#64748B', background: 'none', border: 'none',
            borderRadius: 6, cursor: 'pointer',
          }}>
            存入待提交
          </button>
          <button onClick={handleClose} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 700,
            color: '#64748B', background: 'none', border: 'none',
            borderRadius: 6, cursor: 'pointer',
          }}>
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '8px 24px', fontSize: 12, fontWeight: 700,
              color: '#fff', background: '#991B1B', border: 'none',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, letterSpacing: '0.5px',
              height: 38, lineHeight: '22px',
            }}
          >
            {loading ? '创建中...' : '创建工单'}
          </button>
        </div>
      </div>
    </div>
  )
}
