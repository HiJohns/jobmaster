
import { Layout as AntLayout, Menu, Avatar, Dropdown, Breadcrumb, Tag } from 'antd'
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
import TabBar from './TabBar'

const { Header, Sider, Content } = AntLayout

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, isImpersonated, logout } = useAuthStore()
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
      console.log('Navigate to profile')
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
  const getTenantName = () => {
    if (userInfo?.role === 'SYSTEM_ADMIN' || userInfo?.role === 'Brand HQ' || userInfo?.role === 'BRAND_HQ') {
      return '系统管理后台'
    }
    return userInfo?.displayName || '分店控制台'
  }

  return (
    <AntLayout className="min-h-screen">
      {!isMobile && (
        <Sider
          theme="dark"
          className="shadow-md"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <div className="h-16 flex items-center justify-center border-b border-gray-800">
            <h1 className="text-xl font-bold text-primary">JobMaster</h1>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={['/' + location.pathname.split('/')[1]]}
            items={menuItems}
            onClick={handleMenuClick}
            className="border-r-0"
          />
        </Sider>
      )}
      
      <AntLayout>
        <Header 
          className="bg-white shadow-sm flex items-center justify-between px-6"
          style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100 }}
        >
          <div className="flex items-center gap-4">
            <Breadcrumb items={getBreadcrumbItems()} />
            {isImpersonated && (
              <Tag color="warning" className="ml-2">只读模式</Tag>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-gray-600 font-medium">
              {getTenantName()}
            </span>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleMenuClick }}
              placement="bottomRight"
            >
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-1 rounded transition-colors">
                <Avatar icon={<UserOutlined />} size="small" />
                <span className="text-gray-600 text-sm">
                  {userInfo?.username || 'User'}
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
