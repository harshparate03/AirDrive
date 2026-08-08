import React from 'react'
import { formatFileSize } from '../../utils/fileUtils'

const StorageBar = ({ used = 0, total = 1 }) => {
  const pct = Math.min(Math.round((used / total) * 100), 100)
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary-500'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-dark-400">
        <span>{formatFileSize(used)} used</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-dark-400">{formatFileSize(total - used)} free of {formatFileSize(total)}</p>
    </div>
  )
}

export default StorageBar
