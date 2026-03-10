import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App'
import './index.css'

// Set dayjs locale to Chinese
dayjs.locale('zh-cn')

// Ant Design theme configuration with primary color #0033FF
const themeConfig = {
  token: {
    colorPrimary: '#0033FF',
    colorPrimaryHover: '#3366FF',
    colorPrimaryActive: '#0029CC',
    borderRadius: 6,
  },
  components: {
    Button: {
      borderRadius: 6,
    },
    Card: {
      borderRadius: 8,
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={themeConfig} locale={{
      // Basic Chinese locale settings
      locale: 'zh_CN',
    }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)