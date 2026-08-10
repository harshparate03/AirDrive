import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HiX, HiTrash, HiDownload, HiShare, HiStar,
  HiFolder, HiTag,
} from 'react-icons/hi'
import { clearSelection, openModal } from '../../store/slices/uiSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useConfirm } from '../ui/ConfirmDialog'

const FileToolbar = ({ onRefresh }) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { selectedFiles } = useSelector(state => state.ui)
  const count = selectedFiles.length

  const bulkTrash = useMutation({
    mutationFn: () => api.post('/bulk/delete', { fileIds: selectedFiles }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      dispatch(clearSelection())
      queryClient.invalidateQueries({ queryKey: ['files'] })
      onRefresh?.()
    },
  })

  const bulkStar = useMutation({
    mutationFn: () => api.post('/bulk/star', { fileIds: selectedFiles }),
    onSuccess: () => {
      toast.success(`${count} file(s) starred`)
      dispatch(clearSelection())
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['starred'] })
      onRefresh?.()
    },
  })

  const bulkAITag = useMutation({
    mutationFn: () => Promise.all(selectedFiles.map(id => api.post('/ai/tags', { fileId: id }))),
    onSuccess: () => {
      toast.success(`AI tags generated for ${count} file(s)`)
      dispatch(clearSelection())
      queryClient.invalidateQueries({ queryKey: ['files'] })
      onRefresh?.()
    },
    onError: () => toast.error('AI tagging failed — check your API key'),
  })

  const handleBulkDownload = async () => {
    if (count > 50) return toast.error('Max 50 files for ZIP download')
    toast.loading('Creating ZIP...', { id: 'zip' })
    try {
      const res = await api.post('/bulk/download-zip', { fileIds: selectedFiles }, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `airdrive-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('ZIP downloaded!', { id: 'zip' })
    } catch {
      toast.error('ZIP download failed', { id: 'zip' })
    }
  }

  if (!count) return null

  const actions = [
    {
      icon: HiStar, label: 'Star',
      onClick: () => bulkStar.mutate(),
      loading: bulkStar.isPending,
      className: 'text-amber-500',
    },
    {
      icon: HiFolder, label: 'Move',
      onClick: () => dispatch(openModal({ modal: 'move', data: { fileIds: selectedFiles } })),
    },
    {
      icon: HiDownload, label: 'Download ZIP',
      onClick: handleBulkDownload,
      className: 'text-green-600',
    },
    {
      icon: HiShare, label: 'Share',
      onClick: () => dispatch(openModal({ modal: 'share', data: { fileIds: selectedFiles } })),
    },
    {
      icon: HiTag, label: 'AI Tag',
      onClick: () => bulkAITag.mutate(),
      loading: bulkAITag.isPending,
      className: 'text-primary-500',
    },
    {
      icon: HiTrash, label: 'Delete',
      onClick: async () => {
        if (await confirm({ title: 'Move files to trash?', message: `${count} selected file(s) will be moved to trash.`, confirmLabel: 'Move to trash' })) bulkTrash.mutate()
      },
      loading: bulkTrash.isPending,
      className: 'text-red-500',
    },
  ]

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700/50 animate-fade-in sm:px-4">
      <span className="text-sm font-semibold text-primary-700 dark:text-primary-300 mr-1">
        {count} selected
      </span>
      <div className="w-px h-4 bg-primary-200 dark:bg-primary-700/50" />
      <div className="flex min-w-max items-center gap-0.5 flex-1 sm:flex-wrap">
        {actions.map(action => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.loading}
            className={`touch-target flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-primary-100 dark:hover:bg-primary-800/30 disabled:opacity-50 ${action.className || 'text-dark-600 dark:text-dark-300'}`}
            title={action.label}
          >
            {action.loading
              ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <action.icon className="text-base" />
            }
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => dispatch(clearSelection())}
        className="ml-auto btn-ghost p-1.5 text-dark-400 hover:text-dark-600"
        title="Deselect all"
      >
        <HiX className="text-sm" />
      </button>
    </div>
  )
}

export default FileToolbar
