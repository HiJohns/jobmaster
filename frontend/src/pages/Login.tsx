import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Checkbox, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { initializeMockData } from '../api/local'
import { demoApi, setUserRole } from '../api/factory'

interface DemoOrg {
  name: string
  label: string
  accounts: { username: string; displayName: string }[]
}

const DEMO_ORGS: DemoOrg[] = [
  {
    name: '寿司郎太阳宫店',
    label: '寿司郎太阳宫店',
    accounts: [
      { username: 'admin@branch1', displayName: '管理员' },
      { username: 'employee1@branch1', displayName: '职员' },
    ],
  },
  {
    name: '建王',
    label: '建王（工程公司）',
    accounts: [
      { username: 'admin@contractor1', displayName: '管理员' },
      { username: 'employee1@contractor1', displayName: '职员' },
      { username: 'engineer1@contractor1', displayName: '工程师1' },
      { username: 'engineer2@contractor1', displayName: '工程师2' },
    ],
  },
  {
    name: '希望',
    label: '希望（工程公司）',
    accounts: [
      { username: 'admin@contractor2', displayName: '管理员' },
      { username: 'employee1@contractor2', displayName: '职员' },
      { username: 'engineer1@contractor2', displayName: '工程师1' },
      { username: 'engineer2@contractor2', displayName: '工程师2' },
    ],
  },
  {
    name: '森泉',
    label: '森泉（供应商）',
    accounts: [
      { username: 'admin@vendor1', displayName: '管理员' },
      { username: 'employee1@vendor1', displayName: '职员' },
      { username: 'engineer1@vendor1', displayName: '工程师' },
    ],
  },
  {
    name: '相川',
    label: '相川（供应商）',
    accounts: [
      { username: 'admin@相川', displayName: '管理员' },
      { username: 'employee1@相川', displayName: '职员' },
      { username: 'engineer1@相川', displayName: '工程师1' },
      { username: 'engineer2@相川', displayName: '工程师2' },
    ],
  },
]

const REMEMBER_USERNAME_KEY = 'remember_username'

function Login() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)

  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY)
    if (savedUsername) {
      form.setFieldsValue({ username: savedUsername })
      setRememberMe(true)
    }
  }, [form])

  const handleSelectOrg = (orgName: string) => {
    setSelectedOrg(orgName)
    setSelectedDemo(null)
  }

  const handleSelectDemo = (username: string) => {
    setSelectedDemo(username)
    form.setFieldsValue({ username, password: 'demo123' })
  }

  const handleSubmit = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true)
    try {
      localStorage.removeItem('auth-storage')
      localStorage.removeItem('jobmaster-auth-storage')
      initializeMockData()

      const response = await demoApi.login(values.username, values.password)
      console.log('[DEBUG Login] response:', response)
      const user = response.user || {}

      if (user.role) {
        setUserRole(user.role)
      }

      login(response.token, {
        userId: user.id || response.user_id || '',
        username: user.username || response.username || '',
        displayName: user.displayName || response.display_name || '',
        role: user.role || response.role || '',
        orgId: user.orgId || response.org_id || '',
        orgName: user.orgName || response.org_name || '',
        orgAddress: user.orgAddress || '',
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
          <img
            src="/logo.png"
            alt="工单匠"
            style={{ width: '160px', height: 'auto', margin: '0 auto', display: 'block' }}
          />
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

          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">选择公司：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              {DEMO_ORGS.map((org) => (
                <span
                  key={org.name}
                  onClick={() => handleSelectOrg(org.name)}
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: selectedOrg === org.name ? '#C45C4E' : '#f0f0f0',
                    color: selectedOrg === org.name ? '#fff' : '#333',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  {org.label}
                </span>
              ))}
            </div>

            {selectedOrg && (
              <>
                <div className="text-sm text-gray-500 mb-1">选择账号：</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {DEMO_ORGS.find(o => o.name === selectedOrg)!.accounts.map((acc) => (
                    <span
                      key={acc.username}
                      onClick={() => handleSelectDemo(acc.username)}
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: selectedDemo === acc.username ? '#C45C4E' : '#f5f5f5',
                        color: selectedDemo === acc.username ? '#fff' : '#333',
                        border: '1px solid #e8e8e8',
                      }}
                    >
                      {acc.displayName}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Login