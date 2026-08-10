import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HiX, HiFolder, HiChevronRight, HiCheck } from 'react-icons/hi'
import { closeModal, clearSelection } from '../../store/slices/uiSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'

const MoveModal = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { modalData, selectedFiles } = useSelector(s => s.ui)
  const [targetFolderId, setTargetFolderId] = useState(null)
  const [browseFolderId, setBrowseFolderId] = useState(null)

  // Files to move: either from modal data or selection
  const fileIds = modalData?.fileIds || selectedFiles

  const { data: foldersData } = useQuery({
    queryKey: ['folders-picker', browseFolderId],
    queryFn: () => api.get('/folders', { params: { parentFolder: browseFolderId || '' } }).then(r => r.data),
  })

  const moveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(fileIds.map(fileId =>
        api.post('/files/move', { fileId, newFolderId: targetFolderId })
      ))
    },
    onSuccess: () => {
      toast.success(`${fileIds.length} file(s) moved`)
      queryClient.invalidateQueries({ queryKey: ['files'] })
      dispatch(clearSelection())
      dispatch(closeModal())
    },
    onError: () => toast.error('Move failed'),
  })

  const folders = foldersData?.folders || []

  return (
    <div className="modal-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-surface card w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-dark-700">
          <HiFolder className="text-primary-500 text-lg" />
          <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100 flex-1">
            Move {fileIds.length} item{fileIds.length > 1 ? 's' : ''}
          </h2>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1.5"><HiX /></button>
        </div>

        <div className="p-4">
          {/* Root option */}
          <button
            onClick={() => setTargetFolderId(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 text-sm font-medium transition-colors ${
              targetFolderId === null
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-slate-50 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300'
            }`}
          >
            <HiFolder className="text-lg text-amber-500" />
            My Drive (root)
            {targetFolderId === null && <HiCheck className="ml-auto text-primary-500" />}
          </button>

          {/* Folder list */}
          <div className="max-h-52 overflow-y-auto space-y-1">
            {folders.map(folder => (
              <div key={folder._id} className="flex items-center">
                <button
                  onClick={() => setTargetFolderId(folder._id)}
                  className={`flex-1 flex items-center gap-3 p-2.5 rounded-xl text-sm transition-colors ${
                    targetFolderId === folder._id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-slate-50 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300'
                  }`}
                >
                  <HiFolder className="text-base flex-shrink-0" style={{ color: folder.color || '#6366f1' }} />
                  <span className="truncate">{folder.name}</span>
                  {targetFolderId === folder._id && <HiCheck className="ml-auto flex-shrink-0 text-primary-500" />}
                </button>
                <button
                  onClick={() => setBrowseFolderId(folder._id)}
                  className="p-2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
                  title="Open folder"
                >
                  <HiChevronRight className="text-sm" />
                </button>
              </div>
            ))}
            {folders.length === 0 && (
              <p className="text-xs text-dark-400 text-center py-4">No folders here</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-4 pb-4">
          <button onClick={() => dispatch(closeModal())} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => moveMutation.mutate()}
            disabled={moveMutation.isPending}
            className="btn-primary flex-1"
          >
            {moveMutation.isPending ? 'Moving...' : 'Move Here'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default MoveModal
