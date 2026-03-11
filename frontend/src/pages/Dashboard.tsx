import { Layout, Menu, Avatar, Dropdown } from 'antd'
import {
  HomeTwoTone,
  FileTextTwoTone,
  SettingTwoTone,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

const { Header, Sider, Content } = Layout

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout } = useAuthStore()

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
      // Navigate to profile page
      console.log('Navigate to profile')
    } else {
      navigate(key)
    }
  }

  return (
    <Layout className="min-h-screen">
      <Sider
        theme="dark"
        className="shadow-md"
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div className="h-16 flex items-center justify-center border-b">
          <h1 className="text-xl font-bold text-primary">JobMaster</h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-r-0"
        />
      </Sider>
      
      <Layout>
        <Header className="bg-white shadow-sm flex items-center justify-between px-6">
          <div className="text-lg font-medium">工单管理系统</div>
          
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleMenuClick }}
            placement="bottomRight"
          >
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded">
              <Avatar icon={<UserOutlined />} />
              <span>{userInfo?.displayName || userInfo?.username}</span>
            </div>
          </Dropdown>
        </Header>
        
        <Content className="m-6 p-6 card-layout">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">欢迎使用 JobMaster</h2>
            <p className="text-gray-500">智能工单管理系统</p>
            <div className="mt-8">
              <p>当前用户: {userInfo?.displayName}</p>
              <p>角色: {userInfo?.role}</p>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default Dashboard