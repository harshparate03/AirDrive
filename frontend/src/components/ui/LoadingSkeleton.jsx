import React from 'react'

const LoadingSkeleton = ({ count = 6, type = 'grid' }) => {
  if (type === 'list') {
    return (
      <div className="card divide-y divide-slate-50 dark:divide-dark-700">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-48 rounded" />
              <div className="skeleton h-2.5 w-24 rounded" />
            </div>
            <div className="skeleton h-3 w-16 rounded hidden sm:block" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="file-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="skeleton w-full aspect-square rounded-xl" />
          <div className="skeleton h-3.5 w-3/4 rounded" />
          <div className="skeleton h-2.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}

export default LoadingSkeleton
