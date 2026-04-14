import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Loading, PullToRefresh, InfiniteScroll } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import WorkOrderCard from '../components/WorkOrderCard'
import TabBar from '../components/TabBar'
import { useAuthStore } from '../store/useAuthStore'

interface WorkOrderStats {
  total: number
  by_status: Record<string, number>
}

interface WorkOrder {
  id: string
  order_no: string
  status: string
  store_name: string
  address_detail: string
  category_path: string
  brand_name: string
  description: string
  engineer_name?: string
  created_at: string
  is_urgent?: boolean
}

/**
 * EngineerHomePage - 工程师首页
 * 功能：显示工单统计、工单列表、底部导航
 * 路由：/wechat/orders
 */
export default function EngineerHomePage() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()
  const [stats, setStats] = useState<WorkOrderStats>({ total: 0, by_status: {} })
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const canCreateOrder = userInfo?.role === 'STORE' || userInfo?.role === 'STAFF'

  /**
   * 获取工单统计
   */
  const fetchStats = async () => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockStats: WorkOrderStats = {
        total: 12,
        by_status: {
          'DISPATCHED': 3,
          'ACCEPTED': 2,
          'RESERVED': 4,
          'WORKING': 3,
        }
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  /**
   * 获取工单列表
   */
  const fetchOrders = async (currentPage = 1, isRefresh = false) => {
    try {
      if (isRefresh || currentPage === 1) {
        setLoading(true)
      }

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 800))

      const mockOrders: WorkOrder[] = Array.from({ length: 10 }).map((_, i) => ({
        id: `jm-wo-${currentPage}-${i}`,
        order_no: `WO-20240413-${String(i).padStart(3, '0')}`,
        status: ['DISPATCHED', 'ACCEPTED', 'RESERVED', 'WORKING'][Math.floor(Math.random() * 4)],
        store_name: `Store ${Math.floor(Math.random() * 5) + 1}`,
        address_detail: `${Math.floor(Math.random() * 100) + 1} Main St, City`,
        category_path: '内装/卖场/消防门',
        brand_name: ['Apple', 'Samsung', 'Huawei'][Math.floor(Math.random() * 3)],
        description: '设备故障，需要维修',
        engineer_name: '工程师A',
        created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        is_urgent: Math.random() > 0.7,
      }))

      if (isRefresh || currentPage === 1) {
        setOrders(mockOrders)
        setPage(1)
      } else {
        setOrders(prev => [...prev, ...mockOrders])
      }

      setHasMore(currentPage < 5) // 最多5页
      setPage(currentPage)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初始加载
   */
  useEffect(() => {
    fetchStats()
    fetchOrders(1)
  }, [])

  /**
   * 处理下拉刷新
   */
  const handleRefresh = async () => {
    await Promise.all([
      fetchStats(),
      fetchOrders(1, true)
    ])
  }

  /**
   * 处理加载更多
   */
  const handleLoadMore = async () => {
    await fetchOrders(page + 1)
  }

  /**
   * 处理工单卡片点击
   */
  const handleOrderClick = (orderId: string) => {
    navigate(`/wechat/orders/${orderId}`)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* 顶部统计栏 */}
      <Card
        style={{
          margin: '16px',
          borderRadius: '12px',
          background: '#fff',
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0033FF', marginBottom: '4px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>今日工单</div>
        </div>
        
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-around' }}>
          {Object.entries(stats.by_status).map(([status, count]) => {
            const statusConfig = {
              DISPATCHED: { text: '待接单', color: '#0033FF' },
              ACCEPTED: { text: '已接单', color: '#00B578' },
              RESERVED: { text: '已预约', color: '#FF8F1F' },
              WORKING: { text: '施工中', color: '#6366F1' },
            }[status] || { text: status, color: '#999' }

            return (
              <div key={status} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: statusConfig.color }}>
                  {count}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>{statusConfig.text}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 工单列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
        <PullToRefresh onRefresh={handleRefresh}>
          {loading && orders.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
              <Loading color="#0033FF" />
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              暂无工单数据
            </div>
          ) : (
            <>
              {orders.map((order) => (
                <WorkOrderCard
                  key={order.id}
                  order={order}
                  onClick={handleOrderClick}
                />
              ))}
              <InfiniteScroll
                loadMore={handleLoadMore}
                hasMore={hasMore}
                threshold={100}
              />
            </>
          )}
        </PullToRefresh>
      </div>

      {canCreateOrder && (
        <div
          onClick={() => navigate('/wechat/orders/create')}
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '80px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0033FF 0%, #0066FF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 51, 255, 0.4)',
            cursor: 'pointer',
            zIndex: 1000,
          }}
        >
          <AddOutline fontSize={28} color="#fff" />
        </div>
      )}

      <TabBar />
    </div>
  )
}
