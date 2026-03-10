import { App as AntApp } from 'antd'
import AppRouter from './router'

function App() {
  return (
    <AntApp>
      <AppRouter />
    </AntApp>
  )
}

export default App