/**
 * Engineer Order Detail Page
 * H5 style page for engineers to view order details and take actions
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, List, Tag, Button, Dialog, Toast } from 'antd-mobile'
import dayjs from 'dayjs'
import { api } from '../api/factory'
import { WorkOrder, WorkRecord } from '../api/local'
import { Modal, Input, ImageUploader } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'warning',
  DISPATCHED: 'primary',
  ACCEPTED: 'success',
  RESERVED: 'warning',
  WORKING: 'danger',
  FINISHED: 'default',
  CLOSED: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待接单',
  DISPATCHED: '已指派',
  ACCEPTED: '已接单',
  RESERVED: '已预约',
  WORKING: '施工中',
  FINISHED: '待验收',
  CLOSED: '已完成',
}

function EngineerOrderDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [order, setOrder] = useState<WorkOrder | null>(null)
  const [logs, setLogs] = useState<WorkRecord[]>([])
  const [, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [arriveModalVisible, setArriveModalVisible] = useState(false)
  const [arriveComment, setArriveComment] = useState('')
  const [arrivePhotos, setArrivePhotos] = useState<string[]>([])

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      try {
        setLoading(true)
        const response = await api.workorder.get(id) as any
        setOrder(response.data)
        setLogs(response.data?.logs || [])
      } catch (error) {
        console.error('Failed to fetch order:', error)
        Toast.show('获取工单详情失败')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [id])

  const handleAccept = async () => {
    if (!id) return
    Dialog.confirm({
      content: '确认接单？',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await api.workorder.accept(id, dayjs().add(1, 'day').toISOString())
          Toast.show('接单成功')
          navigate(-1)
        } catch (error) {
          console.error('Accept failed:', error)
          Toast.show('接单失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleReserve = async () => {
    if (!id) return
    try {
      setActionLoading(true)
      const appointmentTime = dayjs().add(1, 'day').hour(10).minute(0).toISOString()
      await api.workorder.accept(id, appointmentTime)
      Toast.show('预约时间已设置')
      navigate(-1)
    } catch (error) {
      console.error('Reserve failed:', error)
      Toast.show('设置预约时间失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartWork = async () => {
    if (!id) return
    try {
      setActionLoading(true)
      await api.workorder.arrive(id, arrivePhotos, arriveComment)
      Toast.show('开始施工')
      setArriveModalVisible(false)
      setArriveComment('')
      setArrivePhotos([])
      navigate(-1)
    } catch (error) {
      console.error('Start work failed:', error)
      Toast.show('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!id) return
    Dialog.confirm({
      title: '完工离场',
      content: '请确认已完成所有维修工作',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await api.workorder.finish(
            id,
            '维修已完成',
            [],
            100,
            0,
            0
          )
          Toast.show('完工已提交')
          navigate(-1)
        } catch (error) {
          console.error('Finish failed:', error)
          Toast.show('提交失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  if (!order) {
    return (
      <div style={{ padding: '16px' }}>
        <span>加载中...</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        background: '#fff',
        borderBottom: '1px solid #eee',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>{order.order_no}</span>
          <Tag color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Tag>
        </div>
        {order.is_urgent && (
          <Tag color="danger" style={{ marginTop: '8px' }}>加急</Tag>
        )}
      </div>

      {/* Order Info */}
      <Card title="工单信息" style={{ margin: '16px', marginBottom: 0 }}>
        {order.appointment_type === 1 && (
          <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
            本工单已指定上门时段，无需预约，可直接到场签到
          </div>
        )}
        {order.appointment_type === 2 && (
          <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
            本工单要求提前预约，请先设置预约时间
          </div>
        )}
        <List>
          <List.Item>
            <div style={{ color: '#999' }}>故障分类</div>
            <div>{Array.isArray(order.category_path) ? order.category_path.join(' > ') : order.category_path}</div>
          </List.Item>
          <List.Item>
            <div style={{ color: '#999' }}>品牌</div>
            <div>{order.brand_name}</div>
          </List.Item>
          <List.Item>
            <div style={{ color: '#999' }}>故障描述</div>
            <div>{order.description}</div>
          </List.Item>
          <List.Item>
            <div style={{ color: '#999' }}>地址</div>
            <div>{order.address_detail}</div>
          </List.Item>
          {order.appointed_at && (
            <List.Item>
              <div style={{ color: '#999' }}>预约时间</div>
              <div>{dayjs(order.appointed_at).format('YYYY-MM-DD HH:mm')}</div>
            </List.Item>
          )}
        </List>
      </Card>

      {/* Action Buttons */}
      <div style={{ padding: '16px' }}>
        {order.status === 'DISPATCHED' && order.appointment_type !== 1 && (
          <Button block color="primary" onClick={handleAccept} loading={actionLoading}>
            接单
          </Button>
        )}
        {order.status === 'DISPATCHED' && order.appointment_type === 1 && (
          <Button block color="primary" onClick={() => setArriveModalVisible(true)} loading={actionLoading}>
            到场签到
          </Button>
        )}
        {order.status === 'ACCEPTED' && order.appointment_type !== 1 && (
          <Button block color="primary" onClick={handleReserve} loading={actionLoading}>
            设置预约时间
          </Button>
        )}
        {order.status === 'ACCEPTED' && order.appointment_type === 1 && (
          <Button block color="primary" onClick={() => setArriveModalVisible(true)} loading={actionLoading}>
            开始施工
          </Button>
        )}
        {order.status === 'RESERVED' && (
          <Button block color="primary" onClick={() => setArriveModalVisible(true)} loading={actionLoading}>
            开始施工
          </Button>
        )}
        {order.status === 'WORKING' && (
          <Button block color="primary" onClick={handleFinish} loading={actionLoading}>
            完工离场
          </Button>
        )}
        {order.status === 'FINISHED' && (
          <div style={{ textAlign: 'center', color: '#999', padding: '16px' }}>
            已完工，等待验收
          </div>
        )}
        {order.status === 'CLOSED' && (
          <div style={{ textAlign: 'center', color: '#999', padding: '16px' }}>
            工单已完成
          </div>
        )}
      </div>

      {/* Timeline */}
      {logs.length > 0 && (
        <Card title="操作记录" style={{ margin: '16px', marginTop: 0 }}>
          {logs.map((log, idx) => (
            <div key={idx} style={{ padding: '8px 0', borderBottom: idx < logs.length - 1 ? '1px solid #eee' : 'none' }}>
              <div style={{ fontWeight: 500 }}>{log.action}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{log.details}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {log.user_name} · {dayjs(log.created_at).format('MM-DD HH:mm')}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Arrive Modal */}
      <Modal
        visible={arriveModalVisible}
        onClose={() => setArriveModalVisible(false)}
        title="开始施工"
        content={
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>施工前拍照</div>
              <ImageUploader
                upload={async (file: File): Promise<ImageUploadItem> => ({
                  url: URL.createObjectURL(file),
                  thumbnailUrl: URL.createObjectURL(file),
                })}
                value={arrivePhotos.map(u => ({ url: u }))}
                onChange={items => setArrivePhotos(items.map(i => i.url))}
                multiple
                maxCount={9}
                accept="image/*"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>备注</div>
              <Input
                placeholder="请输入施工前备注"
                value={arriveComment}
                onChange={setArriveComment}
              />
            </div>
            <Button
              block
              color="primary"
              loading={actionLoading}
              onClick={handleStartWork}
              style={{ height: 44, fontSize: 16 }}
            >
              确认开始施工
            </Button>
          </div>
        }
      />
    </div>
  )
}

export default EngineerOrderDetail