import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Loading, PullToRefresh, InfiniteScroll } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import WorkOrderCard from '../components/WorkOrderCard'
import TabBar from '../components/TabBar'
import { useAuthStore } from '../store/useAuthStore'
import { theme } from '../styles/theme'
import { demoApi } from '../api/demo'

interface WorkOrderStats {
  total: number
  by_status: Record<string, number>
}

interface WorkOrder {
  id: string
  order_no: string
  title?: string
  status: string
  store_name: string
  address_detail: string
  category_path: string
  brand_name: string
  description: string
  engineer_name?: string
  engineer_id?: string
  owner_org_name?: string
  time_slots?: any[]
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

  const isEngineer = userInfo?.role === 'ENGINEER'
  const canCreateOrder = userInfo?.role === 'BRANCH_ADMIN' || userInfo?.role === 'EMPLOYEE'

  /**
   * 获取工单统计
   */
  const fetchStats = async () => {
    try {
      const res = await demoApi.getWorkOrders()
      const orders = res.list || []
      const by_status: Record<string, number> = {}
      orders.forEach((o: any) => {
        by_status[o.status] = (by_status[o.status] || 0) + 1
      })
      setStats({ total: orders.length, by_status })
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

      // 调用 Demo API
      const res = await demoApi.getWorkOrders()

      const mockOrders: WorkOrder[] = (res.list || []).map((o: any) => ({
        id: o.id,
        order_no: o.order_no,
        title: o.title,
        status: o.status,
        store_name: o.store_name,
        address_detail: o.address_detail,
        category_path: o.category_path,
        brand_name: o.brand_name,
        description: o.description,
        engineer_name: o.engineer_name,
        engineer_id: o.engineer_id,
        owner_org_name: o.owner_org_name,
        time_slots: o.time_slots,
        created_at: o.created_at,
        is_urgent: o.is_urgent,
      }))

      if (isRefresh || currentPage === 1) {
        mockOrders.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setOrders(mockOrders)
        setPage(1)
      } else {
        setOrders(prev => [...prev, ...mockOrders])
      }

      setHasMore(false)
      setPage(currentPage)
    } catch (error) {
      console.error('[DEBUG mobile] fetchOrders error:', error)
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
   * 获取当前进行中的工单（WORKING状态）
   */
  const getCurrentWorkingOrder = (): WorkOrder | null => {
    return orders.find(order => order.status === 'WORKING') || null
  }

  /**
   * 获取下一个即将开始的工单（RESERVED状态，按预约时间排序）
   */
  const getNextUpcomingOrder = (): WorkOrder | null => {
    const reservedOrders = orders.filter(order => order.status === 'RESERVED')
    if (reservedOrders.length === 0) return null
    
    // 按创建时间排序，取最新的一个作为下一个任务
    return reservedOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
  }

  /**
   * 处理工单卡片点击
   */
  const handleOrderClick = (orderId: string) => {
    navigate(`/wechat/orders/${orderId}`)
  }

  /**
   * 处理提交施工记录
   */
  const handleSubmitRecord = (orderId: string) => {
    navigate(`/wechat/orders/${orderId}/record`)
  }

  const currentWorkingOrder = getCurrentWorkingOrder()
  const nextUpcomingOrder = getNextUpcomingOrder()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme.background }}>
      {/* 顶部统计栏 - 缩小显示 */}
      <Card
        style={{
          margin: '12px 16px 0',
          borderRadius: theme.borderRadius,
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0033FF', lineHeight: 1 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>今日工单</div>
          </div>
          
          {Object.entries(stats.by_status).slice(0, 3).map(([status, count]) => {
            const statusConfig = {
              DISPATCHED: { text: '流转中', color: '#0033FF' },
              ACCEPTED: { text: '已接单', color: '#00B578' },
              RESERVED: { text: '已预约', color: '#FF8F1F' },
              WORKING: { text: '施工中', color: '#6366F1' },
            }[status] || { text: status, color: '#999' }

            return (
              <div key={status} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: statusConfig.color, lineHeight: 1 }}>
                  {count}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{statusConfig.text}</div>
              </div>
            )
          })}
        </div>
        {userInfo?.role && ['BRANCH_ADMIN', 'EMPLOYEE'].includes(userInfo.role) && (
          <div
            onClick={() => navigate('/wechat/pending-orders')}
            style={{ textAlign: 'center', padding: '8px 0 0', fontSize: '12px', color: '#1677FF', cursor: 'pointer' }}
          >
            待提交
          </div>
        )}
      </Card>

      {/* 任务提示区 - 显示下一个即将开始的工单（仅工程师） */}
      {isEngineer && nextUpcomingOrder && !currentWorkingOrder && (
        <Card
          style={{
            margin: '12px 16px 0',
            borderRadius: theme.borderRadius,
            background: '#fff',
            borderLeft: '4px solid #FF8F1F',
          }}
        >
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '12px', color: '#FF8F1F', fontWeight: 'bold', marginBottom: '4px' }}>
              下一个任务
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '4px' }}>
              {nextUpcomingOrder.store_name}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              {nextUpcomingOrder.category_path} · {nextUpcomingOrder.brand_name}
            </div>
          </div>
        </Card>
      )}

      {/* 当前工单大卡片 - WORKING状态工单置顶（仅工程师） */}
      {isEngineer && currentWorkingOrder && (
        <Card
          style={{
            margin: '12px 16px',
            borderRadius: theme.borderRadius,
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
          }}
        >
          <div style={{ padding: '20px 16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>当前工单</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              {currentWorkingOrder.store_name}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '12px' }}>
              {currentWorkingOrder.category_path}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '20px' }}>
              {currentWorkingOrder.description}
            </div>
            
            {/* 提交施工记录大按钮 */}
            <div
              onClick={() => handleSubmitRecord(currentWorkingOrder.id)}
              style={{
                background: '#fff',
                color: '#6366F1',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              提交施工记录
            </div>
          </div>
        </Card>
      )}

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
              {orders
                .filter(order => order.status !== 'WORKING') // 过滤掉WORKING状态，已在大卡片显示
                .map((order) => (
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
