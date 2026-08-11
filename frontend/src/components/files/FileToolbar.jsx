import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HiX, HiTrash, HiDownload, HiShare, HiStar,
  HiFolder, HiTag, HiCheck,
} from 'react-icons/hi'
import { clearSelection, openModal, setSelectedFiles } from '../../store/slices/uiSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useConfirm } from '../ui/ConfirmDialog'

const FileToolbar = ({ files = [], onRefresh }) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { selectedFiles } = useSelector(state => state.ui)
  const count = selectedFiles.length
  const visibleIds = useMemo(() => files.map(file => file._id), [files])
  const selectedVisibleCount = visibleIds.filter(id => selectedFiles.includes(id)).length
  const allSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length

  useEffect(() => () => dispatch(clearSelection()), [dispatch])
  useEffect(() => {
    const visibleSet = new Set(visibleIds)
    const nextSelection = selectedFiles.filter(id => visibleSet.has(id))
    if (nextSelection.length !== selectedFiles.length) dispatch(setSelectedFiles(nextSelection))
  }, [dispatch, selectedFiles, visibleIds])

  const toggleSelectAll = () => {
    dispatch(setSelectedFiles(allSelected ? [] : visibleIds))
  }

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
      onClick: () => dispatch(openModal({ modal: 'share', data: files.find(file => file._id === selectedFiles[0]) })),
      hidden: count !== 1,
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
    <div className={`flex items-center gap-2 overflow-x-auto px-3 py-2.5 rounded-xl border animate-fade-in sm:px-4 ${count ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700/50' : 'bg-white dark:bg-dark-800 border-slate-100 dark:border-dark-700'}`}>
      <button
        type="button"
        onClick={toggleSelectAll}
        className="touch-target flex min-w-max items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-dark-600 transition-colors hover:bg-slate-100 dark:text-dark-200 dark:hover:bg-dark-700"
        aria-pressed={allSelected}
      >
        <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${allSelected ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-300 dark:border-dark-500'}`}>
          {allSelected && <HiCheck className="text-xs" />}
        </span>
        {allSelected ? 'Deselect all' : 'Select all'}
      </button>
      {count > 0 && <>
        <span className="min-w-max text-sm font-semibold text-primary-700 dark:text-primary-300">
          {count} selected
        </span>
        <div className="h-4 w-px bg-primary-200 dark:bg-primary-700/50" />
        <div className="flex min-w-max items-center gap-0.5 flex-1 sm:flex-wrap">
        {actions.filter(action => !action.hidden).map(action => (
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
      </>}
    </div>
  )
}

export default FileToolbar
