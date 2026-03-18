import { App as AntApp } from 'antd'
import AppRouter from './router'
import { ThemeProvider } from './context/ThemeContext'
import './styles/theme.css'

function App() {
  return (
    <ThemeProvider>
      <AntApp>
        <AppRouter />
      </AntApp>
    </ThemeProvider>
  )
}

export default App