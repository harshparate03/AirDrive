import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const getColor = (count, isDark) => {
  if (!count) return isDark ? '#1e293b' : '#f1f5f9'
  if (count < 3) return '#a5b4fc'
  if (count < 6) return '#818cf8'
  if (count < 10) return '#6366f1'
  return '#4338ca'
}

const ActivityHeatmap = ({ heatmap = [], isDark = false }) => {
  const grid = useMemo(() => {
    // Build a map of date → count
    const map = {}
    heatmap.forEach(({ _id, count }) => { map[_id] = count })

    // Generate last 52 weeks (364 days)
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 363)
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const weeks = []
    let current = new Date(startDate)

    for (let w = 0; w < 53; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().slice(0, 10)
        const isFuture = current > today
        week.push({
          date: dateStr,
          count: isFuture ? -1 : (map[dateStr] || 0),
          month: current.getMonth(),
          day: current.getDay(),
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        })
        current.setDate(current.getDate() + 1)
      }
      weeks.push(week)
    }

    return weeks
  }, [heatmap])

  // Month labels
  const monthLabels = useMemo(() => {
    const labels = []
    let lastMonth = -1
    grid.forEach((week, wi) => {
      const firstDay = week[0]
      if (firstDay.month !== lastMonth) {
        labels.push({ week: wi, label: MONTHS[firstDay.month] })
        lastMonth = firstDay.month
      }
    })
    return labels
  }, [grid])

  const totalContributions = useMemo(() =>
    heatmap.reduce((sum, { count }) => sum + count, 0), [heatmap])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-dark-400 dark:text-dark-500">
          {totalContributions.toLocaleString()} activities in the last year
        </p>
        <div className="flex items-center gap-1 text-xs text-dark-400">
          <span>Less</span>
          {[0, 3, 6, 10, 15].map(n => (
            <div
              key={n}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getColor(n, isDark) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-0.5 min-w-0">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1 pt-5">
            {DAYS.map((d, i) => (
              <div key={d} className="h-3 text-[9px] text-dark-400 leading-3 w-6 text-right pr-0.5">
                {i % 2 === 1 ? d.slice(0, 1) : ''}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-col">
            {/* Month labels row */}
            <div className="flex gap-0.5 h-4 mb-0.5 relative">
              {grid.map((_, wi) => {
                const label = monthLabels.find(m => m.week === wi)
                return (
                  <div key={wi} className="w-3 text-[9px] text-dark-400 leading-none overflow-visible">
                    {label ? label.label : ''}
                  </div>
                )
              })}
            </div>

            {/* Cells: render by row (day of week) */}
            {DAYS.map((_, di) => (
              <div key={di} className="flex gap-0.5 mb-0.5">
                {grid.map((week, wi) => {
                  const cell = week[di]
                  if (!cell) return <div key={wi} className="w-3 h-3" />
                  return (
                    <motion.div
                      key={wi}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (wi * 7 + di) * 0.001 }}
                      title={cell.count >= 0 ? `${cell.label}: ${cell.count} activities` : ''}
                      className="w-3 h-3 rounded-sm cursor-default transition-transform hover:scale-125"
                      style={{
                        backgroundColor: cell.count < 0 ? 'transparent' : getColor(cell.count, isDark),
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityHeatmap
