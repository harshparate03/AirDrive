import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { HiShare, HiLink, HiEye, HiLockClosed } from 'react-icons/hi'
import api from '../../services/api'

const RecentShared = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['shareLinks'],
    queryFn: () => api.get('/share').then(r => r.data),
  })

  const links = data?.shareLinks?.slice(0, 6) || []

  if (isLoading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
    </div>
  )

  if (!links.length) {
    return (
      <div className="flex items-center gap-3 text-sm text-dark-400 py-4">
        <HiShare className="text-2xl text-dark-300" />
        No shared files yet. Share a file to see it here.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {links.map(link => (
        <div key={link._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-dark-700">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <HiLink className="text-primary-500 text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark-700 dark:text-dark-200 truncate">
              {link.fileId?.name || link.folderId?.name || 'Shared item'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-dark-400 capitalize">{link.permission}</span>
              {link.password && <HiLockClosed className="text-xs text-amber-500" />}
              <span className="flex items-center gap-0.5 text-xs text-dark-400">
                <HiEye className="text-xs" />{link.accessCount}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/share/${link.token}`
              navigator.clipboard.writeText(url)
            }}
            className="text-xs text-primary-500 hover:text-primary-600 font-medium flex-shrink-0"
          >
            Copy
          </button>
        </div>
      ))}
    </div>
  )
}

export default RecentShared
