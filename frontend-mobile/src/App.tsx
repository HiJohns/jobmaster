import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import EngineerHomePage from './pages/EngineerHomePage'
import WorkOrderDetailPage from './pages/WorkOrderDetailPage'
import ConstructionRecordPage from './pages/ConstructionRecordPage'

/**
 * App - 微信端主应用
 */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/wechat/orders" element={<EngineerHomePage />} />
        <Route path="/wechat/orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="/wechat/orders/:id/record" element={<ConstructionRecordPage />} />
        <Route path="/" element={<EngineerHomePage />} />
      </Routes>
    </Router>
  )
}
