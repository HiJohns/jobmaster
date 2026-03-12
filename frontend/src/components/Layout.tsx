import { Layout as AntLayout, Menu, Avatar, Dropdown, Breadcrumb } from 'antd'
import {
  HomeTwoTone,
  FileTextTwoTone,
  SettingTwoTone,
  UserOutlined,
  BankOutlined,
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
      children: [
        {
          key: '/admin/tenants',
          label: '租户管理',
          icon: <BankOutlined />,
        },
      ],
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
    } else if (key === '/admin/tenants') {
      navigate(key)
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
  const getTenantDisplayName = () => {
    if (userInfo?.role === 'SYSTEM_ADMIN' || userInfo?.role === 'Brand HQ' || userInfo?.role === 'BRAND_HQ') {
      return '系统管理后台'
    }
    return userInfo?.displayName || '分店'
  }

  // Sidebar footer user info component
  const SidebarUserInfo = () => (
    <Dropdown
      menu={{ items: userMenuItems, onClick: handleMenuClick }}
      placement="topRight"
      trigger={['click']}
    >
      <div
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          transition: 'background-color 0.2s',
        }}
        className="hover:bg-white/5"
        onClick={(e) => e.preventDefault()}
      >
        <Avatar
          icon={<UserOutlined />}
          size="large"
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            color: '#fff',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '20px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {getTenantDisplayName()}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            lineHeight: '18px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {userInfo?.role || 'User'}
          </div>
        </div>
      </div>
    </Dropdown>
  )

  return (
    <AntLayout className="min-h-screen">
      {!isMobile && (
        <Sider
          theme="dark"
          className="shadow-md"
          breakpoint="lg"
          collapsedWidth="0"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Logo Section - 80px height (8px * 10) */}
          <div style={{
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '0 16px',
          }}>
            <Logo size={36} theme="light" showText={true} layout="horizontal" />
          </div>

          {/* Menu Section - flex: 1 to take remaining space */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={['/' + location.pathname.split('/')[1]]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                backgroundColor: 'transparent',
                borderRight: 'none',
                padding: '16px 0',
              }}
            />
          </div>

          {/* User Info at Sidebar Bottom */}
          <SidebarUserInfo />
        </Sider>
      )}
      
      <AntLayout>
        {/* Header - 64px height */}
        <Header
          style={{
            padding: '0 24px',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 33, 0.08)',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: '64px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Breadcrumb items={getBreadcrumbItems()} />
          </div>
          
          {/* Right side - simplified, user info moved to sidebar */}
          <div style={{ marginLeft: 'auto' }}>
            {/* User info moved to sidebar bottom */}
          </div>
        </Header>
        
        <Content style={{ background: 'var(--bg-color)', overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </Content>
        
        {isMobile && <TabBar />}
      </AntLayout>
    </AntLayout>
  )
}

export default AppLayout
