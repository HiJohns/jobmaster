import { useState, useEffect } from 'react'

import dayjs, { Dayjs } from 'dayjs'

interface WeekCalendarProps {
  onDateChange: (date: Dayjs) => void
  selectedDate?: Dayjs
}

function WeekCalendar({ onDateChange, selectedDate: initialDate }: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState<Dayjs[]>([])
  const [selectedDate, setSelectedDate] = useState<Dayjs>(initialDate || dayjs())

  useEffect(() => {
    generateWeekDays(dayjs())
  }, [])

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
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
    <div style={{ display: 'flex', padding: '16px 12px', backgroundColor: 'var(--bg-color)', overflowX: 'auto', gap: '8px' }}>
      {currentWeek.map((date, index) => {
        const selected = isSelected(date);
        const today = isToday(date);
        
        return (
          <div
            key={index}
            onClick={() => handleDateSelect(date)}
            style={{
              flex: '1 0 44px',
              height: 56,
              borderRadius: 8,
              backgroundColor: selected ? '#ffffff' : today ? 'var(--primary-blue)' : 'transparent',
              border: selected ? '2px solid var(--primary-blue)' : '2px solid transparent',
              boxShadow: selected ? '0 4px 12px rgba(0, 51, 255, 0.15)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: selected ? 'scale(1.05)' : 'scale(1)',
              opacity: selected || today ? 1 : 0.6,
              position: 'relative'
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: today && !selected ? 'rgba(255,255,255,0.8)' : selected ? 'var(--primary-blue)' : '#666',
                fontWeight: selected ? 600 : 'normal',
                lineHeight: 1.2,
                marginBottom: 2
              }}
            >
              {formatDay(date)}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: today && !selected ? '#ffffff' : selected ? 'var(--primary-blue)' : '#333',
                lineHeight: 1.2
              }}
            >
              {formatDate(date)}
            </span>
            
            {/* 底部热度圆点 */}
            <div style={{
              position: 'absolute',
              bottom: 4,
              width: 4,
              height: 4,
              borderRadius: '50%',
               // TODO: Replace with actual data-driven heat indicator
               backgroundColor: today && !selected ? '#ffffff' : 'var(--primary-blue)',
               opacity: index % 3 === 0 ? 0.8 : 0 
             }} />
          </div>
        );
      })}
    </div>
  )
}

export default WeekCalendar
