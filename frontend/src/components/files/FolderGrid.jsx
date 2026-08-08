import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HiFolder, HiFolderOpen, HiStar, HiDotsVertical, HiTrash, HiPencil, HiColorSwatch } from 'react-icons/hi'
import api from '../../services/api'
import { openModal, setContextMenu } from '../../store/slices/uiSlice'
import toast from 'react-hot-toast'

const FOLDER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ef4444', '#8b5cf6', '#06b6d4']

const FolderCard = ({ folder, onRefresh }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  const starMutation = useMutation({
    mutationFn: () => api.patch(`/folders/${folder._id}`, { starred: !folder.starred }),
    onSuccess: () => { queryClient.invalidateQueries(['folders']); onRefresh?.() },
  })

  const handleContextMenu = (e) => {
    e.preventDefault()
    dispatch(setContextMenu({ x: e.clientX, y: e.clientY, folder, type: 'folder' }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      onContextMenu={handleContextMenu}
      className="card p-4 cursor-pointer group relative hover:border-primary-200 dark:hover:border-primary-700"
      onDoubleClick={() => navigate(`/folder/${folder._id}`)}
    >
      {/* Star */}
      <button
        onClick={e => { e.stopPropagation(); starMutation.mutate() }}
        className={`absolute top-2.5 right-2.5 p-1 rounded-lg transition-all ${folder.starred ? 'text-amber-400' : 'text-transparent group-hover:text-dark-300 hover:text-amber-400'}`}
      >
        <HiStar className="text-sm" />
      </button>

      {/* Icon */}
      <div className="mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${folder.color}20` }}
        >
          <HiFolder className="text-3xl" style={{ color: folder.color }} />
        </div>
      </div>

      <p className="text-sm font-medium text-dark-700 dark:text-dark-200 truncate" title={folder.name}>
        {folder.name}
      </p>
      <p className="text-xs text-dark-400 mt-0.5">
        {new Date(folder.createdAt).toLocaleDateString()}
      </p>
    </motion.div>
  )
}

const FolderGrid = ({ folders, onRefresh }) => {
  if (!folders?.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {folders.map(folder => (
        <FolderCard key={folder._id} folder={folder} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

export default FolderGrid
