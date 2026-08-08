import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HiX, HiPencil } from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'

const RenameModal = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { modalData } = useSelector(s => s.ui)
  const isFolder = modalData?.type === 'folder'
  const [name, setName] = useState(modalData?.name || '')

  const renameMutation = useMutation({
    mutationFn: () => isFolder
      ? api.patch(`/folders/${modalData._id}`, { name })
      : api.patch(`/files/${modalData._id}`, { name }),
    onSuccess: () => {
      toast.success('Renamed successfully')
      queryClient.invalidateQueries([isFolder ? 'folders' : 'files'])
      dispatch(closeModal())
    },
    onError: () => toast.error('Failed to rename'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100 flex items-center gap-2">
            <HiPencil className="text-primary-500" />
            Rename {isFolder ? 'Folder' : 'File'}
          </h2>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1.5"><HiX /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (name.trim()) renameMutation.mutate() }} className="space-y-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            autoFocus
            placeholder="Enter new name"
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => dispatch(closeModal())} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={!name.trim() || renameMutation.isPending} className="btn-primary flex-1">
              {renameMutation.isPending ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default RenameModal
