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

import './CalendarHeatmap.css'


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
  const gridStart = startOfWeek(range.start, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(range.end, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map(date => {
    const key = format(date, 'yyyy-MM-dd')
    const count = countsByDate[key] ?? 0

    return {
      date: key,
      taskCount: count,
      intensity: maxCount === 0 ? 0 : count / maxCount,
      isCurrentMonth: isSameMonth(date, currentMonth)
    }
  })
}, [range, currentMonth, countsByDate, maxCount])


  const maxCount = useMemo(() => {
  return Math.max(
    0,
    ...Object.values(countsByDate)
  )
}, [countsByDate])

  
  const getHeatColor = (intensity: number) => {
  if (intensity === 0) return '#f5f5f5'

  // green scale (tweak later if needed)
  return `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`
}


  
  const buildTasksUrl = (date: string) => {
  const params = new URLSearchParams()

  // exact day filter
  params.set('new_deadline', date)

  // reuse existing filters (examples)
  owners.forEach(o => params.append('owners', o))
  teams.forEach(t => params.append('teams', t))
  requesters.forEach(r => params.append('requesters', r))
  statuses.forEach(s => params.append('statuses', s))

  return `/tasks?${params.toString()}`
}


  const onDayClick = (
  e: React.MouseEvent,
  date: string
) => {
  const url = buildTasksUrl(date)

  if (e.metaKey || e.ctrlKey) {
    window.open(url, '_blank')
  } else {
    window.location.href = url
  }
}



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

  {.map(day => (


      <div
      key={day.date}
      className={`calendar-cell ${day.isCurrentMonth ? '' : 'is-muted'}`}
      style={
        day.isCurrentMonth
          ? { backgroundColor: getHeatColor(day.intensity), cursor: 'pointer' }
          : undefined
      }
      onClick={
        day.isCurrentMonth
          ? (e) => onDayClick(e, day.date)
          : undefined
         }
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
