import React, { useState, useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.locale('zh-cn');

interface WeeklyCalendarProps {
  selectedDate: Dayjs;
  onDateChange: (date: Dayjs) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ selectedDate, onDateChange }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Dayjs>(() => dayjs().startOf('week'));

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => currentWeekStart.add(i, 'day'));
  }, [currentWeekStart]);

  const handlePrevWeek = () => setCurrentWeekStart(prev => prev.subtract(7, 'day'));
  const handleNextWeek = () => setCurrentWeekStart(prev => prev.add(7, 'day'));
  const handleGoToday = () => {
    const today = dayjs();
    setCurrentWeekStart(today.startOf('week'));
    onDateChange(today);
  };

  const isToday = (date: Dayjs) => date.isSame(dayjs(), 'day');
  const isSelected = (date: Dayjs) => date.isSame(selectedDate, 'day');

  return (
    <div style={{ width: '100%', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleGoToday}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              borderRadius: '16px',
              cursor: 'pointer',
            }}
          >
            📅 回到今天
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginLeft: '8px' }}>
            {currentWeekStart.format('YYYY年MM月')}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button 
            onClick={handlePrevWeek} 
            style={{ 
              padding: '6px', 
              backgroundColor: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ‹
          </button>
          <button 
            onClick={handleNextWeek} 
            style={{ 
              padding: '6px', 
              backgroundColor: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
        {days.map((day) => {
          const selected = isSelected(day);
          const today = isToday(day);

          return (
            <div
              key={day.toString()}
              onClick={() => onDateChange(day)}
              style={{
                flex: 1,
                minWidth: '56px',
                height: '80px',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                position: 'relative',
                backgroundColor: selected ? '#B81F25' : '#fff',
                color: selected ? '#fff' : '#64748b',
                border: selected ? '2px solid #B81F25' : '1px solid #f1f5f9',
                boxShadow: selected ? '0 4px 12px rgba(0, 51, 255, 0.25)' : 'none',
              }}
            >
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 500, 
                marginBottom: '4px',
                color: selected ? 'rgba(255,255,255,0.7)' : '#94a3b8'
              }}>
                {day.format('ddd')}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {day.format('D')}
              </span>
              
              {today && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: selected ? '#fff' : '#B81F25',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
