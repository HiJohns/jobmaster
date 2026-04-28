import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Space, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { demoApi } from '../api/demo'

const DEMO_ACCOUNTS = [
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

const REMEMBER_USERNAME_KEY = 'remember_username'

/**
 * LoginPage - 登录页面
 * 功能：用户登录、记住用户名、Demo 账号选择
 * 路由：/login
 */
export default function LoginPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)

  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY)
    if (savedUsername) {
      form.setFieldsValue({ username: savedUsername })
      setRememberMe(true)
    }
  }, [form])

  const handleSelectDemo = (username: string) => {
    setSelectedDemo(username)
    form.setFieldsValue({ username, password: 'demo123' })
  }

  const handleSubmit = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true)
    try {
      // Use demo API for login
      const response = await demoApi.login(values.username, values.password)
      
      // Set user role for API filtering
      if (response.user) {
        demoApi.setUserRole(response.user.role)
      }
      
      const user = response.user || {}
      const demoAccount = DEMO_ACCOUNTS.find(acc => acc.username === values.username)
      
      login(response.token, {
        userId: user.id || response.userId || response.user_id || '',
        username: user.username || response.username || values.username,
        displayName: user.displayName || user.display_name || response.displayName || response.display_name || demoAccount?.displayName || values.username,
        role: user.role || response.role || demoAccount?.role || 'EMPLOYEE',
        orgId: user.orgId || user.org_id || response.orgId || response.org_id || '',
        orgName: user.orgName || user.org_name || user.displayName || demoAccount?.displayName || '未分配',
        tenantId: user.tenantId || user.tenant_id || response.tenantId || response.tenant_id || '',
      })

      if (values.remember) {
        localStorage.setItem(REMEMBER_USERNAME_KEY, values.username)
      } else {
        localStorage.removeItem(REMEMBER_USERNAME_KEY)
      }

      Toast.show({
        content: '登录成功',
        icon: 'success',
        duration: 1500
      })

      // 登录成功后跳转到工程师首页
      setTimeout(() => {
        navigate('/wechat/orders')
      }, 1500)
      
    } catch (error) {
      console.error('登录失败:', error)
      Toast.show({
        content: error instanceof Error ? error.message : '登录失败',
        icon: 'fail',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* 标题 */}
      <div style={{ padding: '40px 20px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0033FF', marginBottom: '8px' }}>
          JobMaster Mobile
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>登录您的账号</p>
      </div>

      {/* Demo 账号选择 */}
      <Card style={{ margin: '0 16px 16px', borderRadius: '12px' }}>
        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>快捷登录（演示账号）</div>
          <Space wrap style={{ width: '100%' }}>
            {DEMO_ACCOUNTS.map(account => (
              <Button
                key={account.username}
                size="small"
                style={{
                  '--background-color': selectedDemo === account.username ? '#0033FF' : '#fff',
                  '--text-color': selectedDemo === account.username ? '#fff' : '#0033FF',
                  border: '1px solid #e8e8e8',
                }}
                onClick={() => handleSelectDemo(account.username)}
              >
                {account.displayName}
              </Button>
            ))}
          </Space>
        </div>
      </Card>

      {/* 登录表单 */}
      <Card style={{ margin: '0 16px', borderRadius: '12px' }}>
        <div style={{ padding: '16px' }}>
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            footer={
              <Button
                block
                type="submit"
                color="primary"
                size="large"
                loading={loading}
                style={{
                  '--background-color': '#0033FF',
                  '--border-radius': '8px',
                  height: '48px',
                  fontSize: '16px',
                }}
              >
                登录
              </Button>
            }
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
              ]}
            >
              <Input placeholder="请输入用户名" clearable />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
              ]}
            >
              <Input placeholder="请输入密码" clearable type="password" />
            </Form.Item>

            <Form.Item name="remember" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#666' }}>记住用户名</span>
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>
                  所有账号密码：demo123
                </div>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  )
}
