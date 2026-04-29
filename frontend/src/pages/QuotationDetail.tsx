import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, Descriptions, Tag, Button, InputNumber, Space, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
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

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()
  const role = userInfo?.role || ''

  const quotation = dummyQuotations.find((q) => q.id === id)

  const [status, setStatus] = useState<Quotation['status']>(
    quotation?.status || 'pending'
  )
  const [markupPercent, setMarkupPercent] = useState<number>(0)

  if (!quotation) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          报价不存在
        </div>
      </Card>
    )
  }

  const isVendor = role === 'VENDOR_ADMIN' || role === 'VENDOR_EMPLOYEE'
  const isContractor = role === 'CONTRACTOR_ADMIN' || role === 'CONTRACTOR_EMPLOYEE'
  const isBranch = role === 'BRANCH_ADMIN' || role === 'EMPLOYEE'

  const isOwnQuotation =
    (isVendor && quotation.submitterRole === 'VENDOR_EMPLOYEE') ||
    (isContractor && quotation.submitterRole === 'CONTRACTOR_EMPLOYEE')

  const isVendorToContractor =
    isContractor && quotation.submitterRole === 'VENDOR_EMPLOYEE'

  const isContractorToBranch =
    isBranch && quotation.submitterRole === 'CONTRACTOR_EMPLOYEE'

  const newTotalPrice = quotation.totalPrice * (1 + markupPercent / 100)

  const itemColumns = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '小计',
      key: 'subtotal',
      render: (_: unknown, record: QuotationItem) =>
        `¥${(record.unitPrice * record.quantity).toFixed(2)}`,
    },
  ]

  const handleAccept = () => {
    setStatus('processed')
    message.success('已接受报价')
  }

  const handleReject = () => {
    setStatus('rejected')
    message.info('已拒绝报价')
  }

  const handleSubmitWithMarkup = () => {
    setStatus('processed')
    message.success(`报价已提交，加利比例 ${markupPercent}%，新总价 ¥${newTotalPrice.toFixed(2)}`)
  }

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/quotations')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card title={`报价详情 - ${quotation.workOrderNo}`}>
        <Descriptions column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="工单号">
            {quotation.workOrderNo}
          </Descriptions.Item>
          <Descriptions.Item label="提交方">
            {quotation.submitterOrg}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusConfig[status]?.color || 'default'}>
              {statusConfig[status]?.text || status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(quotation.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>

        <Table
          columns={itemColumns}
          dataSource={quotation.items}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ marginBottom: 16 }}
        />

        <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 600, marginBottom: 24 }}>
          报价总价：¥{quotation.totalPrice.toFixed(2)}
        </div>

        {isOwnQuotation && (
          <div style={{ color: '#999', textAlign: 'center', padding: '16px 0' }}>
            此为您提交的报价，当前状态为只读
          </div>
        )}

        {isVendorToContractor && status === 'pending' && (
          <Card
            title="供应商报价审核"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <div style={{ marginBottom: 16 }}>
              <span>加利比例（%）： </span>
              <InputNumber
                min={0}
                max={100}
                value={markupPercent}
                onChange={(val) => setMarkupPercent(val || 0)}
                addonAfter="%"
                style={{ width: 180 }}
              />
            </div>
            <div style={{ fontSize: '14px', marginBottom: 16 }}>
              新总价 = ¥{quotation.totalPrice.toFixed(2)} × (1 + {markupPercent}%)
              = <strong>¥{newTotalPrice.toFixed(2)}</strong>
            </div>
            <Space>
              <Button type="primary" onClick={handleSubmitWithMarkup}>
                提交报价（加利）
              </Button>
              <Button danger onClick={handleReject}>
                拒绝
              </Button>
            </Space>
          </Card>
        )}

        {isContractorToBranch && status === 'pending' && (
          <Card title="工程公司报价审核" size="small">
            <div style={{ fontSize: '14px', marginBottom: 16 }}>
              报价总价：<strong>¥{quotation.totalPrice.toFixed(2)}</strong>
            </div>
            <Space>
              <Button type="primary" onClick={handleAccept}>
                接受
              </Button>
              <Button danger onClick={handleReject}>
                拒绝
              </Button>
            </Space>
          </Card>
        )}

        {status !== 'pending' && !isOwnQuotation && (
          <div style={{ textAlign: 'center', color: '#999', padding: '16px 0' }}>
            此报价已处理，状态：
            <Tag color={statusConfig[status]?.color || 'default'}>
              {statusConfig[status]?.text || status}
            </Tag>
          </div>
        )}
      </Card>
    </div>
  )
}
