/**
 * Contractor Home Page
 * For CONTRACTOR_ADMIN and CONTRACTOR_EMPLOYEE roles to manage work orders and vendors
 */

import { useState, useEffect, useCallback } from 'react'
import { Button, Tag, Empty, Toast, PullToRefresh, InfiniteScroll } from 'antd-mobile'
import { Table } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/factory'
import { useAuthStore } from '../store/useAuthStore'
import { WorkOrder } from '../api/local'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'warning',
  DISPATCHED: 'primary',
  ACCEPTED: 'success',
  RESERVED: 'warning',
  ARRIVED: 'success',
  WORKING: 'danger',
  FINISHED: 'default',
  OBSERVING: 'default',
  CLOSED: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待派单',
  DISPATCHED: '已指派',
  ACCEPTED: '已接单',
  RESERVED: '已预约',
  ARRIVED: '已到场',
  WORKING: '施工中',
  FINISHED: '待验收',
  OBSERVING: '观察期',
  CLOSED: '已完成',
}

function ContractorHome() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()

  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

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
        setOrders(list)
      } else {
        setOrders((prev) => [...prev, ...list])
      }

      const currentCount = (currentPage - 1) * PAGE_SIZE + (list as any[]).length
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
    navigate(`/workorder/${orderId}`)
  }

  const columns = [
    {
      title: '工单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 120,
    },
    {
      title: '网点',
      key: 'store',
      width: 120,
      render: (_: unknown, record: WorkOrder) => record.store_name,
    },
    {
      title: '品牌',
      dataIndex: 'brand_name',
      key: 'brand_name',
      width: 80,
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: unknown, record: WorkOrder) => (
        <Tag color={STATUS_COLORS[record.status]}>{STATUS_LABELS[record.status]}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: WorkOrder) => (
        <Button size="small" onClick={() => handleOrderClick(record.id)}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{
        padding: '16px',
        background: '#fff',
        borderBottom: '1px solid #eee',
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          工程公司工单管理
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
          {userInfo?.displayName} · {userInfo?.orgName}
        </div>
      </div>

      <div style={{ padding: '12px' }}>
        <PullToRefresh onRefresh={handleRefresh}>
          {orders.length === 0 && !loading ? (
            <Empty description="暂无工单" />
          ) : (
            <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
              <Table
                dataSource={orders}
                columns={columns}
                rowKey="id"
                pagination={false}
                scroll={{ x: 500 }}
              />
            </div>
          )}

          <InfiniteScroll loadMore={handleLoadMore} hasMore={hasMore} threshold={100} />
        </PullToRefresh>
      </div>
    </div>
  )
}

export default ContractorHome