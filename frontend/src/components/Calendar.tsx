import { useState, useEffect } from 'react'
import { Flex, Text } from 'antd-mobile'
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
    <Flex style={{ padding: 12, backgroundColor: '#fff', overflowX: 'auto' }}>
      {currentWeek.map((date, index) => (
        <Flex.Item
          key={index}
          onClick={() => handleDateSelect(date)}
          style={{
            flex: '0 0 48px',
            height: 64,
            margin: '0 4px',
            borderRadius: 8,
            backgroundColor: isSelected(date) ? '#0033FF' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Text
              style={{
                fontSize: 12,
                color: isSelected(date) ? '#fff' : '#999',
                display: 'block',
              }}
            >
              {formatDay(date)}
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: isSelected(date) ? '#fff' : isToday(date) ? '#0033FF' : '#333',
                display: 'block',
              }}
            >
              {formatDate(date)}
            </Text>
          </div>
        </Flex.Item>
      ))}
    </Flex>
  )
}

export default WeekCalendar
