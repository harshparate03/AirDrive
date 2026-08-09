import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { HiTrash, HiRefresh, HiExclamation, HiFolder } from 'react-icons/hi'
import { useSelector } from 'react-redux'
import api from '../services/api'
import toast from 'react-hot-toast'
import FileList from '../components/files/FileList'
import FileGrid from '../components/files/FileGrid'
import ViewModeToggle from '../components/ui/ViewModeToggle'
import { useConfirm } from '../components/ui/ConfirmDialog'

const TrashPage = () => {
  const { viewMode } = useSelector(state => state.ui)
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => api.get('/files', { params: { trashed: true } }).then(r => r.data),
  })
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['trash-folders'],
    queryFn: () => api.get('/folders', { params: { trashed: true } }).then(r => r.data),
  })

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const allFolders = foldersData?.folders || []
      const trashedIds = new Set(allFolders.map(folder => folder._id))
      const folders = allFolders.filter(folder => !folder.parentFolder || !trashedIds.has(String(folder.parentFolder)))
      const files = (data?.files || []).filter(file => !file.folderId || !trashedIds.has(String(file.folderId)))
      await Promise.all([
        ...files.map(f => api.delete(`/files/${f._id}`, { params: { permanent: true } })),
        ...folders.map(folder => api.delete(`/folders/${folder._id}`, { params: { permanent: true } })),
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['trash'])
      queryClient.invalidateQueries({ queryKey: ['trash-folders'] })
      toast.success('Trash emptied')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (fileId) => api.post('/files/trash', { fileId, restore: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['trash'])
      toast.success('File restored')
    },
  })

  const restoreFolderMutation = useMutation({
    mutationFn: (folderId) => api.post(`/folders/${folderId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-folders'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      toast.success('Folder restored')
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId) => api.delete(`/folders/${folderId}`, { params: { permanent: true } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-folders'] })
      toast.success('Folder permanently deleted')
    },
  })

  const allFolders = foldersData?.folders || []
  const trashedFolderIds = new Set(allFolders.map(folder => folder._id))
  const folders = allFolders.filter(folder => !folder.parentFolder || !trashedFolderIds.has(String(folder.parentFolder)))
  const files = (data?.files || []).filter(file => !file.folderId || !trashedFolderIds.has(String(file.folderId)))
  const isEmpty = files.length === 0 && folders.length === 0

  return (
    <div className="space-y-4 animate-fade-in">
<div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark-900 dark:text-white">Trash</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-0.5">Files are deleted permanently after 30 days</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle />
          {!isEmpty && (
            <button
              onClick={async () => {
                if (await confirm({ title: 'Empty trash?', message: 'Every file in trash will be permanently deleted. This cannot be undone.', confirmLabel: 'Empty trash' })) emptyTrashMutation.mutate()
              }}
              className="btn-secondary text-red-500 text-sm flex items-center gap-2"
            >
              <HiTrash /> Empty Trash
            </button>
          )}
        </div>
      </div>

      {/* Warning banner */}
      {!isEmpty && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-sm text-amber-700 dark:text-amber-300">
          <HiExclamation className="flex-shrink-0 text-lg" />
          Files in trash will be automatically deleted after 30 days
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !foldersLoading && isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-dark-800 flex items-center justify-center mb-4">
            <HiTrash className="text-4xl text-dark-300" />
          </div>
          <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200">Trash is empty</h3>
          <p className="text-dark-400 text-sm mt-1">Deleted files will appear here</p>
        </div>
      )}

      {folders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-dark-400">Folders</h2>
          {folders.map(folder => (
            <div key={folder._id} className="card flex items-center gap-3 p-3">
              <HiFolder className="text-2xl text-amber-400" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-700 dark:text-dark-200">{folder.name}</span>
              <button onClick={() => restoreFolderMutation.mutate(folder._id)} className="btn-secondary text-sm flex items-center gap-1"><HiRefresh /> Restore</button>
              <button onClick={async () => {
                if (await confirm({ title: 'Permanently delete folder?', message: `"${folder.name}" and everything inside it will be removed forever.`, confirmLabel: 'Delete forever' })) deleteFolderMutation.mutate(folder._id)
              }} className="btn-ghost p-2 text-red-500"><HiTrash /></button>
            </div>
          ))}
        </div>
      )}

{files.length > 0 && (
        viewMode === 'grid'
          ? <FileGrid files={files} showRestore onRefresh={() => queryClient.invalidateQueries(['trash'])} />
          : <FileList
              files={files}
              showRestore
              onRefresh={() => queryClient.invalidateQueries(['trash'])}
            />
      )}
    </div>
  )
}

export default TrashPage
