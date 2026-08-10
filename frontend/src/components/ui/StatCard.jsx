import React from 'react'
import { motion } from 'framer-motion'

const colorMap = {
  blue:   { iconBg: 'bg-blue-500', surface: 'from-blue-500/15 via-sky-400/5 to-transparent', ring: 'border-blue-300/40 dark:border-blue-400/20', icon: 'text-white', accent: 'bg-blue-500' },
  green:  { iconBg: 'bg-emerald-500', surface: 'from-emerald-500/15 via-teal-400/5 to-transparent', ring: 'border-emerald-300/40 dark:border-emerald-400/20', icon: 'text-white', accent: 'bg-emerald-500' },
  yellow: { iconBg: 'bg-violet-500', surface: 'from-violet-500/15 via-fuchsia-400/5 to-transparent', ring: 'border-violet-300/40 dark:border-violet-400/20', icon: 'text-white', accent: 'bg-violet-500' },
  amber:  { iconBg: 'bg-amber-500', surface: 'from-amber-500/15 via-orange-400/5 to-transparent', ring: 'border-amber-300/40 dark:border-amber-400/20', icon: 'text-white', accent: 'bg-amber-500' },
  red:    { iconBg: 'bg-rose-500', surface: 'from-rose-500/15 via-red-400/5 to-transparent', ring: 'border-rose-300/40 dark:border-rose-400/20', icon: 'text-white', accent: 'bg-rose-500' },
  purple: { iconBg: 'bg-purple-500', surface: 'from-purple-500/15 via-indigo-400/5 to-transparent', ring: 'border-purple-300/40 dark:border-purple-400/20', icon: 'text-white', accent: 'bg-purple-500' },
}

const StatCard = ({ label, value, icon: Icon, color = 'blue', subValue, trend, loading }) => {
  const c = colorMap[color] || colorMap.blue

  if (loading) {
    return (
      <div className="card h-full min-h-48 space-y-3 p-4 sm:p-5">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-16" />
        <div className="skeleton h-3 w-20" />
      </div>
    )
  }

  return (
    <motion.div whileHover={{ y: -3 }} className={`card relative flex h-full min-h-48 flex-col overflow-hidden border bg-gradient-to-br p-4 sm:p-5 ${c.surface} ${c.ring}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${c.accent}`} aria-hidden="true" />
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${c.iconBg}`}>
          <Icon className={`text-xl ${c.icon}`} />
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight text-dark-900 dark:text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-dark-500 dark:text-dark-400">{label}</p>
      <div className="mt-auto min-h-5 pt-1">
      {subValue && <p className="text-xs text-dark-400">{subValue}</p>}
      {trend && (
        <p className="flex items-center gap-1 text-xs text-green-500">
          <span>↑</span>{trend}
        </p>
      )}
      </div>
    </motion.div>
  )
}

export default StatCard
