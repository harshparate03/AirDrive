import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import api from '../../services/api'
import { getFileIcon, getFileColor, formatFileSize } from '../../utils/fileUtils'
import { openModal } from '../../store/slices/uiSlice'
import LoadingSkeleton from '../ui/LoadingSkeleton'

const RecentFiles = () => {
  const dispatch = useDispatch()
  const { data, isLoading } = useQuery({
    queryKey: ['recent'],
    queryFn: () => api.get('/files/recent').then(r => r.data),
  })

  const files = data?.files?.slice(0, 8) || []

  if (isLoading) return <LoadingSkeleton count={4} type="list" />

  if (!files.length) {
    return <p className="text-sm text-dark-400 py-4 text-center">No recent files</p>
  }

  return (
    <div className="space-y-1">
      {files.map((file, i) => {
        const Icon = getFileIcon(file.mimeType)
        const color = getFileColor(file.category)
        return (
          <motion.div
            key={file._id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => dispatch(openModal({ modal: 'filePreview', data: file }))}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-700 cursor-pointer group transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg ${color} bg-opacity-60 flex items-center justify-center flex-shrink-0`}>
              <Icon className={`text-sm ${color.replace('bg-', 'text-').replace('-100', '-500').replace('/30', '')}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-700 dark:text-dark-200 truncate">{file.name}</p>
              <p className="text-xs text-dark-400">{formatFileSize(file.size)}</p>
            </div>
            <p className="text-xs text-dark-300 dark:text-dark-600 flex-shrink-0 hidden sm:block">
              {new Date(file.updatedAt).toLocaleDateString()}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}

export default RecentFiles
