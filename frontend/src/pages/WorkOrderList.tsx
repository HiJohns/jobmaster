import { useState, useEffect } from 'react'
import { Tabs, SearchBar, PullToRefresh, SpinLoading, Button } from 'antd-mobile'
import { Table, Checkbox, Tag, Space } from 'antd'
import { CameraOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { workorderApi, WorkOrder } from '../api/workorder'
import { useAuthStore } from '../store/useAuthStore'
import WeekCalendar from '../components/Calendar'
import EmptyStateIllustration from '../components/EmptyStateIllustration'

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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

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

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  const columns = [
    {
      title: '',
      dataIndex: 'selection',
      width: 50,
      render: (_: any, record: WorkOrder) => (
        <Checkbox 
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRowKeys([...selectedRowKeys, record.id])
            } else {
              setSelectedRowKeys(selectedRowKeys.filter(key => key !== record.id))
            }
          }}
          checked={selectedRowKeys.includes(record.id)}
        />
      ),
    },
    {
      title: '工单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 120,
      render: (text: string) => <span style={{ color: '#0033FF', fontWeight: 'bold' }}>{text}</span>,
    },
    {
      title: '品牌网点',
      key: 'brand_store',
      width: 150,
      render: (_: any, record: WorkOrder) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.brand_name || '-'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.store_name || record.store_id}</div>
        </div>
      ),
    },
    {
      title: '故障描述',
      dataIndex: 'category_path',
      key: 'category_path',
      width: 200,
      render: (path: string[]) => (
        <span>{Array.isArray(path) ? path.join(' > ') : path || '-'}</span>
      ),
    },
    {
      title: '工程师',
      dataIndex: 'engineer_id',
      key: 'engineer_id',
      width: 100,
      render: (id: number) => <span>{id || '-'}</span>,
    },
    {
      title: '留痕状态',
      key: 'trace',
      width: 120,
      render: (_: any, record: WorkOrder) => (
        <Space>
          {record.coordinates && (
            <Tag icon={<EnvironmentOutlined />} color="blue">位置</Tag>
          )}
          {record.photo_urls && record.photo_urls.length > 0 && (
            <Tag icon={<CameraOutlined />} color="green">照片</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: WorkOrder) => (
        <Button 
          size="small" 
          color="primary" 
          onClick={() => handleOrderClick(record.id)}
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WeekCalendar onDateChange={(date) => setSelectedDate(date)} selectedDate={selectedDate} />

      <SearchBar
        placeholder="搜索单号、网点、品牌、工程师姓名..."
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
            <PullToRefresh onRefresh={handleRefresh}>
              <div style={{ padding: 12, minHeight: 400 }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <SpinLoading style={{ "--size": "32px" } as any} />
                  </div>
                ) : orders.length === 0 ? (
                  <EmptyStateIllustration message="当前节点暂无工单，点击右侧按钮发起新任务" />
                ) : (
                  <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <Table
                        columns={columns}
                        dataSource={orders}
                        rowKey="id"
                        rowSelection={rowSelection}
                        pagination={false}
                        scroll={{ x: 800 }}
                        style={{ width: '100%' }}
                      />
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
