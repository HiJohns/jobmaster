////import { useState, useEffect } from 'react'
import { Card, Space } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { StatCard } from './StatCard'
//import { api } from '../api/factory'
import { WorkOrder } from '../api/local'
import dayjs from 'dayjs'

interface DashboardProps {
  orders: WorkOrder[]
}

/**
 * Dashboard - Business statistics dashboard
 * Shows different stats based on user role
 */
export function Dashboard({ orders }: DashboardProps) {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()

  // Calculate statistics based on role
  const getStatsForRole = () => {
    const role = userInfo?.role
    const today = dayjs().format('YYYY-MM-DD')
    
    if (role === 'ADMIN' || role === 'BRAND_HQ') {
      // Admin/HQ stats
      const todayOrders = orders.filter(order => 
        dayjs(order.created_at).format('YYYY-MM-DD') === today
      )
      const pendingReview = orders.filter(order => order.status === 'PENDING_EVALUATION')
      const { data: orgsData } = await api.organization.list()
      const organizations = orgsData?.list || []
      setOrgCount(organizations.length)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="今日报修"
        value={todayOrders.length}
        color="#0033FF"
        onClick={() => navigate('/workorders?date=today')}
      />
      <StatCard
        title="供应商覆盖率"
        value={coverage}
        color="#0033FF"
        suffix="%"
      />
      </div>
      <StatCard
        title="待验收"
        value={pendingReview.length}
        color="#FF8F1F"
        onClick={() => navigate('/workorders?status=PENDING_EVALUATION')}
      />
          ))}
        </Space>
      </Card>
    </div>
  )
}
