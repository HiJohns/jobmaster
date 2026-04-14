import { useNavigate } from 'react-router-dom'
import { Card, Button, List, Toast } from 'antd-mobile'
import { useAuthStore } from '../store/useAuthStore'
import TabBar from '../components/TabBar'

/**
 * ProfilePage - 我的页面
 * 功能：显示用户信息，提供退出登录功能
 */
export default function ProfilePage() {
  const navigate = useNavigate()
  const { userInfo, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    Toast.show('已退出登录')
    setTimeout(() => {
      navigate('/login', { replace: true })
    }, 1000)
  }

  if (!userInfo) {
    return (
      <div style={{ padding: '16px' }}>
        <Card title="提示">
          <div>未登录，请重新登录</div>
          <Button
            block
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/login')}
          >
            去登录
          </Button>
        </Card>
        <TabBar />
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 用户信息卡片 */}
      <Card title="用户信息" style={{ marginBottom: '16px' }}>
        <List>
          <List.Item extra={userInfo.displayName}>姓名</List.Item>
          <List.Item extra={userInfo.username}>用户名</List.Item>
          <List.Item extra={userInfo.role}>角色</List.Item>
          <List.Item extra={userInfo.orgName || '未分配'}>组织</List.Item>
        </List>
      </Card>

      {/* 操作按钮 */}
      <Button
        block
        color="danger"
        style={{ marginTop: '32px' }}
        onClick={handleLogout}
      >
        退出登录
      </Button>

      {/* 底部导航 */}
      <TabBar />
    </div>
  )
}
