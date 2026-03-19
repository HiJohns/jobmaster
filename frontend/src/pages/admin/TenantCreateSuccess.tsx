import { Result, Button, Card, Typography, Space, message } from 'antd'
import { CopyOutlined, CheckOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography

interface TenantCreateSuccessData {
  tenant: {
    id: string
    code: string
    name: string
    admin_email: string
    admin_phone: string
  }
  admin_account: {
    username: string
    password: string
    login_url: string
  }
}

const TenantCreateSuccess: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [passwordVisible, setPasswordVisible] = useState(false)
  
  // 从 location.state 获取数据
  const successData: TenantCreateSuccessData | undefined = location.state?.successData

  if (!successData) {
    return (
      <Result
        status="warning"
        title="页面已过期"
        subTitle="请重新创建租户"
        extra={[
          <Button type="primary" key="back" onClick={() => navigate('/admin/tenants')}>
            返回租户列表
          </Button>
        ]}
      />
    )
  }

  const { tenant, admin_account } = successData

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(`${label} 已复制到剪贴板`)
    } catch (err) {
      console.error('复制失败:', err)
      message.error('复制失败，请手动复制')
    }
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <Result
        status="success"
        title="租户创建成功！"
        subTitle="请妥善保管以下信息，并通知租户管理员"
        extra={[
          <Button type="primary" key="list" onClick={() => navigate('/admin/tenants')}>
            返回租户列表
          </Button>,
          <Button key="create" onClick={() => navigate('/admin/tenants/create')}>
            继续创建
          </Button>
        ]}
      />

      <Card style={{ marginTop: 24 }}>
        <Title level={5} style={{ marginBottom: 24 }}>
          登录信息
        </Title>
        
        <Paragraph>
          <Text strong>登录提示：</Text> 请使用电子邮箱或手机号作为账号登录
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">租户代码：</Text>
            <Paragraph style={{ margin: '8px 0' }}>
              <Text code style={{ fontSize: 16, padding: '8px 12px' }}>
                {tenant.code}
              </Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(tenant.code, '租户代码')}
                style={{ marginLeft: 8 }}
              >
                复制
              </Button>
            </Paragraph>
          </div>

          <div>
            <Text type="secondary">管理员账号：</Text>
            <Paragraph style={{ margin: '8px 0' }}>
              <Text code style={{ fontSize: 16, padding: '8px 12px' }}>
                {tenant.admin_email}
              </Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(tenant.admin_email, '管理员账号')}
                style={{ marginLeft: 8 }}
              >
                复制
              </Button>
            </Paragraph>
          </div>

          <div>
            <Text type="secondary">初始密码：</Text>
            <Paragraph style={{ margin: '8px 0' }}>
              <Text 
                code 
                style={{ 
                  fontSize: 16, 
                  padding: '8px 12px',
                  fontFamily: 'monospace'
                }}
              >
                {passwordVisible ? admin_account.password : '••••••••'}
              </Text>
              <Button
                type="link"
                icon={passwordVisible ? <CheckOutlined /> : <CopyOutlined />}
                onClick={() => {
                  if (passwordVisible) {
                    handleCopy(admin_account.password, '初始密码')
                  } else {
                    setPasswordVisible(true)
                  }
                }}
                style={{ marginLeft: 8 }}
              >
                {passwordVisible ? '复制密码' : '显示密码'}
              </Button>
            </Paragraph>
          </div>

          <div>
            <Text type="secondary">登录地址：</Text>
            <Paragraph style={{ margin: '8px 0' }}>
              <Text code style={{ fontSize: 16, padding: '8px 12px' }}>
                {window.location.origin}{admin_account.login_url}
              </Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(`${window.location.origin}${admin_account.login_url}`, '登录地址')}
                style={{ marginLeft: 8 }}
              >
                复制
              </Button>
            </Paragraph>
          </div>
        </Space>

        <div style={{ marginTop: 24, padding: 16, background: '#fff7e6', borderRadius: 8 }}>
          <Text strong style={{ color: '#fa8c16' }}>⚠️ 安全提醒：</Text>
          <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
            初始密码仅供首次登录使用，请务必在登录后立即修改密码。
            建议管理员使用复杂密码并定期更换，以保障账户安全。
          </Paragraph>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          租户信息
        </Title>
        
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">租户名称：</Text>
            <Paragraph style={{ margin: 0, fontSize: 16 }}>
              {tenant.name}
            </Paragraph>
          </div>

          <div>
            <Text type="secondary">管理员邮箱：</Text>
            <Paragraph style={{ margin: 0, fontSize: 16 }}>
              {tenant.admin_email}
            </Paragraph>
          </div>

          <div>
            <Text type="secondary">管理员手机：</Text>
            <Paragraph style={{ margin: 0, fontSize: 16 }}>
              {tenant.admin_phone}
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default TenantCreateSuccess