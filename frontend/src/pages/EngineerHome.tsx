/**
 * Engineer Mobile Home Page
 * H5 style interface for engineers to view and manage their assigned work orders
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, Button, Tag, Empty, Toast, PullToRefresh, InfiniteScroll } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/factory'
import { useAuthStore } from '../store/useAuthStore'
import { initializeMockData, WorkOrder } from '../api/local'

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

function EngineerHome() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()

  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => {
    initializeMockData()
  }, [])

  const fetchOrders = useCallback(async (currentPage = 1, isRefresh = false) => {
    try {
      setLoading(true)
      const response = await api.workorder.list({
        page: currentPage,
        page_size: PAGE_SIZE,
        sort_by: 'created_at',
        sort_order: 'desc',
      }) as any

      const list = response.data?.list || []
      const total = response.data?.total || 0
      if (isRefresh || currentPage === 1) {
        setOrders(list as WorkOrder[])
      } else {
        setOrders((prev) => [...prev, ...list] as WorkOrder[])
      }

      const currentCount = (currentPage - 1) * PAGE_SIZE + list.length
      setHasMore(currentCount < total)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      Toast.show('获取工单列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchOrders(1, true)
  }, [fetchOrders])

  const handleRefresh = async () => {
    setRefreshing(true)
    setPage(1)
    await fetchOrders(1, true)
    setRefreshing(false)
  }

  const handleLoadMore = async () => {
    if (!hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    await fetchOrders(nextPage)
  }

  const handleOrderClick = (orderId: string) => {
    navigate(`/engineer/order/${orderId}`)
  }

  const getActionButtonText = (status: string): string => {
    switch (status) {
      case 'DISPATCHED':
        return '接单'
      case 'ACCEPTED':
        return '预约时间'
      case 'RESERVED':
        return '开始施工'
      case 'WORKING':
        return '完工离场'
      default:
        return '查看'
    }
  }

  const getCategoryText = (categoryPath: string): string => {
    if (!categoryPath) return ''
    const parts = categoryPath.split('>').map(s => s.trim())
    return parts[parts.length - 1] || categoryPath
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px',
        background: 'linear-gradient(135deg, #0033FF 0%, #0055FF 100%)',
        color: '#fff',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          我的工单
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          {userInfo?.displayName} · {userInfo?.orgName}
        </div>
      </div>

      {/* Order List */}
      <div style={{ padding: '16px' }}>
        <PullToRefresh onRefresh={handleRefresh}>
          {orders.length === 0 && !loading ? (
            <Empty description="暂无分配工单" />
          ) : (
            orders.map((order) => (
              <Card
                key={order.id}
                style={{ marginBottom: '12px' }}
                onClick={() => handleOrderClick(order.id)}
              >
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>{order.order_no}</span>
                    <Tag color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Tag>
                  </div>
                  {order.is_urgent && (
                    <Tag color="danger" style={{ marginTop: '8px' }}>加急</Tag>
                  )}
                </div>

                <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 500 }}>
                  {getCategoryText(order.category_path)}
                </div>

                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                  {order.brand_name}
                </div>

                <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  {order.address_detail}
                </div>

                {order.appointed_at && (
                  <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>
                    预约时间：{dayjs(order.appointed_at).format('MM-DD HH:mm')}
                  </div>
                )}

                {order.status !== 'FINISHED' && order.status !== 'CLOSED' && (
                  <Button
                    size="small"
                    fill="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOrderClick(order.id)
                    }}
                  >
                    {getActionButtonText(order.status)}
                  </Button>
                )}
              </Card>
            ))
          )}

          <InfiniteScroll loadMore={handleLoadMore} hasMore={hasMore} threshold={100} />
        </PullToRefresh>
      </div>
    </div>
  )
}

export default EngineerHome