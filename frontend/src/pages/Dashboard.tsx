import { useAuthStore } from '../store/useAuthStore'

function Dashboard() {
  const { userInfo } = useAuthStore()

  return (
    <div className="m-6 p-6 card-layout">

          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">欢迎使用 JobMaster</h2>
            <p className="text-gray-500">智能工单管理系统</p>
            <div className="mt-8">
              <p>当前用户: {userInfo?.displayName}</p>
              <p>角色: {userInfo?.role}</p>
            </div>
          </div>
        
    </div>
  )
}

export default Dashboard
