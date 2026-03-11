/**
 * Home Page / Tasks Page
 * Main entry point for work order management
 * 
 * Features:
 * - Week calendar for date selection (yellow highlight)
 * - Status tabs for filtering (待服务, 服务中, 待修正, 已完成)
 * - Work order cards with thumbnails
 * - Red urgent badge for is_urgent orders
 * - Pull to refresh and infinite scroll
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, SearchBar, PullToRefresh, InfiniteScroll, FloatingBubble } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import dayjs, { Dayjs } from 'dayjs'
import WeekCalendar from '../components/WeekCalendar'
import WorkOrderCard from '../components/WorkOrderCard'
import { workorderApi, WorkOrder } from '../api/workorder'
import { STATUS_GROUPS } from '../config/status'
import { useAuthStore } from '../store/useAuthStore'

/**
 * Tab configuration with status groups
 */
const TABS = [
  { key: 'pending', title: '待服务', statuses: STATUS_GROUPS.pending.statuses },
  { key: 'working', title: '服务中', statuses: STATUS_GROUPS.working.statuses },
  { key: 'review', title: '待修正', statuses: STATUS_GROUPS.review.statuses },
  { key: 'completed', title: '已完成', statuses: STATUS_GROUPS.completed.statuses },
]

/**
 * Home Page Component
 */
function Home() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()
  
  // State
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [searchText, setSearchText] = useState('')
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  /**
   * Fetch orders from API
   */
  const fetchOrders = useCallback(async (currentPage = 1, isRefresh = false) => {
    const tab = TABS.find((t) => t.key === activeTab)
    if (!tab) return

    try {
      const params = {
        status: tab.statuses.join(','),
        keyword: searchText,
        start_date: selectedDate.startOf('day').toISOString(),
        end_date: selectedDate.endOf('day').toISOString(),
        page: currentPage,
        page_size: PAGE_SIZE,
        sort_by: 'created_at' as const,
        sort_order: 'desc' as const,
      }

      const response = await workorderApi.myTasks(params)
      
      if (response.code === 200) {
        const { list, total } = response.data
        
        if (isRefresh || currentPage === 1) {
          setOrders(list)
        } else {
          setOrders((prev) => [...prev, ...list])
        }
        
        const currentCount = (currentPage - 1) * PAGE_SIZE + list.length
        setHasMore(currentCount < total)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }, [activeTab, searchText, selectedDate])

  /**
   * Initial load and dependencies change
   */
  useEffect(() => {
    setPage(1)
    setLoading(true)
    fetchOrders(1, true).finally(() => setLoading(false))
  }, [activeTab, selectedDate, fetchOrders])

  /**
   * Handle pull refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true)
    setPage(1)
    await fetchOrders(1, true)
    setRefreshing(false)
  }

  /**
   * Handle infinite scroll load more
   */
  const handleLoadMore = async () => {
    if (!hasMore) return
    
    const nextPage = page + 1
    setPage(nextPage)
    await fetchOrders(nextPage)
  }

  /**
   * Handle order card click
   */
  const handleOrderClick = (orderId: string) => {
    navigate(`/workorder/${orderId}`)
  }

  /**
   * Handle create new order
   */
  const handleCreateOrder = () => {
    // Navigate to create order page (if exists) or show modal
    navigate('/workorders')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Week Calendar */}
      <WeekCalendar
        onDateChange={setSelectedDate}
        selectedDate={selectedDate}
      />

      {/* Search Bar */}
      <div style={{ padding: '12px 16px', background: '#fff' }}>
        <SearchBar
          placeholder="搜索单号、网点、品牌"
          value={searchText}
          onChange={setSearchText}
          style={{ '--background': '#f5f5f5' }}
        />
      </div>

      {/* Status Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{
          '--title-font-size': '14px',
          '--active-title-color': '#0033FF',
          '--active-line-color': '#0033FF',
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Tab key={tab.key} title={tab.title} />
        ))}
      </Tabs>

      {/* Order List */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        <PullToRefresh onRefresh={handleRefresh} >
          <div style={{ padding: 12 }}>
            {orders.length === 0 && !loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#999',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16 }}>暂无工单</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>
                  选择其他日期或切换标签查看
                </div>
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
          </div>
        </PullToRefresh>
      </div>

      {/* Create Order Button (for STORE role) */}
      {userInfo?.role === 'STORE' && (
        <FloatingBubble
          onClick={handleCreateOrder}
          style={{
            '--background': '#0033FF',
            '--size': '56px',
          }}
        >
          <AddOutline fontSize={24} color="#fff" />
        </FloatingBubble>
      )}
    </div>
  )
}

export default Home
