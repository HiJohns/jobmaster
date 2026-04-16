import { Layout as AntLayout, Menu, Avatar, Dropdown, Breadcrumb, Button, Calendar, ConfigProvider } from 'antd'
import {
  HomeTwoTone,
  FileTextTwoTone,
  SettingTwoTone,
  UserOutlined,
  BankOutlined,
  LogoutOutlined,
  AppstoreTwoTone,
  CloseOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'
import { useAuthStore } from '../store/useAuthStore'
import Logo from './Logo'
import TabBar from './TabBar'
import '../styles/sidebar.css'
import { useEffect, useState } from 'react'
import zhCN from 'antd/es/locale/zh_CN'

const { Header, Sider, Content } = AntLayout

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout, isImpersonated, exitImpersonation } = useAuthStore()
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' })
  const [collapsed, setCollapsed] = useState(false)
  const [logoText, setLogoText] = useState('JobMaster')
  const [logoColor, setLogoColor] = useState('#0033FF')

  // Load brand config on mount
  useEffect(() => {
    const brandConfig = localStorage.getItem('brand_config')
    if (brandConfig) {
      try {
        const config = JSON.parse(brandConfig)
        setLogoText(config.brand_name || 'JobMaster')
        setLogoColor(config.primary_color || '#0033FF')
      } catch (err) {
        console.warn('Failed to parse brand config:', err)
      }
    }
  }, [])

  function handleExitImpersonation(): void {
    exitImpersonation()
  }

  const ImpersonationBanner = () => {
    if (!isImpersonated) return null
    
    return (
      <div style={{
        background: 'linear-gradient(90deg, #8B5CF6 0%, #7C3AED 100%)',
        color: '#fff',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
      }}>
        <div>
          <span>当前身份：代入租户 </span>
          <strong>{userInfo?.displayName || userInfo?.tenantId}</strong>
          <span> | 正在以管理员视角操作</span>
        </div>
        <Button 
          type="text" 
          size="small" 
          icon={<CloseOutlined />}
          onClick={handleExitImpersonation}
          style={{ color: '#fff' }}
        >
          退出代入
        </Button>
      </div>
    )
  }

  // Filter menu based on role (hide unrelated menus for engineers)
  const isEngineer = userInfo?.role === 'ENGINEER'
  const menuItems: MenuProps['items'] = []
  
  menuItems.push({
    key: '/',
    icon: <HomeTwoTone twoToneColor={logoColor} />,
    label: '首页',
  })
  
  if (!isEngineer) {
    menuItems.push({
      key: '/assets',
      icon: <AppstoreTwoTone twoToneColor={logoColor} />,
      label: '资产监控',
    })
  }
  
  menuItems.push({
    key: '/workorders',
    icon: <FileTextTwoTone twoToneColor={logoColor} />,
    label: '工单管理',
  })
  
  if (!isEngineer) {
    menuItems.push({
      key: '/settings',
      icon: <SettingTwoTone twoToneColor={logoColor} />,
      label: '系统设置',
      children: collapsed ? undefined : [
        {
          key: '/admin/tenants',
          label: '租户管理',
          icon: <BankOutlined />,
        },
      ],
    })
  }

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
    type BreadcrumbItem = {
      title: string
      onClick?: (e: React.MouseEvent) => void
    }
    const items: BreadcrumbItem[] = [
      { 
        title: '首页',
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          navigate('/')
        }
      }
    ]
    
    if (path.startsWith('/workorders')) {
      items.push({ title: '工单管理' })
    } else if (path.startsWith('/workorder/')) {
      items.push({ 
        title: '工单管理',
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          navigate('/workorders')
        }
      })
      items.push({ title: '工单详情' })
    } else if (path.startsWith('/assets')) {
      items.push({ title: '资产监控' })
    } else if (path.startsWith('/admin/tenants')) {
      items.push({ 
        title: '系统设置',
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          navigate('/settings')
        }
      })
      items.push({ title: '租户管理' })
    } else if (path.startsWith('/settings')) {
      items.push({ title: '系统设置' })
    }
    
    return items
  }

  // Collapsed sidebar user info (only avatar)
  const SidebarUserInfoCollapsed = () => (
    <div
      style={{
        padding: '16px 8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
      onClick={(e) => e.preventDefault()}
    >
      <Avatar
        icon={<UserOutlined />}
        size="large"
        style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          color: '#fff',
        }}
      />
    </div>
  )

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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {userInfo?.displayName || 'User'}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '12px',
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
    <ConfigProvider locale={zhCN}>
      <AntLayout className="min-h-screen">
        <ImpersonationBanner />
        {!isMobile && (
          <Sider
            theme="dark"
            className="shadow-md"
            breakpoint="lg"
            collapsedWidth="60"
            collapsed={collapsed}
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
              padding: '0 8px',
            }}>
              {collapsed ? (
                <Logo size={24} theme="light" showText={false} layout="horizontal" />
              ) : (
                <Logo size={36} theme="light" showText={true} layout="horizontal" />
              )}
            </div>

            {/* Toggle Button */}
            <div style={{
              position: 'absolute',
              top: '90px',
              right: collapsed ? '-12px' : '-12px',
              zIndex: 10,
            }}>
              <Button
                type="primary"
                shape="circle"
                size="small"
                icon={collapsed ? '＞' : '＜'}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: logoColor,
                  border: 'none',
                }}
              />
            </div>

            {/* Menu Section - flex: 1 to take remaining space */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={['/' + location.pathname.split('/')[1]]}
                items={menuItems}
                onClick={handleMenuClick}
                className="tenant-admin-sidebar"
                style={{
                  backgroundColor: 'transparent',
                  borderRight: 'none',
                  padding: '16px 0',
                }}
                inlineCollapsed={collapsed}
              />
            </div>

            {/* User Info at Sidebar Bottom */}
            {collapsed ? <SidebarUserInfoCollapsed /> : <SidebarUserInfo />}
            
            {/* Logo Text in collapsed mode */}
            {collapsed && (
              <div style={{
                padding: '16px 8px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}>
                {logoText}
              </div>
            )}
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
          
          <div style={{ display: 'flex', flex: 1 }}>
            <Content style={{ background: 'var(--bg-color)', overflow: 'auto', padding: '24px', flex: 1 }}>
              <Outlet />
            </Content>
            
            {/* Right Sidebar - Compact Calendar */}
            {!isMobile && (
              <div style={{ 
                width: '220px', 
                background: '#fff', 
                padding: '16px', 
                borderLeft: '1px solid #f0f0f0',
                marginTop: '64px' // Header height
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    marginBottom: '12px',
                    color: '#1f2937'
                  }}>
                    日历
                  </div>
                  <Calendar 
                    fullscreen={false}
                    onSelect={(date) => {
                      // Update selected date in URL
                      const dateStr = date.format('YYYY-MM-DD')
                      navigate(`?date=${dateStr}`)
                    }}
                  />
                </div>
                
                {/* Add other compact widgets here */}
              </div>
            )}
          </div>
          
          {isMobile && <TabBar />}
        </AntLayout>
      </AntLayout>
    </ConfigProvider>
  )
}
export default AppLayout
