/**
 * Home Page / Tasks Page
 * Main entry point for work order management
 * 
 * Features:
 * - Week calendar for date selection (enhanced today highlight)
 * - Status tabs with card style and badge counts
 * - Work order cards with thumbnails
 * - Red urgent badge for is_urgent orders
 * - Pull to refresh and infinite scroll
 * - Persistent table header for empty state
 */

import { useState, useEffect, useCallback, CSSProperties } from 'react'
import { SearchBar, PullToRefresh, InfiniteScroll, FloatingBubble, Toast, Badge } from 'antd-mobile'
import { AddOutline, FilterOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import dayjs, { Dayjs } from 'dayjs'
import WeekCalendar from '../components/WeekCalendar'
import WorkOrderCard from '../components/WorkOrderCard'
import EmptyStateIllustration from '../components/EmptyStateIllustration'
import { workorderApi, WorkOrder } from '../api/workorder'
import { STATUS_GROUPS } from '../config/status'
import { useAuthStore } from '../store/useAuthStore'

/**
 * Tab configuration with status groups and colors
 */
const TABS = [
  { key: 'pending', title: '待服务', statuses: STATUS_GROUPS.pending.statuses, color: '#0033FF' },
  { key: 'working', title: '服务中', statuses: STATUS_GROUPS.working.statuses, color: '#00B578' },
  { key: 'review', title: '待修正', statuses: STATUS_GROUPS.review.statuses, color: '#FF8F1F' },
  { key: 'completed', title: '已完成', statuses: STATUS_GROUPS.completed.statuses, color: '#999999' },
]

/**
 * Table header columns
 */
const TABLE_HEADERS = [
  { key: 'order_no', label: '工单号', width: '25%' },
  { key: 'store', label: '品牌网点', width: '25%' },
  { key: 'engineer', label: '工程师', width: '20%' },
  { key: 'status', label: '状态', width: '15%' },
  { key: 'action', label: '操作', width: '15%' },
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
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({
    pending: 0,
    working: 0,
    review: 0,
    completed: 0,
  })
  const PAGE_SIZE = 10

  const badgeStyle = {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
  } as const

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
        
        // Update tab count for current tab
        setTabCounts(prev => ({
          ...prev,
          [activeTab]: total
        }))
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      Toast.show('获取工单列表失败')
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
    navigate('/workorders')
  }

  /**
   * Persistent table header component
   */
  const TableHeader = () => (
    <div style={{
      display: 'flex',
      padding: '12px 16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #e8e8e8',
      borderRadius: '8px 8px 0 0',
    }}>
      {TABLE_HEADERS.map((header) => (
        <div
          key={header.key}
          style={{
            width: header.width,
            fontSize: '13px',
            fontWeight: 500,
            color: '#999',
            textAlign: header.key === 'action' ? 'center' : 'left',
          }}
        >
          {header.label}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Week Calendar */}
      <WeekCalendar
        onDateChange={setSelectedDate}
        selectedDate={selectedDate}
      />

      {/* Search Bar with Filter */}
      <div style={{ 
        padding: '16px 16px 12px', 
        background: '#fff',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <SearchBar
            placeholder="搜索单号、网点、品牌"
            value={searchText}
            onChange={setSearchText}
            style={{ '--background': '#f5f5f5' }}
          />
        </div>
        <div 
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onClick={() => Toast.show('筛选功能开发中')}
        >
          <FilterOutline style={{ fontSize: '20px', color: '#666' }} />
        </div>
      </div>

      {/* Status Tabs - Card Style */}
      <div style={{ 
        padding: '0 16px 16px', 
        background: '#fff',
        display: 'flex',
        gap: '12px',
        overflowX: 'auto'
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const count = tabCounts[tab.key] || 0
          
          return (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: '1 0 auto',
                minWidth: '80px',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: isActive ? `${tab.color}10` : '#f5f5f5',
                border: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? tab.color : '#666',
              }}>
                {tab.title}
              </span>
              <Badge 
                content={count} 
                style={{
                  '--color': isActive ? tab.color : '#999',
                  '--background-color': isActive ? `${tab.color}20` : '#e8e8e8',
                  ...badgeStyle,
                } as CSSProperties}
              />
            </div>
          )
        })}
      </div>

      {/* Order List */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5', padding: '16px' }}>
        <PullToRefresh onRefresh={handleRefresh}>
          <div>
            {/* Persistent Table Header - always visible */}
            <TableHeader />
            
            {orders.length === 0 && !loading ? (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <EmptyStateIllustration
                  message="暂无待处理工单，去派发新任务吧"
                  showAction={userInfo?.role === 'STORE'}
                  onAction={handleCreateOrder}
                />
              </div>
            ) : (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                padding: '16px',
              }}>
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
              </div>
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
