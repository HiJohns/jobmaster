import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ConstructionRecordPage from './pages/ConstructionRecordPage'
import MobileRepairPage from './pages/MobileRepairPage'
import WorkOrderDetailPage from './pages/WorkOrderDetailPage'

/**
 * App - 微信端主应用
 */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/wechat/orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="/wechat/orders/:id/record" element={<ConstructionRecordPage />} />
        <Route path="/wechat/repair" element={<MobileRepairPage />} />
        <Route path="/" element={<MobileRepairPage />} />
      </Routes>
    </Router>
  )
}
