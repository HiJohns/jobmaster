import { useState, useEffect } from 'react'

import dayjs, { Dayjs } from 'dayjs'
import { Button } from 'antd-mobile'
import { LeftOutline } from 'antd-mobile-icons'

interface WeekCalendarProps {
  onDateChange: (date: Dayjs) => void
  selectedDate?: Dayjs
}

function WeekCalendar({ onDateChange, selectedDate: initialDate }: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState<Dayjs[]>([])
  const [selectedDate, setSelectedDate] = useState<Dayjs>(initialDate || dayjs())
  const [showBackToToday, setShowBackToToday] = useState(false)

  useEffect(() => {
    generateWeekDays(dayjs())
  }, [])

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
      // Check if we need to show "back to today" button
      const isTodaySelected = initialDate.isSame(dayjs(), 'day')
      setShowBackToToday(!isTodaySelected)
    }
  }, [initialDate])

  const generateWeekDays = (baseDate: Dayjs) => {
    const startOfWeek = baseDate.startOf('week')
    const days: Dayjs[] = []
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.add(i, 'day'))
    }
    setCurrentWeek(days)
  }

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date)
    onDateChange(date)
    setShowBackToToday(!date.isSame(dayjs(), 'day'))
  }

  const handleBackToToday = () => {
    const today = dayjs()
    setSelectedDate(today)
    onDateChange(today)
    generateWeekDays(today)
    setShowBackToToday(false)
  }

  const formatDate = (date: Dayjs) => {
    return date.format('D')
  }

  const formatDay = (date: Dayjs) => {
    return date.format('ddd')
  }

  const isToday = (date: Dayjs) => {
    return date.isSame(dayjs(), 'day')
  }

  const isSelected = (date: Dayjs) => {
    return date.isSame(selectedDate, 'day')
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      padding: '16px', 
      backgroundColor: 'var(--bg-color)', 
      gap: '12px'
    }}>
      {/* Back to Today Button */}
      {showBackToToday && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            size="small"
            onClick={handleBackToToday}
            style={{
              '--background-color': 'var(--primary-blue)',
              '--text-color': '#ffffff',
              '--border-radius': '16px',
              padding: '4px 12px',
              fontSize: '12px',
            }}
          >
            <LeftOutline style={{ fontSize: '12px', marginRight: '4px' }} />
            回到今天
          </Button>
        </div>
      )}
      
      {/* Week Days */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {currentWeek.map((date, index) => {
          const selected = isSelected(date);
          const today = isToday(date);
          
          return (
            <div
              key={index}
              onClick={() => handleDateSelect(date)}
              style={{
                flex: '1 0 48px',
                height: 64,
                borderRadius: 12,
                backgroundColor: selected ? '#ffffff' : today ? 'var(--primary-blue)' : '#ffffff',
                border: selected ? '2px solid var(--primary-blue)' : today ? 'none' : '1px solid #e8e8e8',
                boxShadow: selected 
                  ? '0 4px 16px rgba(0, 51, 255, 0.2)' 
                  : today 
                    ? '0 4px 12px rgba(0, 51, 255, 0.3)' 
                    : '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: selected ? 'scale(1.08)' : 'scale(1)',
                position: 'relative'
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: today && !selected ? 'rgba(255,255,255,0.9)' : selected ? 'var(--primary-blue)' : '#888',
                  fontWeight: selected || today ? 600 : 400,
                  lineHeight: 1.2,
                  marginBottom: 4
                }}
              >
                {formatDay(date)}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: today && !selected ? '#ffffff' : selected ? 'var(--primary-blue)' : '#333',
                  lineHeight: 1.2
                }}
              >
                {formatDate(date)}
              </span>
              
              {/* Today indicator dot with breathing animation */}
              {today && (
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: selected ? 'var(--primary-blue)' : 'var(--dot-color-today)',
                  animation: 'breathing-dot var(--animation-breathing-duration, 2s) ease-in-out infinite',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  )
}

export default WeekCalendar
