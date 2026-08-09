import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiCheck, HiExclamation, HiUpload, HiChevronDown, HiChevronUp } from 'react-icons/hi'
import { clearCompleted, removeFromQueue } from '../../store/slices/uploadSlice'
import { formatFileSize } from '../../utils/fileUtils'

const StatusIcon = ({ status }) => {
  if (status === 'completed') return <HiCheck className="text-green-500" />
  if (status === 'error') return <HiExclamation className="text-red-500" />
  if (status === 'uploading') return (
    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
  )
  return <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-dark-600" />
}

const UploadPanel = () => {
  const dispatch = useDispatch()
  const { queue, isUploading } = useSelector(state => state.upload)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (isUploading) setCollapsed(false)
  }, [isUploading])

  if (!queue.length) return null

  const completedCount = queue.filter(q => q.status === 'completed').length
  const isAllDone = completedCount === queue.length
  const totalBytes = queue.reduce((sum, item) => sum + (item.size || 0), 0)
  const uploadedBytes = queue.reduce((sum, item) => sum + ((item.size || 0) * (item.progress || 0) / 100), 0)
  const remainingBytes = Math.max(0, totalBytes - uploadedBytes)
  const overallProgress = totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed left-3 right-3 top-3 z-[80] sm:left-auto sm:right-5 sm:top-auto sm:bottom-5 sm:w-96 card shadow-2xl ring-1 ring-black/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3 bg-dark-800 dark:bg-dark-900 text-white">
          <HiUpload className="text-primary-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isAllDone ? `${completedCount} uploads complete` : `Uploading ${queue.length - completedCount} files · ${overallProgress}%`}
            </p>
            {!isAllDone && <p className="text-[11px] text-dark-300">{formatFileSize(uploadedBytes)} uploaded · {formatFileSize(remainingBytes)} remaining</p>}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="text-dark-300 hover:text-white p-1">
            {collapsed ? <HiChevronUp /> : <HiChevronDown />}
          </button>
          <button
            onClick={() => dispatch(clearCompleted())}
            className="text-dark-300 hover:text-white p-1"
          >
            <HiX />
          </button>
        </div>

        {/* Queue */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden max-h-64 overflow-y-auto"
            >
              {queue.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 border-b border-slate-50 dark:border-dark-700 last:border-0">
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-dark-800 dark:text-dark-100 truncate">{item.name}</p>
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0 ml-2">
                        {item.status === 'completed' ? '100%' : item.status === 'uploading' ? `${item.progress}%` : ''}
                      </span>
                    </div>
                    {item.status === 'uploading' && (
                      <div className="mt-1 h-1 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="upload-progress transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.status === 'error' && (
                      <p className="text-xs text-red-400">{item.error}</p>
                    )}
                  </div>
                  <span className="text-xs text-dark-400 flex-shrink-0">{formatFileSize(item.size)}</span>
                  <button onClick={() => dispatch(removeFromQueue(item.id))} className="text-dark-400 hover:text-dark-600 p-0.5">
                    <HiX className="text-xs" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

export default UploadPanel
