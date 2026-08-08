import React from 'react'
import { motion } from 'framer-motion'

const colorMap = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: 'text-blue-500',   bar: 'bg-blue-500' },
  green:  { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-500',  bar: 'bg-green-500' },
  yellow: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-500',  bar: 'bg-amber-500' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-500',  bar: 'bg-amber-500' },
  red:    { bg: 'bg-red-50 dark:bg-red-900/20',     icon: 'text-red-500',    bar: 'bg-red-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-500', bar: 'bg-purple-500' },
}

const StatCard = ({ label, value, icon: Icon, color = 'blue', subValue, trend, loading }) => {
  const c = colorMap[color] || colorMap.blue

  if (loading) {
    return (
      <div className="card p-4 space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-16" />
        <div className="skeleton h-3 w-20" />
      </div>
    )
  }

  return (
    <motion.div whileHover={{ y: -2 }} className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`text-xl ${c.icon}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-dark-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium text-dark-500 dark:text-dark-400 mt-0.5">{label}</p>
      {subValue && <p className="text-xs text-dark-400 mt-1">{subValue}</p>}
      {trend && (
        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
          <span>↑</span>{trend}
        </p>
      )}
    </motion.div>
  )
}

export default StatCard
