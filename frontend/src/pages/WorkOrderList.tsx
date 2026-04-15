import { useState, useEffect } from 'react'
import { SearchBar, PullToRefresh, SpinLoading } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../api/factory'
import { useAuthStore } from '../store/useAuthStore'
import { WorkOrder } from '../api/local'
import WeeklyCalendar from '../components/WeeklyCalendar'
import EmptyStateIllustration from '../components/EmptyStateIllustration'
import WorkOrderCard from '../components/WorkOrderCard'
import KPIHeader from '../components/KPIHeader'
import { theme } from '../styles/theme'

const FILTER_MAP: Record<string, string[]> = {
  total: ['PENDING', 'DISPATCHED', 'RESERVED', 'WORKING', 'FINISHED', 'CLOSED'],
  pending: ['PENDING', 'DISPATCHED'],
  working: ['RESERVED', 'WORKING'],
  abnormal: ['FINISHED', 'CLOSED'],
}

const FILTER_LABELS: Record<string, string> = {
  total: '今日工单',
  pending: '待处理',
  working: '进行中',
  abnormal: '异常',
}

function WorkOrderList() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()
  const [activeFilter, setActiveFilter] = useState('total')
  const [searchText, setSearchText] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [, setRefreshing] = useState(false)

  // Check if user can create orders (STORE or EMPLOYEE role)
  const canCreateOrder = userInfo?.role === 'STORE' || userInfo?.role === 'EMPLOYEE'

  // Calculate KPI stats from orders
  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['PENDING', 'DISPATCHED'].includes(o.status)).length,
    working: orders.filter(o => ['RESERVED', 'WORKING'].includes(o.status)).length,
    abnormal: orders.filter(o => o.is_urgent && new Date(o.created_at).getTime() + 4*60*60*1000 < Date.now()).length,
  }

  // Calculate filtered orders
  const filteredOrders = orders.filter(order => {
    const currentStatuses = FILTER_MAP[activeFilter] || FILTER_MAP.total
    return currentStatuses.includes(order.status)
  })

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = {
        status: FILTER_MAP.total.join(','),
        keyword: searchText,
        sort_by: 'priority' as 'priority' | 'created_at' | 'updated_at',
        sort_order: sortOrder,
        start_date: selectedDate.startOf('day').toISOString(),
        end_date: selectedDate.endOf('day').toISOString(),
        page: 1,
        page_size: 100,
      }

      const response = await api.workorder.list(params)
      const res = response as { code: number; data: { list: WorkOrder[] } }
      if (res.code === 200) {
        // Sort: urgent orders first, then by created_at desc
        const sortedOrders = [...res.data.list].sort((a, b) => {
          if (a.is_urgent && !b.is_urgent) return -1
          if (!a.is_urgent && b.is_urgent) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setOrders(sortedOrders)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [searchText, sortOrder, selectedDate.format('YYYY-MM-DD')])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  const handleOrderClick = (orderId: string) => {
    navigate(`/workorder/${orderId}`)
  }

  const handleKPIFilter = (filterKey: string) => {
    setActiveFilter(filterKey)
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#F5F7FA',
      padding: '16px'
    }}>
      {/* Header Section - Combined Calendar and Search */}
      <div style={{ 
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius,
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <WeeklyCalendar onDateChange={(date: Dayjs) => setSelectedDate(date)} selectedDate={selectedDate} />
        </div>
        
        <SearchBar
          placeholder="搜索单号、网点、工程师..."
          value={searchText}
          onChange={setSearchText}
          style={{ 
            background: '#f8f9fa',
            borderRadius: '8px',
            flex: '0 0 300px'
          }}
        />
        
        {canCreateOrder && (
          <div
            onClick={() => navigate('/create-workorder')}
            style={{
              background: '#2563EB',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              flex: '0 0 auto'
            }}
          >
            <AddOutline fontSize={16} />
            创建工单
          </div>
        )}
      </div>

      {/* KPI Header - Interactive Filters */}
      <KPIHeader stats={stats} onTabChange={handleKPIFilter} activeFilter={activeFilter} />

      {/* Results Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '8px 16px', 
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: 12, color: '#666' }}>
          {FILTER_LABELS[activeFilter]}: {filteredOrders.length} 条
        </span>
        <div
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          style={{ cursor: 'pointer', color: theme.primary, fontSize: '12px' }}
        >
          创建时间 {sortOrder === 'desc' ? '↓' : '↑'}
        </div>
      </div>

      {/* Work Orders Grid */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: '0 8px'
      }}>
        <PullToRefresh onRefresh={handleRefresh}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <SpinLoading style={{ "--size": "32px" } as any} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              backgroundColor: '#fff',
              borderRadius: theme.borderRadius
            }}>
              <EmptyStateIllustration message="暂无工单数据" />
              {canCreateOrder && (
                <div
                  onClick={() => navigate('/create-workorder')}
                  style={{
                    marginTop: '24px',
                    padding: '16px 32px',
                    background: '#2563EB',
                    color: 'white',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  发起第一个任务
                </div>
              )}
            </div>
          ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {filteredOrders.map((order) => (
                  <div key={order.id}>
                    <WorkOrderCard 
                      order={order}
                      onClick={() => handleOrderClick(order.id)}
                    />
                  </div>
                ))}
              </div>
          )}
        </PullToRefresh>
      </div>
    </div>
  )
}

export default WorkOrderList
