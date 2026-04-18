import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Dialog, Toast, NavBar, ImageUploader } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { localWorkorderApi } from '../api/local/workorder'
import { demoApi } from '../api/demo'

interface Category {
  id: string
  name: string
  path: string
  children?: Category[]
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedCategoryPath, setSelectedCategoryPath] = useState('')

  const handlePhotoUpload = async (file: File): Promise<ImageUploadItem> => {
    const url = URL.createObjectURL(file)
    setPhotoUrls(prev => [...prev, url])
    return { url }
  }

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await demoApi.request({
          url: '/categories',
          method: 'GET',
        })
        const data = res.data?.data || res.data || res
        if (Array.isArray(data)) {
          setCategories(data as Category[])
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
      }
    }
    loadCategories()
  }, [])

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show('请输入工单标题')
      return
    }
    if (!description.trim()) {
      Toast.show('请输入故障描述')
      return
    }
    if (!addressDetail.trim()) {
      Toast.show('请输入地址')
      return
    }
    if (!selectedCategoryId) {
      Toast.show('请选择工单分类')
      return
    }

    Dialog.confirm({
      content: isUrgent ? '确认创建加急工单？' : '确认创建工单？',
      onConfirm: async () => {
        try {
          setSubmitting(true)
          await localWorkorderApi.create({
            title,
            description,
            address_detail: addressDetail,
            is_urgent: isUrgent,
            photo_urls: photoUrls,
            category_id: selectedCategoryId,
            category_path: selectedCategoryPath,
          })
          Toast.show('工单创建成功')
          navigate(-1)
        } catch (error) {
          console.error('Create order failed:', error)
          Toast.show('创建失败')
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingLeft: '16px', paddingRight: '16px' }}>
      <NavBar onBack={() => navigate(-1)} style={{ background: '#fff' }}>
        创建工单
      </NavBar>

      <div style={{ padding: '12px 0' }}>
        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>工单标题 *</div>
            <Input
              placeholder="请输入工单标题"
              value={title}
              onChange={setTitle}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px', width: '100%' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>故障描述 *</div>
            <Input
              placeholder="请输入故障描述"
              value={description}
              onChange={setDescription}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px', minHeight: '80px', width: '100%' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>上传照片</div>
            <ImageUploader
              upload={handlePhotoUpload}
              multiple
              maxCount={9}
              accept="image/*"
              showUpload={photoUrls.length < 9}
              deletable
              onDelete={(item: ImageUploadItem) => {
                setPhotoUrls(prev => prev.filter(url => url !== item.url))
                return Promise.resolve(true)
              }}
              style={{
                '--cell-size': '80px',
                '--gap': '8px'
              }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>地址 *</div>
            <Input
              placeholder="请输入详细地址"
              value={addressDetail}
              onChange={setAddressDetail}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px', width: '100%' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>工单分类 *</div>
            <select
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                background: '#F9FAFB',
                fontSize: '14px',
                color: selectedCategoryPath ? '#333' : '#999',
              }}
              value={selectedCategoryId}
              onChange={(e) => {
                const selected = e.target.value
                setSelectedCategoryId(selected)
                const cat = categories.find(c => c.id === selected)
                setSelectedCategoryPath(cat?.path || cat?.name || '')
              }}
            >
              <option value="">请选择分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.path || cat.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '16px' }}>设为加急</div>
              <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
            </div>
          </div>
        </Card>

        <Button block size="large" color="primary" onClick={handleSubmit} loading={submitting} style={{ marginTop: '12px' }}>
          提交工单
        </Button>
      </div>
    </div>
  )
}