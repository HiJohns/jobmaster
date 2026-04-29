import { Table, Card, Tag, Space, Tabs } from 'antd'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import dayjs from 'dayjs'

interface QuotationItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

interface Quotation {
  id: string
  workOrderNo: string
  workOrderId: string
  submitterOrg: string
  submitterRole: string
  items: QuotationItem[]
  totalPrice: number
  status: 'pending' | 'accepted' | 'rejected' | 'processed'
  createdAt: string
}

const statusConfig: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  processed: { text: '已处理', color: 'blue' },
  accepted: { text: '接受', color: 'green' },
  rejected: { text: '拒绝', color: 'red' },
}

const dummyQuotations: Quotation[] = [
  {
    id: 'q-001',
    workOrderNo: 'WO-20260414-B1-0001',
    workOrderId: 'jm-wo-001',
    submitterOrg: 'Vendor X',
    submitterRole: 'VENDOR_EMPLOYEE',
    items: [
      { id: 'qi-1', name: '防火门把手', unitPrice: 150, quantity: 2 },
      { id: 'qi-2', name: '安装人工费', unitPrice: 200, quantity: 1 },
    ],
    totalPrice: 500,
    status: 'pending',
    createdAt: '2026-04-28T10:00:00Z',
  },
  {
    id: 'q-002',
    workOrderNo: 'WO-20260414-B1-0002',
    workOrderId: 'jm-wo-002',
    submitterOrg: 'Contractor A',
    submitterRole: 'CONTRACTOR_EMPLOYEE',
    items: [
      { id: 'qi-3', name: '空调加氟', unitPrice: 300, quantity: 1 },
      { id: 'qi-4', name: '检修费', unitPrice: 150, quantity: 1 },
    ],
    totalPrice: 450,
    status: 'processed',
    createdAt: '2026-04-27T14:00:00Z',
  },
  {
    id: 'q-003',
    workOrderNo: 'WO-20260414-B1-0003',
    workOrderId: 'jm-wo-003',
    submitterOrg: 'Vendor X',
    submitterRole: 'VENDOR_EMPLOYEE',
    items: [
      { id: 'qi-5', name: '电梯检修', unitPrice: 800, quantity: 1 },
      { id: 'qi-6', name: '配件更换', unitPrice: 350, quantity: 2 },
    ],
    totalPrice: 1500,
    status: 'rejected',
    createdAt: '2026-04-26T09:30:00Z',
  },
  {
    id: 'q-004',
    workOrderNo: 'WO-20260414-B1-0001',
    workOrderId: 'jm-wo-001',
    submitterOrg: 'Contractor A',
    submitterRole: 'CONTRACTOR_EMPLOYEE',
    items: [
      { id: 'qi-7', name: '防火门把手', unitPrice: 180, quantity: 2 },
      { id: 'qi-8', name: '安装人工费', unitPrice: 250, quantity: 1 },
      { id: 'qi-9', name: '管理费(10%)', unitPrice: 61, quantity: 1 },
    ],
    totalPrice: 671,
    status: 'pending',
    createdAt: '2026-04-28T11:00:00Z',
  },
  {
    id: 'q-005',
    workOrderNo: 'WO-20260414-B1-0004',
    workOrderId: 'jm-wo-004',
    submitterOrg: 'Vendor Y',
    submitterRole: 'VENDOR_EMPLOYEE',
    items: [
      { id: 'qi-10', name: '灭火器更换', unitPrice: 120, quantity: 5 },
    ],
    totalPrice: 600,
    status: 'accepted',
    createdAt: '2026-04-25T16:00:00Z',
  },
]

export default function QuotationList() {
  const { userInfo } = useAuthStore()
  const role = userInfo?.role || ''

  const isVendor = role === 'VENDOR_ADMIN' || role === 'VENDOR_EMPLOYEE'
  const isContractor = role === 'CONTRACTOR_ADMIN' || role === 'CONTRACTOR_EMPLOYEE'
  const isBranch = role === 'BRANCH_ADMIN' || role === 'EMPLOYEE'

  const baseColumns = [
    {
      title: '工单号',
      dataIndex: 'workOrderNo',
      key: 'workOrderNo',
      render: (text: string, record: Quotation) => (
        <Link to={`/quotations/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '报价总价',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || 'default'}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Quotation) => (
        <Link to={`/quotations/${record.id}`}>查看详情</Link>
      ),
    },
  ]

  const vendorColumns = baseColumns

  const contractorReceivedColumns = [
    {
      title: '工单号',
      dataIndex: 'workOrderNo',
      key: 'workOrderNo',
      render: (text: string, record: Quotation) => (
        <Link to={`/quotations/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'submitterOrg',
      key: 'submitterOrg',
    },
    {
      title: '报价总价',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || 'default'}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Quotation) => (
        <Link to={`/quotations/${record.id}`}>查看详情</Link>
      ),
    },
  ]

  const branchColumns = [
    {
      title: '工单号',
      dataIndex: 'workOrderNo',
      key: 'workOrderNo',
      render: (text: string, record: Quotation) => (
        <Link to={`/quotations/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '工程公司',
      dataIndex: 'submitterOrg',
      key: 'submitterOrg',
    },
    {
      title: '报价总价',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || 'default'}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Quotation) => (
        <Link to={`/quotations/${record.id}`}>查看详情</Link>
      ),
    },
  ]

  const vendorData = dummyQuotations.filter(
    (q) => q.submitterRole === 'VENDOR_EMPLOYEE'
  )

  const contractorOwnData = dummyQuotations.filter(
    (q) => q.submitterRole === 'CONTRACTOR_EMPLOYEE'
  )
  const contractorReceivedData = dummyQuotations.filter(
    (q) => q.submitterRole === 'VENDOR_EMPLOYEE'
  )

  const branchData = dummyQuotations.filter(
    (q) => q.submitterRole === 'CONTRACTOR_EMPLOYEE'
  )

  if (isVendor) {
    return (
      <Card title="我的报价">
        <Table
          columns={vendorColumns}
          dataSource={vendorData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    )
  }

  if (isContractor) {
    return (
      <Card title="报价管理">
        <Tabs
          defaultActiveKey="own"
          items={[
            {
              key: 'own',
              label: '我发起的报价',
              children: (
                <Table
                  columns={baseColumns}
                  dataSource={contractorOwnData}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'received',
              label: '收到的报价',
              children: (
                <Table
                  columns={contractorReceivedColumns}
                  dataSource={contractorReceivedData}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>
    )
  }

  if (isBranch) {
    return (
      <Card title="收到的报价">
        <Table
          columns={branchColumns}
          dataSource={branchData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    )
  }

  return (
    <Card title="报价管理">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          当前角色无报价管理权限
        </div>
      </Space>
    </Card>
  )
}
