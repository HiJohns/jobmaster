import { useState } from 'react'
import { Button, Space } from 'antd'

interface DemoAccount {
  username: string
  displayName: string
  role: string
  password: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'admin@branch1', displayName: 'Branch Admin', role: 'BRANCH_ADMIN', password: 'demo123' },
  { username: 'employee1@branch1', displayName: 'Branch Employee', role: 'EMPLOYEE', password: 'demo123' },
  { username: 'admin@contractor1', displayName: 'Contractor Admin', role: 'CONTRACTOR_ADMIN', password: 'demo123' },
  { username: 'employee1@contractor1', displayName: 'Contractor Employee', role: 'CONTRACTOR_EMPLOYEE', password: 'demo123' },
  { username: 'engineer1@contractor1', displayName: 'Engineer 1', role: 'ENGINEER', password: 'demo123' },
  { username: 'engineer2@contractor1', displayName: 'Engineer 2', role: 'ENGINEER', password: 'demo123' },
  { username: 'admin@vendor1', displayName: 'Vendor Admin', role: 'VENDOR_ADMIN', password: 'demo123' },
  { username: 'employee1@vendor1', displayName: 'Vendor Employee', role: 'VENDOR_EMPLOYEE', password: 'demo123' },
  { username: 'engineer1@vendor1', displayName: 'Vendor Engineer', role: 'ENGINEER', password: 'demo123' },
  { username: 'admin@contractor2', displayName: 'Contractor 2 Admin', role: 'CONTRACTOR_ADMIN', password: 'demo123' },
]

interface QuickSelectProps {
  onSelect?: (account: DemoAccount) => void
}

export const DemoAccountSelector: React.FC<QuickSelectProps> = ({ onSelect }) => {
  const [selected, setSelected] = useState<string>('')

  const handleSelect = (username: string) => {
    setSelected(username)
    const account = DEMO_ACCOUNTS.find((a) => a.username === username)
    if (account && onSelect) {
      onSelect(account)
    }
  }

  return (
    <div className="mb-4">
      <div className="text-sm text-gray-500 mb-2">快速选择演示账户:</div>
      <Space wrap size={4}>
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.username}
            size="small"
            type={selected === account.username ? 'primary' : 'default'}
            onClick={() => handleSelect(account.username)}
          >
            {account.displayName}
          </Button>
        ))}
      </Space>
    </div>
  )
}

export default DemoAccountSelector