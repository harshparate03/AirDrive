import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { HiX, HiFolder } from 'react-icons/hi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const CreateFolderModal = ({ onClose, onCreated, parentFolderId }) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () => api.post('/folders', { name, color, parentFolder: parentFolderId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders'])
      toast.success('Folder created')
      onCreated?.()
      onClose()
    },
    onError: () => toast.error('Failed to create folder'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-800 dark:text-dark-100">New Folder</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><HiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Folder preview */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <HiFolder className="text-4xl" style={{ color }} />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Folder Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Folder"
              className="input"
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-dark-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={!name.trim() || createMutation.isPending} className="btn-primary flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default CreateFolderModal
