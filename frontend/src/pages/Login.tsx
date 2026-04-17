import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Checkbox, Space, Tag, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { localAuthApi, initializeMockData } from '../api/local'
import Logo from '../components/Logo'
import { demoApi, setUserRole } from '../api/factory'

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

function Login() {
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
      initializeMockData()
      // Use demoApi for login
      console.log('[DEBUG Login] calling demoApi.login')
      const response = await demoApi.login(values.username, values.password)
      console.log('[DEBUG Login] response:', response)
      const user = response.user || {}
      
      // Set user role for API filtering
      if (user.role) {
        console.log('[DEBUG Login] setting user role:', user.role)
        setUserRole(user.role)
      }
      
      login(response.token, {
        userId: user.id || response.user_id || '',
        username: user.username || response.username || '',
        displayName: user.displayName || response.display_name || '',
        role: user.role || response.role || '',
        orgId: user.orgId || response.org_id || '',
        orgName: user.orgName || response.org_name || '',
        tenantId: user.tenantId || response.tenant_id || '',
      })

      if (values.remember) {
        localStorage.setItem(REMEMBER_USERNAME_KEY, values.username)
      } else {
        localStorage.removeItem(REMEMBER_USERNAME_KEY)
      }

      message.success('登录成功')

      if (response.role === 'ENGINEER') {
        navigate('/engineer')
      } else if (response.role === 'CONTRACTOR_ADMIN' || response.role === 'CONTRACTOR_EMPLOYEE') {
        navigate('/contractor')
      } else if (response.role === 'VENDOR_ADMIN' || response.role === 'VENDOR_EMPLOYEE') {
        navigate('/vendor')
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Login failed:', error)
      message.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <div className="flex flex-col items-center">
        <div className="mb-8">
          <Logo size={60} theme="dark" showText={true} />
        </div>
        
        <Card 
          className="w-full shadow-card border border-white/60 transition-all hover:shadow-lg"
          style={{ 
            maxWidth: 400, 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 33, 0.15)',
          }}
        >
          <div style={{ marginBottom: '24px' }} />
          
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">快速选择演示账户:</div>
            <Space wrap size={4}>
              {DEMO_ACCOUNTS.map((account) => (
                <Tag
                  key={account.username}
                  color={selectedDemo === account.username ? 'blue' : 'default'}
                  style={{ cursor: 'pointer', marginBottom: '4px' }}
                  onClick={() => handleSelectDemo(account.username)}
                >
                  {account.displayName}
                </Tag>
              ))}
            </Space>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                className="breath-input"
                prefix={<UserOutlined />}
                placeholder="用户名"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                className="breath-input"
                prefix={<LockOutlined />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full h-10 text-lg rounded-md transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--primary-blue)' }}
              >
                登录
              </Button>
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked">
              <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
                记住账号
              </Checkbox>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  )
}

export default Login