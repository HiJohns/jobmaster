import { useState } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/useAuthStore'

const { Title } = Typography

function Login() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { username: string; password: string }) => {
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
        
        message.success('登录成功')
        navigate('/')
      }
    } catch (error) {
      // Error is already handled and displayed by axios interceptor
      // No additional action needed here
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
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
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full"
              style={{ backgroundColor: '#0033FF' }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login