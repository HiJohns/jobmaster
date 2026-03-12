import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/useAuthStore'
import Logo from '../components/Logo'

const REMEMBER_USERNAME_KEY = 'remember_username'

function Login() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY)
    if (savedUsername) {
      form.setFieldsValue({ username: savedUsername })
      setRememberMe(true)
    }
  }, [form])

  const handleSubmit = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true)
    try {
      const response = await authApi.login(values)
      
      if (response.code === 200) {
        const { token, user_id, username, role, org_id, tenant_id, display_name, is_impersonated } = response.data
        
        // Store auth data
        login(token, {
          userId: user_id,
          username,
          displayName: display_name,
          role,
          orgId: org_id,
          tenantId: tenant_id,
        }, is_impersonated)
        
        // Remember username
        if (values.remember) {
          localStorage.setItem(REMEMBER_USERNAME_KEY, values.username)
        } else {
          localStorage.removeItem(REMEMBER_USERNAME_KEY)
        }
        
        message.success('登录成功')
        navigate('/')
      }
    } catch (error) {
      // Error is already handled and displayed by axios interceptor
      console.error('Login failed:', error)
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
