import React from 'react'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HiStar, HiDownload, HiTrash, HiShare, HiEye, HiRefresh } from 'react-icons/hi'
import api, { downloadFile } from '../../services/api'
import { openModal, toggleFileSelection, setContextMenu } from '../../store/slices/uiSlice'
import { getFileIcon, getFileColor, formatFileSize } from '../../utils/fileUtils'
import toast from 'react-hot-toast'
import { useConfirm } from '../ui/ConfirmDialog'

const FileRow = ({ file, onRefresh, showRestore }) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { selectedFiles } = useSelector(state => state.ui)
  const isSelected = selectedFiles.includes(file._id)

  const starMutation = useMutation({
    mutationFn: () => api.post('/files/star', { fileId: file._id }),
    onSuccess: () => { queryClient.invalidateQueries(['files']); onRefresh?.() },
  })

  const trashMutation = useMutation({
    mutationFn: () => api.delete(`/files/${file._id}`),
    onSuccess: () => { toast.success('Moved to trash'); onRefresh?.() },
  })

const restoreMutation = useMutation({
    mutationFn: () => api.post('/files/trash', { fileId: file._id, restore: true }),
    onSuccess: () => { toast.success('File restored'); onRefresh?.() },
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: () => api.delete(`/files/${file._id}`, { params: { permanent: true } }),
    onSuccess: () => { toast.success('File permanently deleted'); onRefresh?.() },
  })

  const handlePermanentDelete = async (e) => {
    e.stopPropagation()
    if (await confirm({ title: 'Permanently delete file?', message: `"${file.name}" will be removed forever. This cannot be undone.`, confirmLabel: 'Delete forever' })) {
      permanentDeleteMutation.mutate()
    }
  }

  const handleDownload = async () => {
    try {
      const res = await downloadFile(file._id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = file.name; a.click()
      URL.revokeObjectURL(url)
    } catch { if (file.webContentLink) window.open(file.webContentLink) }
  }

  const Icon = getFileIcon(file.mimeType)
  const color = getFileColor(file.category)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onContextMenu={e => { e.preventDefault(); dispatch(setContextMenu({ x: e.clientX, y: e.clientY, file, type: 'file' })) }}
      onClick={() => dispatch(toggleFileSelection(file._id))}
      onDoubleClick={() => !showRestore && dispatch(openModal({ modal: 'filePreview', data: file }))}
      className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer group transition-all hover:bg-slate-50 dark:hover:bg-dark-800 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
    >
      {/* Checkbox */}
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-200 dark:border-dark-600 opacity-0 group-hover:opacity-100'}`}>
        {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,6 5,9 10,3"/></svg>}
      </div>

      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl ${color} bg-opacity-15 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`text-lg ${color.replace('bg-', 'text-').replace('-100', '-500')}`} />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-800 dark:text-dark-100 truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-dark-400">{formatFileSize(file.size)}</span>
          {file.aiTags?.slice(0, 2).map(tag => (
            <span key={tag} className="badge bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px]">{tag}</span>
          ))}
        </div>
      </div>

      {/* Date */}
      <p className="text-xs text-dark-400 flex-shrink-0 hidden sm:block">
        {new Date(file.updatedAt).toLocaleDateString()}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0">
{showRestore ? (
          <>
            <button onClick={e => { e.stopPropagation(); restoreMutation.mutate() }} className="btn-ghost p-1.5 text-xs text-green-500" title="Restore">
              <HiRefresh />
            </button>
            <button onClick={handlePermanentDelete} className="btn-ghost p-1.5 text-red-400" title="Delete permanently">
              <HiTrash className="text-sm" />
            </button>
          </>
        ) : (
          <>
            <button onClick={e => { e.stopPropagation(); dispatch(openModal({ modal: 'filePreview', data: file })) }} className="btn-ghost p-1.5" title="Preview">
              <HiEye className="text-sm" />
            </button>
            <button onClick={e => { e.stopPropagation(); starMutation.mutate() }} className={`btn-ghost p-1.5 ${file.starred ? 'text-amber-400' : ''}`}>
              <HiStar className="text-sm" />
            </button>
            <button onClick={e => { e.stopPropagation(); handleDownload() }} className="btn-ghost p-1.5" title="Download">
              <HiDownload className="text-sm" />
            </button>
            <button onClick={e => { e.stopPropagation(); dispatch(openModal({ modal: 'share', data: file })) }} className="btn-ghost p-1.5" title="Share">
              <HiShare className="text-sm" />
            </button>
            <button onClick={e => { e.stopPropagation(); trashMutation.mutate() }} className="btn-ghost p-1.5 text-red-400">
              <HiTrash className="text-sm" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

const FileList = ({ files, onRefresh, showRestore }) => {
  if (!files?.length) return null

  return (
    <div className="card divide-y divide-slate-50 dark:divide-dark-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-3 py-2 text-xs font-medium text-dark-400 dark:text-dark-500 uppercase tracking-wider">
        <div className="w-5" />
        <div className="w-9" />
        <div className="flex-1">Name</div>
        <div className="hidden sm:block">Modified</div>
        <div className="w-28" />
      </div>
      {files.map((file, i) => (
        <motion.div key={file._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
          <FileRow file={file} onRefresh={onRefresh} showRestore={showRestore} />
        </motion.div>
      ))}
    </div>
  )
}

export default FileList
