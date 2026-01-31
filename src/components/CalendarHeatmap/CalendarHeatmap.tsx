import { useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  isAfter
} from 'date-fns'

import {
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth
} from 'date-fns'


type CalendarDay = {
  date: string
  taskCount: number
  intensity: number
  isCurrentMonth: boolean
}

const today = startOfMonth(new Date())

export default function CalendarHeatmap() {
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(new Date())
  )

  const canGoNext = !isAfter(
    addMonths(currentMonth, 1),
    today
  )

  const goPrev = () => {
    setCurrentMonth(prev => startOfMonth(addMonths(prev, -1)))
  }

  const goNext = () => {
    if (!canGoNext) return
    setCurrentMonth(prev => startOfMonth(addMonths(prev, 1)))
  }

  const monthLabel = useMemo(
    () => format(currentMonth, 'MMMM yyyy'),
    [currentMonth]
  )

  const range = useMemo(() => ({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  }), [currentMonth])

  const calendarDays = useMemo(() => {
  const gridStart = startOfWeek(range.start, { weekStartsOn: 1 }) // Monday
  const gridEnd = endOfWeek(range.end, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map(date => ({
    date: format(date, 'yyyy-MM-dd'),
    taskCount: 0,           // 🔜 replaced by real data
    intensity: 0,           // 🔜 replaced later
    isCurrentMonth: isSameMonth(date, currentMonth)
  }))
}, [range, currentMonth])


  // 🔜 Data fetching will plug in here
  console.log('Query range:', range)

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={goPrev}>⬅️</button>
        <span className="month-label">{monthLabel}</span>
        <button onClick={goNext} disabled={!canGoNext}>➡️</button>
      </div>

      
      {/* 🔜 Calendar grid comes next */}
      <div className="calendar-grid">
  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
    <div key={d} className="calendar-weekday">{d}</div>
  ))}

  {calendarDays.map(day => (
    <div
      key={day.date}
      className={`calendar-cell ${day.isCurrentMonth ? '' : 'is-muted'}`}
    >
      <div className="day-number">
        {day.isCurrentMonth ? day.date.slice(-2) : ''}
      </div>

      {day.isCurrentMonth && (
        <div className="day-count">
          {day.taskCount}
        </div>
      )}
    </div>
  ))}
</div>

    </div>
  )
}
