import { useState, useEffect } from 'react'
import { Tabs, SearchBar, PullRefresh, Card, Tag, Flex, Text, ActivityIndicator } from 'antd-mobile'
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
  const { userInfo } = useAuthStore()
  const [activeTab, setActiveTab] = useState('pending')
  const [searchText, setSearchText] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = async () => {
    const tab = STATUS_TABS.find((t) => t.key === activeTab)
    if (!tab) return

    setLoading(true)
    try {
      const params = {
        status: tab.status.join(','),
        keyword: searchText,
        sort_by: 'created_at',
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
      <Flex justify="between" align="center" style={{ marginBottom: 8 }}>
        <Text style={{ fontWeight: 'bold' }}>{order.order_no}</Text>
        <Tag color={STATUS_COLORS[order.status] || 'blue'}>
          {getStatusText(order.status)}
        </Tag>
      </Flex>
      <Flex direction="column" align="start" style={{ gap: 4 }}>
        <Text style={{ fontSize: 14 }}>网点: {order.store_name || order.store_id}</Text>
        {order.brand_name && <Text style={{ fontSize: 14 }}>品牌: {order.brand_name}</Text>}
        {order.category_path && <Text style={{ fontSize: 14 }}>分类: {order.category_path}</Text>}
        {order.photo_urls && order.photo_urls.length > 0 && (
          <Flex style={{ marginTop: 8 }}>
            {order.photo_urls.slice(0, 3).map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt=""
                style={{ width: 60, height: 60, objectFit: 'cover', marginRight: 8, borderRadius: 4 }}
              />
            ))}
          </Flex>
        )}
      </Flex>
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

      <Flex justify="between" align="center" style={{ padding: '8px 12px', background: '#fff' }}>
        <Text style={{ fontSize: 12, color: '#666' }}>共 {orders.length} 条</Text>
        <div
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          style={{ cursor: 'pointer', color: '#0033FF' }}
        >
          创建时间 {sortOrder === 'desc' ? '↓' : '↑'}
        </div>
      </Flex>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        style={{ flex: 1 }}
      >
        {STATUS_TABS.map((tab) => (
          <Tabs.Tab key={tab.key} title={tab.title}>
            <PullRefresh refreshing={refreshing} onRefresh={handleRefresh}>
              <div style={{ padding: 12, minHeight: 200 }}>
                {loading ? (
                  <Flex justify="center" align="center" style={{ padding: 40 }}>
                    <ActivityIndicator size="large" />
                  </Flex>
                ) : orders.length === 0 ? (
                  <Flex justify="center" align="center" style={{ padding: 40 }}>
                    <Text style={{ color: '#999' }}>暂无工单</Text>
                  </Flex>
                ) : (
                  orders.map(renderOrderCard)
                )}
              </div>
            </PullRefresh>
          </Tabs.Tab>
        ))}
      </Tabs>
    </div>
  )
}

export default WorkOrderList
