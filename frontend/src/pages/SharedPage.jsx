import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { HiShare, HiLink, HiLockClosed, HiEye, HiTrash, HiClock, HiEyeOff, HiUserCircle } from 'react-icons/hi'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useMutation } from '@tanstack/react-query'
import ViewModeToggle from '../components/ui/ViewModeToggle'

const SharedPage = () => {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['shareLinks'],
    queryFn: () => api.get('/share').then(r => r.data),
  })

  const revokeMutation = useMutation({
    mutationFn: (id) => api.delete(`/share/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['shareLinks'])
      toast.success('Share link revoked')
    },
  })

  const copyLink = (token) => {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  const links = data?.shareLinks || []

  return (
    <div className="space-y-4 animate-fade-in">
<div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-dark-900 dark:text-white">Shared With Me</h1>
          <span className="badge bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            {links.length} links
          </span>
        </div>
        <ViewModeToggle />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      )}

      {!isLoading && links.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <HiShare className="text-4xl text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200">No shared links</h3>
          <p className="text-dark-400 text-sm mt-1">Files you share will appear here</p>
        </div>
      )}

      <div className="space-y-3">
        {links.map((link, i) => (
          <motion.div
            key={link._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="card p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <HiLink className="text-primary-500 text-xl" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-dark-800 dark:text-dark-100 truncate">
                  {link.fileId?.name || link.folderId?.name || 'Shared item'}
                </p>
                <span className={`badge text-xs capitalize ${
                  link.permission === 'editor' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  link.permission === 'commenter' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-slate-100 text-slate-600 dark:bg-dark-700 dark:text-dark-300'
                }`}>
                  {link.permission}
                </span>
                {link.password && (
                  <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs flex items-center gap-1">
                    <HiLockClosed className="text-xs" /> Password
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                <span className="flex items-center gap-1">
                  <HiEye /> {link.accessCount} views
                </span>
                {link.expiresAt && (
                  <span className="flex items-center gap-1">
                    <HiClock /> Expires {new Date(link.expiresAt).toLocaleDateString()}
                  </span>
                )}
                <span>{new Date(link.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Access status indicator */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {link.accessCount > 0 ? (
                  <span className="inline-flex items-center gap-1 badge bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs">
                    <HiEye className="text-xs" /> Opened
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 badge bg-slate-100 dark:bg-dark-700 text-dark-400 text-xs">
                    <HiEyeOff className="text-xs" /> Not opened yet
                  </span>
                )}
                {link.accessedBy?.slice(0, 3).map((a, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-[10px] text-dark-500 dark:text-dark-400" title={`${a.email || 'Anonymous'} • ${a.accessedAt ? new Date(a.accessedAt).toLocaleString() : ''}`}>
                    <HiUserCircle className="text-sm" />
                    {a.email || 'Anonymous'}
                  </span>
                ))}
                {link.accessedBy?.length > 3 && (
                  <span className="text-[10px] text-dark-400">+{link.accessedBy.length - 3} more</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => copyLink(link.token)} className="btn-secondary text-xs py-1.5 px-3">
                Copy Link
              </button>
              <button
                onClick={() => revokeMutation.mutate(link._id)}
                className="btn-ghost p-1.5 text-red-400 hover:text-red-500"
                title="Revoke"
              >
                <HiTrash />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default SharedPage
