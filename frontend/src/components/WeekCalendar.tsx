/**
 * Week Calendar Component
 * Horizontal scrolling week date picker with yellow highlight for selected date
 * 
 * Features:
 * - Displays current week dates
 * - Yellow highlight for selected date
 * - Day name and date number display
 * - Responsive horizontal scroll
 */

import { useState, useEffect, useCallback } from 'react'

import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

interface WeekCalendarProps {
  /** Callback when date changes */
  onDateChange: (date: Dayjs) => void
  /** Initially selected date */
  selectedDate?: Dayjs
}

/**
 * Week Calendar Component
 */
function WeekCalendar({ onDateChange, selectedDate: initialDate }: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState<Dayjs[]>([])
  const [selectedDate, setSelectedDate] = useState<Dayjs>(initialDate || dayjs())

  const generateWeekDays = useCallback((baseDate: Dayjs) => {
    const startOfWeek = baseDate.startOf('week')
    const days: Dayjs[] = []
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.add(i, 'day'))
    }
    setCurrentWeek(days)
  }, [])

  useEffect(() => {
    generateWeekDays(dayjs())
  }, [generateWeekDays])

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date)
    onDateChange(date)
  }

  const formatDate = (date: Dayjs) => date.format('D')
  const formatDay = (date: Dayjs) => date.format('dd')
  const isToday = (date: Dayjs) => date.isSame(dayjs(), 'day')
  const isSelected = (date: Dayjs) => date.isSame(selectedDate, 'day')

  return (
    <div
      style={{
        display: 'flex',
        padding: '12px 8px',
        backgroundColor: '#fff',
        overflowX: 'auto',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      {currentWeek.map((date, index) => (
        <div
          key={index}
          onClick={() => handleDateSelect(date)}
          style={{
            flex: '0 0 52px',
            height: 68,
            margin: '0 6px',
            borderRadius: 12,
            backgroundColor: isSelected(date) ? '#FFD700' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isSelected(date) ? '0 2px 8px rgba(255, 215, 0, 0.4)' : 'none',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                fontSize: 12,
                color: isSelected(date) ? '#000' : '#999',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {formatDay(date)}
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: isSelected(date) ? '#000' : isToday(date) ? '#0033FF' : '#333',
                display: 'block',
              }}
            >
              {formatDate(date)}
            </span>
            {isToday(date) && (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: isSelected(date) ? '#000' : '#0033FF',
                  margin: '4px auto 0',
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default WeekCalendar
