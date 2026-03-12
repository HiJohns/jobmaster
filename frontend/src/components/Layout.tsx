
import { Layout as AntLayout, Menu, Avatar, Dropdown, Breadcrumb } from 'antd'
import {
  HomeTwoTone,
  FileTextTwoTone,
  SettingTwoTone,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'
import { useAuthStore } from '../store/useAuthStore'
import Logo from './Logo'
import TabBar from './TabBar'

const { Header, Sider, Content } = AntLayout

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout } = useAuthStore()
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' })

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeTwoTone twoToneColor="#0033FF" />,
      label: '首页',
    },
    {
      key: '/workorders',
      icon: <FileTextTwoTone twoToneColor="#0033FF" />,
      label: '工单管理',
    },
    {
      key: '/settings',
      icon: <SettingTwoTone twoToneColor="#0033FF" />,
      label: '系统设置',
    },
  ]

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else if (key === 'profile') {
      // TODO: Navigate to profile page when implemented
    } else {
      navigate(key)
    }
  }

  // Breadcrumb logic
  const getBreadcrumbItems = () => {
    const path = location.pathname
    const items = [{ title: '首页' }]
    
    if (path.startsWith('/workorders')) {
      items.push({ title: '工单管理' })
    } else if (path.startsWith('/workorder/')) {
      items.push({ title: '工单管理' })
      items.push({ title: '工单详情' })
    } else if (path.startsWith('/settings')) {
      items.push({ title: '系统设置' })
    }
    
    return items
  }

  // Semantic tenant name
  return (
    <AntLayout className="min-h-screen">
      {!isMobile && (
        <Sider
          theme="dark"
          className="shadow-md"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <div className="h-20 flex items-center justify-center border-b border-gray-800">
            <Logo size={32} theme="light" showText={false} />
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={['/' + location.pathname.split('/')[1]]}
            items={menuItems}
            onClick={handleMenuClick}
            className="border-r-0"
            style={{
              backgroundColor: '#000c17',
              borderRight: 'none',
              padding: '12px 0',
            }}
          />
        </Sider>
      )}
      
      <AntLayout>
                <Header
          className="bg-white shadow-md flex items-center justify-between px-8"
          style={{
            padding: '0 32px',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 33, 0.08)',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: '64px',
          }}
        >
          <div className="flex items-center gap-4">
            <Breadcrumb items={getBreadcrumbItems()} />
            {/* Removed read-only tag from header */}
          </div>
          
          <div className="flex items-center gap-6 ml-auto">
            <span className="text-gray-600 font-medium text-sm mr-2">
              {userInfo?.displayName || userInfo?.username || '管理员'}
            </span>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleMenuClick }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
                onClick={(e) => e.preventDefault()}
                style={{ userSelect: 'none' }}
              >
                <Avatar 
                  icon={<UserOutlined />} 
                  size="default"
                  style={{ 
                    backgroundColor: '#f0f0f0',
                    color: '#666'
                  }}
                />
                <span className="text-gray-600 text-sm font-medium">
                  {userInfo?.role || 'User'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{ background: 'var(--bg-color)', overflow: 'auto' }}>
          <Outlet />
        </Content>
        {isMobile && (
          <TabBar />
        )}
      </AntLayout>
    </AntLayout>
  )
}

export default AppLayout
