import { useState, useEffect } from 'react'
import { Layout as AntLayout, Typography } from 'antd'
import { Outlet } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'
import { useAuthStore } from '../store/useAuthStore'
import TabBar from './TabBar'

const { Header, Content } = AntLayout
const { Text } = Typography

function AppLayout() {
  const { userInfo, isImpersonated, tenantId } = useAuthStore()
  const [tenantName, setTenantName] = useState<string>('')
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' })

  useEffect(() => {
    if (tenantId) {
      setTenantName(tenantId)
    }
  }, [tenantId])

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          {tenantName || userInfo?.orgId || 'JobMaster'}
        </Text>
        {isImpersonated && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            只读模式
          </Text>
        )}
      </Header>
      <Content style={{ background: '#f5f5f5' }}>
        <Outlet />
      </Content>
      {isMobile && (
        <TabBar />
      )}
    </AntLayout>
  )
}

export default AppLayout
