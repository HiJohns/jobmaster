import { TabBar as AntTabBar } from 'antd-mobile'
import {
  CompassOutlined,
  FileTextOutlined,
  SendOutlined,
  ToolOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { key: '/inspection', title: '勘查', icon: <CompassOutlined /> },
  { key: '/materials', title: '资料', icon: <FileTextOutlined /> },
  { key: '/dispatch', title: '派工', icon: <SendOutlined /> },
  { key: '/service', title: '服务', icon: <ToolOutlined /> },
  { key: '/cost', title: '费用', icon: <DollarOutlined /> },
]

function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <AntTabBar
      activeKey={location.pathname}
      onChange={(key) => navigate(key)}
    >
      {tabs.map((tab) => (
        <AntTabBar.Item key={tab.key} title={tab.title} icon={tab.icon} />
      ))}
    </AntTabBar>
  )
}

export default TabBar
