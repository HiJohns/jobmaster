import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { demoApi } from '../api/demo'
import { storage } from '../api/local/storage'
import { STORAGE_KEYS } from '../api/local/mockData'

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
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY)
    if (savedUsername) {
      form.setFieldsValue({ username: savedUsername })
      setRememberMe(true)
    }
  }, [form])

  const handleSelectOrg = (orgName: string) => {
    setSelectedOrg(orgName)
    setSelectedAccount(null)
  }

  const handleSelectAccount = (username: string) => {
    setSelectedAccount(username)
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
      const allAccounts = DEMO_ORGS.flatMap(o => o.accounts.map(a => ({ ...a, role: '' })))
      const demoAccount = allAccounts.find(acc => acc.username === values.username)
      
      const finalUserId = user.id || response.userId || response.user_id || ''
      const finalUsername = user.username || response.username || values.username
      const finalDisplayName = user.displayName || user.display_name || response.displayName || response.display_name || demoAccount?.displayName || values.username
      const finalRole = user.role || response.role || demoAccount?.role || 'EMPLOYEE'
      const finalOrgId = user.orgId || user.org_id || response.orgId || response.org_id || ''
      const finalOrgName = user.orgName || user.org_name || user.displayName || demoAccount?.displayName || '未分配'
      const finalOrgAddress = user.orgAddress || user.org_address || ''
      const finalTenantId = user.tenantId || user.tenant_id || response.tenantId || response.tenant_id || ''

      login(response.token, {
        userId: finalUserId,
        username: finalUsername,
        displayName: finalDisplayName,
        role: finalRole,
        orgId: finalOrgId,
        orgName: finalOrgName,
        orgAddress: finalOrgAddress,
        tenantId: finalTenantId,
      })

      // 同步用户信息到 localStorage（供 localWorkorderApi 使用）
      storage.set(STORAGE_KEYS.SESSION, {
        user: {
          id: finalUserId,
          username: finalUsername,
          email: finalUsername,
          display_name: finalDisplayName,
          role: finalRole,
          org_id: finalOrgId,
          org_name: finalOrgName,
          org_address: finalOrgAddress,
          tenant_id: finalTenantId,
          is_shadow: false,
          status: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
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
          工单匠移动端
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>登录您的账号</p>
      </div>

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

      {/* Demo 账号选择 */}
      <Card style={{ margin: '16px 16px 0', borderRadius: '12px' }}>
        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>快捷登录（演示账号）</div>
          
          {/* Company selection */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {DEMO_ORGS.map(org => (
              <Button
                key={org.name}
                size="small"
                style={{
                  '--background-color': selectedOrg === org.name ? '#0033FF' : '#fff',
                  '--text-color': selectedOrg === org.name ? '#fff' : '#333',
                  border: '1px solid #e8e8e8',
                  fontSize: '12px',
                  padding: '2px 10px',
                }}
                onClick={() => handleSelectOrg(org.name)}
              >
                {org.label}
              </Button>
            ))}
          </div>

          {/* Account selection */}
          {selectedOrg && (
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                选择 {selectedOrg} 账号：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {DEMO_ORGS.find(o => o.name === selectedOrg)!.accounts.map(acc => (
                  <Button
                    key={acc.username}
                    size="small"
                    style={{
                      '--background-color': selectedAccount === acc.username ? '#0033FF' : '#f5f5f5',
                      '--text-color': selectedAccount === acc.username ? '#fff' : '#333',
                      border: '1px solid #e8e8e8',
                      fontSize: '12px',
                      padding: '2px 10px',
                    }}
                    onClick={() => handleSelectAccount(acc.username)}
                  >
                    {acc.displayName}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
