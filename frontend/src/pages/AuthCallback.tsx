import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')

      if (!code) {
        message.error('回调参数无效：缺少 code')
        navigate('/login')
        return
      }

      try {
        const response = await fetch('/api/v1/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        })

        const result = await response.json()

        if (result.code === 200 && result.data?.token) {
          const { token, user, brand_config } = result.data

          localStorage.setItem('auth_token', token)
          localStorage.setItem('user_info', JSON.stringify(user))

          if (brand_config) {
            localStorage.setItem('brand_config', JSON.stringify(brand_config))
          }

          message.success('登录成功')
          navigate('/')
        } else {
          message.error(result.message || '认证失败')
          navigate('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        message.error('认证失败')
        navigate('/login')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div className="loading-spinner" />
      <p>认证中...</p>
    </div>
  )
}
