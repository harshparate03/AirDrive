import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HiX, HiClock, HiUpload, HiRefresh } from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { formatFileSize } from '../../utils/fileUtils'

const VersionHistoryModal = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { modalData: file } = useSelector(s => s.ui)
  const uploadRef = useRef(null)

  const restoreMutation = useMutation({
    mutationFn: ({ fileId, versionNumber }) =>
      api.post(`/files/${fileId}/restore-version`, { versionNumber }),
    onSuccess: () => {
      toast.success('Version restored')
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: () => toast.error('Failed to restore version'),
  })

  const handleNewVersion = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !file) return

    const formData = new FormData()
    formData.append('file', files[0])

    try {
      await api.post(`/files/${file._id}/version`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('New version uploaded')
      queryClient.invalidateQueries({ queryKey: ['files'] })
    } catch {
      toast.error('Failed to upload version')
    }
    uploadRef.current.value = ''
  }

  if (!file) return null

  const versions = [...(file.versions || [])].reverse()

  return (
    <div className="modal-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-surface card w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-dark-700">
          <HiClock className="text-primary-500 text-lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Version History</h2>
            <p className="text-xs text-dark-400 truncate">{file.name}</p>
          </div>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1.5 text-dark-400">
            <HiX />
          </button>
        </div>

        {/* Upload new version */}
        <div className="px-4 pt-4">
          <input ref={uploadRef} type="file" className="hidden" onChange={handleNewVersion} />
          <button
            onClick={() => uploadRef.current?.click()}
            className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
          >
            <HiUpload /> Upload New Version
          </button>
        </div>

        {/* Versions list */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
          {versions.length === 0 ? (
            <p className="text-sm text-dark-400 text-center py-6">No version history yet</p>
          ) : (
            versions.map((v, i) => (
              <motion.div
                key={v.versionNumber}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  v.versionNumber === file.currentVersion
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700/50'
                    : 'bg-slate-50 dark:bg-dark-800 border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-dark-700 border border-slate-100 dark:border-dark-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-dark-600 dark:text-dark-300">v{v.versionNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark-700 dark:text-dark-200">
                      Version {v.versionNumber}
                    </span>
                    {v.versionNumber === file.currentVersion && (
                      <span className="badge bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-dark-400">
                    <span>{formatFileSize(v.size)}</span>
                    <span>·</span>
                    <span>{new Date(v.uploadedAt).toLocaleString()}</span>
                  </div>
                  {v.note && <p className="text-xs text-dark-400 mt-0.5 italic">&ldquo;{v.note}&rdquo;</p>}
                </div>
                {v.versionNumber !== file.currentVersion && (
                  <button
                    onClick={() => restoreMutation.mutate({ fileId: file._id, versionNumber: v.versionNumber })}
                    disabled={restoreMutation.isPending}
                    className="btn-ghost p-1.5 text-primary-500 flex-shrink-0"
                    title="Restore this version"
                  >
                    <HiRefresh />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default VersionHistoryModal
