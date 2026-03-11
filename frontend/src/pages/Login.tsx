import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/useAuthStore'

const { Title } = Typography
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-100 to-indigo-100">
      <Card className="w-full shadow-card border border-white/50" style={{ maxWidth: 400, background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', borderRadius: 16 }}>
        <div className="text-center mb-8">
          <Title level={3} className="!text-primary !mb-2">
            JobMaster
          </Title>
          <p className="text-gray-500">智能工单管理系统</p>
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
              style={{ backgroundColor: '#0033FF' }}
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
  )
}

export default Login