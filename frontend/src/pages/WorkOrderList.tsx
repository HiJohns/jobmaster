import { useState, useEffect } from 'react'
import { Tabs, SearchBar, PullToRefresh, SpinLoading, Button } from 'antd-mobile'
import { Checkbox, Tag, Space } from 'antd'
import { CameraOutlined, EnvironmentOutlined } from '@ant-design/icons'
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

const STATUS_TABS = [
  { key: 'pending', title: '待服务', status: ['PENDING', 'DISPATCHED'] },
  { key: 'working', title: '服务中', status: ['RESERVED', 'WORKING'] },
  { key: 'review', title: '待修正', status: ['FINISHED'] },
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

  const [loading, setLoading] = useState(false)
  const [, setRefreshing] = useState(false)

  // Calculate KPI stats from orders
  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['PENDING', 'DISPATCHED'].includes(o.status)).length,
    working: orders.filter(o => ['RESERVED', 'WORKING'].includes(o.status)).length,
    abnormal: orders.filter(o => o.is_urgent && new Date(o.created_at).getTime() + 4*60*60*1000 < Date.now()).length,
  }

  const handleKPIswitch = (key: string) => {
    const tabMap: Record<string, string> = {
      total: 'pending',  // Default to first tab for total
      pending: 'pending',
      working: 'working',
      abnormal: 'review',  // Show finished orders for reviewing abnormalities
    }
    if (tabMap[key]) {
      setActiveTab(tabMap[key])
    }
  }

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
  }, [activeTab, searchText, sortOrder, selectedDate.format('YYYY-MM-DD')])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  const handleOrderClick = (orderId: string) => {
    navigate(`/workorder/${orderId}`)
  }



  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WeeklyCalendar onDateChange={(date: Dayjs) => setSelectedDate(date)} selectedDate={selectedDate} />

        <SearchBar
        placeholder="搜索单号、网点、品牌、工程师姓名..."
        value={searchText}
        onChange={setSearchText}
        style={{ background: theme.cardBackground }}
      />

      <KPIHeader stats={stats} onTabChange={handleKPIswitch} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: theme.cardBackground }}>
        <span style={{ fontSize: 12, color: '#666' }}>共 {orders.length} 条</span>
        <div
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          style={{ cursor: 'pointer', color: theme.primary }}
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
            <PullToRefresh onRefresh={handleRefresh}>
              <div style={{ padding: 12, minHeight: 400 }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <SpinLoading style={{ "--size": "32px" } as any} />
                  </div>
                ) : orders.length === 0 ? (
                  <EmptyStateIllustration message="当前节点暂无工单，点击右侧按钮发起新任务" />
                ) : (
                  <div style={{ padding: '0 8px' }}>
                    {orders.map((order) => (
                      <WorkOrderCard 
                        key={order.id} 
                        order={order}
                        onClick={() => handleOrderClick(order.id)}
                      />
                    ))}
                  </div>
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
