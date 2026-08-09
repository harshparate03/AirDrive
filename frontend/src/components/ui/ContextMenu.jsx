import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HiEye, HiDownload, HiShare, HiStar, HiTrash, HiPencil,
  HiDuplicate, HiTag, HiLightningBolt, HiFolder, HiRefresh,
  HiClock, HiDocumentDuplicate, HiChatAlt2, HiCheck,
} from 'react-icons/hi'
import { setContextMenu, openModal } from '../../store/slices/uiSlice'
import api, { downloadFile } from '../../services/api'
import toast from 'react-hot-toast'
import { useConfirm } from './ConfirmDialog'

const ContextMenu = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { contextMenu } = useSelector(state => state.ui)
  const menuRef = useRef(null)
  const [suggestedName, setSuggestedName] = useState('')
  const confirm = useConfirm()

  if (!contextMenu) return null

  const { x, y, file, folder, type } = contextMenu

  // Clamp position to viewport
  const menuW = 200, menuH = 340
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  const close = () => dispatch(setContextMenu(null))

  const star = useMutation({
    mutationFn: () => api.post('/files/star', { fileId: file._id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['files'] }); close() },
  })
  const trash = useMutation({
    mutationFn: () => api.delete(`/files/${file._id}`),
    onSuccess: () => { toast.success('Moved to trash'); queryClient.invalidateQueries({ queryKey: ['files'] }); close() },
  })
  const copy = useMutation({
    mutationFn: () => api.post('/files/copy', { fileId: file._id }),
    onSuccess: () => { toast.success('File copied'); queryClient.invalidateQueries({ queryKey: ['files'] }); close() },
  })
  const aiTag = useMutation({
    mutationFn: () => api.post('/ai/tags', { fileId: file._id }),
    onSuccess: (res) => { toast.success(`Generated ${res.data.tags?.length} tags`); queryClient.invalidateQueries({ queryKey: ['files'] }); close() },
    onError: () => toast.error('AI tagging failed'),
  })
const aiRename = useMutation({
    mutationFn: () => api.post('/ai/rename', { fileId: file._id }),
    onSuccess: (res) => {
      setSuggestedName(res.data.suggestedName)
      toast.success(`Suggested new name`)
    },
    onError: () => toast.error('AI rename failed'),
  })

  const aiRenameApply = useMutation({
    mutationFn: (newName) => api.post('/ai/rename/apply', { fileId: file._id, newName }),
    onSuccess: () => {
      toast.success('File renamed')
      setSuggestedName('')
      queryClient.invalidateQueries({ queryKey: ['files'] })
      close()
    },
    onError: () => toast.error('Failed to apply rename'),
  })

  const handleDownload = async () => {
    try {
      const res = await downloadFile(file._id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = file.name; a.click()
      URL.revokeObjectURL(url)
    } catch { if (file.webContentLink) window.open(file.webContentLink) }
    close()
  }

  const fileItems = [
    {
      icon: HiEye, label: 'Preview',
      action: () => { dispatch(openModal({ modal: 'filePreview', data: file })); close() },
    },
    {
      icon: HiDownload, label: 'Download',
      action: handleDownload,
    },
    {
      icon: HiShare, label: 'Share',
      action: () => { dispatch(openModal({ modal: 'share', data: file })); close() },
    },
    {
      icon: HiStar, label: file?.starred ? 'Unstar' : 'Star',
      action: () => star.mutate(),
      loading: star.isPending,
    },
    {
      icon: HiPencil, label: 'Rename',
      action: () => { dispatch(openModal({ modal: 'rename', data: file })); close() },
    },
    {
      icon: HiFolder, label: 'Move to',
      action: () => { dispatch(openModal({ modal: 'move', data: { fileIds: [file._id] } })); close() },
    },
    {
      icon: HiDocumentDuplicate, label: 'Make a Copy',
      action: () => copy.mutate(),
      loading: copy.isPending,
    },
    {
      icon: HiChatAlt2, label: 'Comments',
      action: () => { dispatch(openModal({ modal: 'comments', data: file })); close() },
    },
    {
      icon: HiClock, label: 'Version History',
      action: () => { dispatch(openModal({ modal: 'versionHistory', data: file })); close() },
    },
    { divider: true },
    {
      icon: HiTag, label: 'Generate AI Tags',
      action: () => aiTag.mutate(),
      loading: aiTag.isPending,
      dim: true,
    },
    {
      icon: HiLightningBolt, label: 'AI Rename Suggest',
      action: () => aiRename.mutate(),
      loading: aiRename.isPending,
      dim: true,
    },
    { divider: true },
    {
      icon: HiTrash, label: 'Move to Trash',
      action: () => trash.mutate(),
      loading: trash.isPending,
      danger: true,
    },
  ]

  const folderItems = [
    {
      icon: HiFolder, label: 'Open',
      action: () => { close() },
    },
    {
      icon: HiPencil, label: 'Rename',
      action: () => { dispatch(openModal({ modal: 'rename', data: { ...folder, type: 'folder' } })); close() },
    },
    {
      icon: HiStar, label: folder?.starred ? 'Unstar' : 'Star',
      action: () => {
        api.patch(`/folders/${folder._id}`, { starred: !folder.starred })
          .then(() => queryClient.invalidateQueries({ queryKey: ['folders'] }))
        close()
      },
    },
    { divider: true },
    {
      icon: HiTrash, label: 'Delete Folder',
      action: async () => {
        if (await confirm({ title: 'Delete folder?', message: `"${folder.name}" and its contents will be moved to trash.`, confirmLabel: 'Delete folder' })) {
          api.delete(`/folders/${folder._id}`)
            .then(() => { queryClient.invalidateQueries({ queryKey: ['folders'] }); toast.success('Folder deleted') })
            .catch(() => toast.error('Delete failed'))
        }
        close()
      },
      danger: true,
    },
  ]

  const items = type === 'folder' ? folderItems : fileItems

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left, top, zIndex: 9999, minWidth: menuW + 40 }}
      className="bg-white dark:bg-dark-800 rounded-xl shadow-glass-lg border border-slate-100 dark:border-dark-700 py-1.5 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {suggestedName && (
        <div className="px-3 py-2 border-b border-slate-100 dark:border-dark-700">
          <p className="text-[10px] font-semibold text-dark-400 dark:text-dark-500 uppercase tracking-wider mb-1.5">AI suggested</p>
          <p className="text-xs text-primary-600 dark:text-primary-400 truncate mb-2" title={suggestedName}>{suggestedName}</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => aiRenameApply.mutate(suggestedName)}
              disabled={aiRenameApply.isPending}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
            >
              {aiRenameApply.isPending
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <HiCheck className="text-xs" />}
              Apply
            </button>
            <button
              onClick={() => setSuggestedName('')}
              className="flex-1 text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-dark-700 text-dark-500 dark:text-dark-300 hover:bg-slate-200 dark:hover:bg-dark-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {items.map((item, i) => {
        if (item.divider) return (
          <div key={i} className="my-1 border-t border-slate-100 dark:border-dark-700" />
        )
        return (
          <button
            key={i}
            onClick={item.action}
            disabled={item.loading}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left disabled:opacity-60
              ${item.danger
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                : item.dim
                  ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  : 'text-dark-700 dark:text-dark-200 hover:bg-slate-50 dark:hover:bg-dark-700'
              }`}
          >
            {item.loading
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
              : <item.icon className="text-base flex-shrink-0" />
            }
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export default ContextMenu
