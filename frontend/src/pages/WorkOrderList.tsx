import { useState, useEffect } from 'react'
import { SearchBar, PullToRefresh, SpinLoading } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/factory'
import { useAuthStore } from '../store/useAuthStore'
import { WorkOrder } from '../api/local'
import WorkOrderCard from '../components/WorkOrderCard'
import { CreateWorkOrderModal } from '../components/CreateWorkOrderModal'
import { PendingOrdersModal } from '../components/PendingOrdersModal'
import { getPendingCount } from '../utils/pendingOrders'

const FILTER_MAP: Record<string, string[]> = {
  total: ['PENDING', 'DISPATCHED', 'RESERVED', 'WORKING', 'FINISHED', 'CLOSED'],
  pending: ['PENDING', 'DISPATCHED'],
  working: ['RESERVED', 'WORKING'],
  abnormal: ['FINISHED', 'CLOSED'],
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
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [pendingModalVisible, setPendingModalVisible] = useState(false)

  // Check if user can create orders (BRANCH_ADMIN or EMPLOYEE role)
  const canCreateOrder = userInfo?.role === 'BRANCH_ADMIN' || userInfo?.role === 'EMPLOYEE'

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
        sort_by: 'created_at' as 'created_at' | 'priority' | 'updated_at',
        sort_order: sortOrder,
        start_date: selectedDate.startOf('day').toISOString(),
        end_date: selectedDate.endOf('day').toISOString(),
        page: 1,
        page_size: 100,
      }

      const response = await api.workorder.list(params)
      console.log('[DEBUG WorkOrderList] full response:', JSON.stringify(response).substring(0, 500))
      const res = response as { code: number; data: { list: WorkOrder[] } }
      console.log('[DEBUG WorkOrderList] res:', res)
      if (res && res.code === 200 && res.data && res.data.list) {
        console.log('[DEBUG WorkOrderList] list length:', res.data.list.length)
        setOrders(res.data.list)
        console.log('[DEBUG WorkOrderList] setOrders done, count:', res.data.list.length)
      } else {
        console.log('[DEBUG WorkOrderList] condition failed, res:', res)
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

  const handleCreateSuccess = () => {
    setCreateModalVisible(false)
    fetchOrders() // 刷新列表
  }

  // KPI items config for compact style
  const KPI_ITEMS = [
    { key: 'total', label: '今日工单', value: 'total' as const, color: '#1f2937' },
    { key: 'pending', label: '待处理', value: 'pending' as const, color: '#B81F25' },
    { key: 'working', label: '进行中', value: 'working' as const, color: '#C49A3C' },
    { key: 'abnormal', label: '异常', value: 'abnormal' as const, color: '#F59E0B' },
  ]

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#F5F7FA'
    }}>
      {/* Row 1: Compact KPI Cards (Global Control) */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          marginLeft: 'auto'
        }}>
          {KPI_ITEMS.map(item => {
            const isActive = activeFilter === item.key
            return (
              <div
                key={item.key}
                onClick={() => handleKPIFilter(item.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${isActive ? item.color : '#E5E7EB'}`,
                  background: isActive ? item.color : '#fff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  minWidth: '80px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: isActive ? '#fff' : item.color 
                }}>
                  {stats[item.value]}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: isActive ? '#fff' : '#6B7280',
                  marginTop: '2px'
                }}>
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row 2: Count + Search + Create + Sort (Search Control) */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#F5F7FA',
        borderBottom: '1px solid #E5E7EB'
      }}>
        {/* Left: Count + Create Button */}
        <>
          <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
            今日工单：{filteredOrders.length} 条
            {canCreateOrder && (
              <span
                onClick={() => setCreateModalVisible(true)}
                style={{
                  background: '#B81F25',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
              >
                +创建
              </span>
            )}
          </span>
        </>
        
        {/* Center: Search Bar */}
        <SearchBar
          placeholder="搜索..."
          value={searchText}
          onChange={setSearchText}
          style={{ 
            background: '#fff',
            borderRadius: '6px',
            width: '170px',
            flex: '0 0 170px'
          }}
        />
        
        {/* Right: Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
          <div
            onClick={() => setPendingModalVisible(true)}
            style={{ cursor: 'pointer', color: '#C45C4E', fontSize: '12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            待提交{getPendingCount() > 0 && `（${getPendingCount()}）`}
          </div>
          <div
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            style={{ cursor: 'pointer', color: '#6B7280', fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            创建时间 {sortOrder === 'desc' ? '↓' : '↑'}
          </div>
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
            // Version 4.0: 情感化空状态
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              margin: '24px'
            }}>
              <div style={{ 
                fontSize: '64px', 
                marginBottom: '24px',
                color: '#C49A3C'
              }}>
                ✅
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: '#1f2937',
                marginBottom: '12px'
              }}>
                今天所有工单已清零，干得漂亮！
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#6B7280',
                marginBottom: '32px'
              }}>
                休息一下，或
                <span 
                  onClick={() => {
                    // 查询昨日遗留工单
                    const yesterday = dayjs().subtract(1, 'day')
                    setSelectedDate(yesterday)
                    fetchOrders()
                  }}
                  style={{ 
                    color: '#B81F25', 
                    cursor: 'pointer',
                    marginLeft: '4px',
                    textDecoration: 'underline'
                  }}
                >
                  处理昨日遗留工单
                </span>
              </div>
              
              {canCreateOrder && (
                <div
                  onClick={() => setCreateModalVisible(true)}
                  style={{
                    padding: '16px 32px',
                    background: '#B81F25',
                    color: 'white',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px'
                  }}
                >
                  ➕ 开始今天的第一项工作
                </div>
              )}
            </div>
          ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '8px' }}>
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
      
      {createModalVisible && (
        <CreateWorkOrderModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
      <PendingOrdersModal
        visible={pendingModalVisible}
        onClose={() => setPendingModalVisible(false)}
      />
    </div>
  )
}

export default WorkOrderList
