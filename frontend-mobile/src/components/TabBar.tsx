import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TabBar as AntTabBar } from 'antd-mobile'

interface TabItem {
  key: string
  title: string
  icon: string
  path: string
}

const TAB_ITEMS: TabItem[] = [
  { key: 'home', title: '首页', icon: '🏠', path: '/wechat/orders' },
  { key: 'profile', title: '我的', icon: '👤', path: '/wechat/profile' },
]

/**
 * TabBar - 底部导航组件
 * 功能：固定在底部，提供页面导航
 */
export default function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeKey, setActiveKey] = useState<string>(() => {
    const currentPath = location.pathname
    const currentTab = TAB_ITEMS.find(tab => 
      currentPath.startsWith(tab.path) || 
      (tab.path === '/wechat/orders' && currentPath === '/')
    )
    return currentTab?.key || 'home'
  })

  /**
   * 处理 Tab 切换
   */
  const handleTabChange = (key: string) => {
    setActiveKey(key)
    const tab = TAB_ITEMS.find(t => t.key === key)
    if (tab) {
      navigate(tab.path)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      borderTop: '1px solid #e8e8e8',
      backgroundColor: '#fff',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
    }}>
      <AntTabBar
        activeKey={activeKey}
        onChange={handleTabChange}
      >
        {TAB_ITEMS.map(item => (
          <AntTabBar.Item 
            key={item.key} 
            title={item.title}
            icon={<div style={{ fontSize: '20px' }}>{item.icon}</div>}
          />
        ))}
      </AntTabBar>
    </div>
  )
}
