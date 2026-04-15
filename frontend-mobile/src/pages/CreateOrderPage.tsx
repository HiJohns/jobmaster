import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Dialog, Toast, NavBar } from 'antd-mobile'
import { localWorkorderApi } from '../api/local/workorder'

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryPath, setCategoryPath] = useState('')
  const [brandName, setBrandName] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show('请输入工单标题')
      return
    }
    if (!description.trim()) {
      Toast.show('请输入故障描述')
      return
    }
    if (!categoryPath.trim()) {
      Toast.show('请输入设备分类')
      return
    }
    if (!brandName.trim()) {
      Toast.show('请输入品牌')
      return
    }
    if (!addressDetail.trim()) {
      Toast.show('请输入地址')
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
            category_path: categoryPath,
            brand_name: brandName,
            address_detail: addressDetail,
            is_urgent: isUrgent,
            photo_urls: [],
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
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>工单标题 *</div>
            <Input
              placeholder="请输入工单标题"
              value={title}
              onChange={setTitle}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>故障描述 *</div>
            <Input
              placeholder="请输入故障描述"
              value={description}
              onChange={setDescription}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px', minHeight: '80px' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>设备分类 *</div>
            <Input
              placeholder="如：消防门 > 卖场 > 甲级防火门"
              value={categoryPath}
              onChange={setCategoryPath}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>品牌 *</div>
            <Input
              placeholder="请输入品牌名称"
              value={brandName}
              onChange={setBrandName}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>地址 *</div>
            <Input
              placeholder="请输入详细地址"
              value={addressDetail}
              onChange={setAddressDetail}
              style={{ background: '#f5f5f5', borderRadius: '8px', padding: '12px' }}
            />
          </div>
        </Card>

        <Card style={{ borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ padding: '12px 0' }}>
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