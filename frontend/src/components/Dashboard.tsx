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
      const pendingReview = orders.filter(order => order.status === 'FINISHED' || order.status === 'OBSERVING')
      const delayed = orders.filter(order => {
        if (order.status === 'PENDING' || order.status === 'DISPATCHED') {
          const created = dayjs(order.created_at)
          const hours = dayjs().diff(created, 'hour')
          return hours > 24 // Over 24 hours
        }
        return false
      })

      return [
        { title: '今日报修', value: todayOrders.length, color: '#0033FF', action: () => navigate('/workorders?date=today') },
        { title: '待验收', value: pendingReview.length, color: '#FF8F1F', action: () => navigate('/workorders?status=FINISHED,OBSERVING') },
        { title: '异常延迟', value: delayed.length, color: '#FF4D4F', action: () => navigate('/workorders?status=PENDING,DISPATCHED') },
      ]
    } else if (role === 'MAIN_CONTRACTOR') {
      // Contractor stats
      const unassigned = orders.filter(order => order.status === 'PENDING')
      const dispatched = orders.filter(order => order.status === 'DISPATCHED' || order.status === 'RESERVED')
      const coverage = orders.length > 0 ? Math.round((dispatched.length / orders.length) * 100) : 0

      return [
        { title: '未指派', value: unassigned.length, color: '#999', action: () => navigate('/workorders?status=PENDING') },
        { title: '已转派', value: dispatched.length, color: '#00B578', action: () => navigate('/workorders?status=DISPATCHED,RESERVED') },
        { title: '供应商覆盖率', value: coverage, color: '#0033FF', action: () => {}, suffix: '%' },
      ]
    }

    return []
  }

  const stats = getStatsForRole()

  if (stats.length === 0) {
    return null // Don't show dashboard for other roles
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <Card title="业务概览" style={{ background: '#fff' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              color={stat.color}
              onClick={stat.action}
            />
          ))}
        </Space>
      </Card>
    </div>
  )
}
