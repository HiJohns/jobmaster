import { useState, useEffect } from 'react'
import { Tabs, SearchBar, PullToRefresh, Card, Tag, SpinLoading } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { workorderApi, WorkOrder } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'
import WeekCalendar from '../components/Calendar'

const STATUS_TABS = [
  { key: 'pending', title: '待服务', status: ['PENDING', 'DISPATCHED'] },
  { key: 'working', title: '服务中', status: ['RESERVED', 'ARRIVED', 'WORKING'] },
  { key: 'review', title: '待修正', status: ['FINISHED', 'OBSERVING'] },
  { key: 'completed', title: '已完成', status: ['CLOSED'] },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  DISPATCHED: 'blue',
  RESERVED: 'cyan',
  ARRIVED: 'green',
  WORKING: 'green',
  FINISHED: 'purple',
  OBSERVING: 'magenta',
  CLOSED: 'gray',
}

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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: '待指派',
      DISPATCHED: '已指派',
      RESERVED: '已预约',
      ARRIVED: '已到场',
      WORKING: '施工中',
      FINISHED: '待验收',
      OBSERVING: '观察期',
      CLOSED: '已完成',
    }
    return statusMap[status] || status
  }

  const renderOrderCard = (order: WorkOrder) => (
    <Card
      key={order.id}
      onClick={() => handleOrderClick(order.id)}
      style={{ marginBottom: 12 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 'bold' }}>{order.order_no}</span>
        <Tag color={STATUS_COLORS[order.status] || 'blue'}>
          {getStatusText(order.status)}
        </Tag>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <span style={{ fontSize: 14 }}>网点: {order.store_name || order.store_id}</span>
        {order.brand_name && <span style={{ fontSize: 14 }}>品牌: {order.brand_name}</span>}
        {order.category_path && <span style={{ fontSize: 14 }}>分类: {order.category_path}</span>}
        {order.photo_urls && order.photo_urls.length > 0 && (
          <div style={{ display: "flex", marginTop: 8 }}>
            {order.photo_urls.slice(0, 3).map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt=""
                style={{ width: 60, height: 60, objectFit: 'cover', marginRight: 8, borderRadius: 4 }}
              />
            ))}
          </div>
        )}
      </div>
      {order.is_urgent && (
        <Tag color="red" style={{ marginTop: 8 }}>加急</Tag>
      )}
    </Card>
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
