import { useState, useEffect } from 'react'
import { Tabs, SearchBar, PullToRefresh, SpinLoading } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { workorderApi, WorkOrder } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'
import WeekCalendar from '../components/Calendar'
import WorkOrderCard from '../components/WorkOrderCard'

const STATUS_TABS = [
  { key: 'pending', title: '待服务', status: ['PENDING', 'DISPATCHED'] },
  { key: 'working', title: '服务中', status: ['RESERVED', 'ARRIVED', 'WORKING'] },
  { key: 'review', title: '待修正', status: ['FINISHED', 'OBSERVING'] },
  { key: 'completed', title: '已完成', status: ['CLOSED'] },
]


function WorkOrderList() {
  const navigate = useNavigate()
  useAuthStore()
  const [activeTab, setActiveTab] = useState('pending')
  const [searchText, setSearchText] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [, setRefreshing] = useState(false)

  const fetchOrders = async () => {
    const tab = STATUS_TABS.find((t) => t.key === activeTab)
    if (!tab) return

    setLoading(true)
    try {
      const params = {
        status: tab.status.join(','),
        keyword: searchText,
        sort_by: 'created_at' as 'created_at' | 'updated_at',
        sort_order: sortOrder,
        start_date: selectedDate.startOf('day').toISOString(),
        end_date: selectedDate.endOf('day').toISOString(),
        page: 1,
        page_size: 20,
      }

      const response = await workorderApi.list(params)
      if (response.code === 200) {
        setOrders(response.data.list)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [activeTab, searchText, sortOrder, selectedDate.format('YYYY-MM-DD')])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  const handleOrderClick = (orderId: string) => {
    navigate(`/workorder/${orderId}`)
  }



  const renderOrderCard = (order: WorkOrder) => (
    <WorkOrderCard key={order.id} order={order} onClick={handleOrderClick} />
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WeekCalendar onDateChange={(date) => setSelectedDate(date)} selectedDate={selectedDate} />

      <SearchBar
        placeholder="搜索单号、网点、品牌"
        value={searchText}
        onChange={setSearchText}
        style={{ background: '#fff' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff' }}>
        <span style={{ fontSize: 12, color: '#666' }}>共 {orders.length} 条</span>
        <div
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          style={{ cursor: 'pointer', color: '#0033FF' }}
        >
          创建时间 {sortOrder === 'desc' ? '↓' : '↑'}
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        style={{ flex: 1 }}
      >
        {STATUS_TABS.map((tab) => (
          <Tabs.Tab key={tab.key} title={tab.title}>
            <PullToRefresh  onRefresh={handleRefresh}>
              <div style={{ padding: 12, minHeight: 200 }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <SpinLoading style={{ "--size": "32px" } as any} />
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <span style={{ color: '#999' }}>暂无工单</span>
                  </div>
                ) : (
                  orders.map(renderOrderCard)
                )}
              </div>
            </PullToRefresh>
          </Tabs.Tab>
        ))}
      </Tabs>
    </div>
  )
}

export default WorkOrderList
