import React from 'react'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HiStar, HiDownload, HiTrash, HiShare, HiDotsVertical,
  HiEye, HiTag, HiDuplicate, HiRefresh,
} from 'react-icons/hi'
import api, { downloadFile } from '../../services/api'
import { openModal, toggleFileSelection, setContextMenu } from '../../store/slices/uiSlice'
import { getFileIcon, getFileColor, formatFileSize } from '../../utils/fileUtils'
import { saveFileResponse } from '../../utils/fileActions'
import toast from 'react-hot-toast'
import FileContextMenu from './FileContextMenu'
import { useConfirm } from '../ui/ConfirmDialog'

const FileCard = ({ file, onRefresh, showRestore, selectable }) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { selectedFiles } = useSelector(state => state.ui)
  const isSelected = selectable && selectedFiles.includes(file._id)

  const starMutation = useMutation({
    mutationFn: () => api.post('/files/star', { fileId: file._id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['files'])
      queryClient.invalidateQueries(['starred'])
      onRefresh?.()
    },
  })

  const trashMutation = useMutation({
    mutationFn: () => api.post('/files/trash', { fileId: file._id }),
    onSuccess: () => {
      toast.success('Moved to trash')
      onRefresh?.()
    },
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
      saveFileResponse(res, file.name)
    } catch {
      // Fallback to webContentLink
      if (file.webContentLink) window.open(file.webContentLink)
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    dispatch(setContextMenu({ x: e.clientX, y: e.clientY, file, type: 'file' }))
  }

  const Icon = getFileIcon(file.mimeType)
  const color = getFileColor(file.category)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      onContextMenu={handleContextMenu}
      onClick={() => selectable && dispatch(toggleFileSelection(file._id))}
      onDoubleClick={() => !showRestore && dispatch(openModal({ modal: 'filePreview', data: file }))}
      aria-selected={isSelected}
      className={`card p-4 cursor-pointer group relative transition-all ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'hover:border-primary-200 dark:hover:border-primary-700'}`}
    >
      {/* Selection checkbox */}
      {selectable && <div className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-md border-2 flex items-center justify-center bg-white/90 dark:bg-dark-800/90 transition-all ${isSelected ? 'bg-primary-500 dark:bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-dark-500'}`}>
        {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor"><path d="M10 3L5 8.5 2 5.5"/></svg>}
      </div>}

      {/* Star */}
      <button
        onClick={e => { e.stopPropagation(); starMutation.mutate() }}
        className={`absolute top-2.5 right-2.5 p-1 rounded-lg transition-all ${file.starred ? 'text-amber-400' : 'text-transparent group-hover:text-dark-300 hover:text-amber-400'}`}
      >
        <HiStar className="text-sm" />
      </button>

      {/* Thumbnail or icon */}
      <div className={`w-full aspect-square rounded-xl mb-3 flex items-center justify-center overflow-hidden ${color} bg-opacity-10`}>
        {file.thumbnail ? (
          <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover rounded-xl" />
        ) : (
          <Icon className={`text-4xl ${color.replace('bg-', 'text-').replace('-100', '-500')}`} />
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-dark-700 dark:text-dark-200 truncate" title={file.name}>
        {file.name}
      </p>
      <p className="text-xs text-dark-400 mt-0.5">{formatFileSize(file.size)}</p>

      {/* AI Tags */}
      {file.aiTags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {file.aiTags.slice(0, 2).map(tag => (
            <span key={tag} className="badge bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              {tag}
            </span>
          ))}
        </div>
      )}

{/* Quick actions on hover */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
        {showRestore ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); restoreMutation.mutate() }}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-700 shadow text-green-500 hover:text-green-600"
              title="Restore"
            >
              <HiRefresh className="text-sm" />
            </button>
            <button
              onClick={handlePermanentDelete}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-700 shadow text-red-400 hover:text-red-500"
              title="Delete permanently"
            >
              <HiTrash className="text-sm" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={e => { e.stopPropagation(); dispatch(openModal({ modal: 'filePreview', data: file })) }}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-700 shadow text-dark-500 hover:text-primary-500"
              title="Preview"
            >
              <HiEye className="text-sm" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDownload() }}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-700 shadow text-dark-500 hover:text-green-500"
              title="Download"
            >
              <HiDownload className="text-sm" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); dispatch(openModal({ modal: 'share', data: file })) }}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-700 shadow text-dark-500 hover:text-blue-500"
              title="Share"
            >
              <HiShare className="text-sm" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

const FileGrid = ({ files, onRefresh, showRestore = false, selectable = !showRestore }) => {
  if (!files?.length) return null

  return (
    <div className="file-grid">
      {files.map(file => (
        <FileCard key={file._id} file={file} onRefresh={onRefresh} showRestore={showRestore} selectable={selectable} />
      ))}
    </div>
  )
}

export default FileGrid
