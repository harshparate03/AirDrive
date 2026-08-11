import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiFolderAdd, HiUpload,
} from 'react-icons/hi'
import api from '../services/api'
import FileGrid from '../components/files/FileGrid'
import FileList from '../components/files/FileList'
import FolderGrid from '../components/files/FolderGrid'
import CreateFolderModal from '../components/modals/CreateFolderModal'
import UploadDropzone from '../components/upload/UploadDropzone'
import Breadcrumb from '../components/ui/Breadcrumb'
import FileToolbar from '../components/files/FileToolbar'
import { clearSelection, openModal } from '../store/slices/uiSlice'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import ViewModeToggle from '../components/ui/ViewModeToggle'

const MyDrivePage = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { viewMode } = useSelector(state => state.ui)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterType, setFilterType] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => () => dispatch(clearSelection()), [dispatch])

  const { data: folderData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', null],
    queryFn: () => api.get('/folders', { params: { parentFolder: '' } }).then(r => r.data),
  })

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files', null, sortBy, sortOrder, filterType],
    queryFn: () => api.get('/files', {
      params: { folderId: '', sortBy, sortOrder, category: filterType || undefined },
    }).then(r => r.data),
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries(['files'])
    queryClient.invalidateQueries(['folders'])
  }

  const isLoading = foldersLoading || filesLoading
  const folders = folderData?.folders || []
  const files = filesData?.files || []
  const isEmpty = !isLoading && folders.length === 0 && files.length === 0

  return (
    <UploadDropzone
      onDragOver={() => setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => setIsDragOver(false)}
      folderId={null}
    >
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-dark-900 dark:text-white">My Drive</h1>
            <Breadcrumb items={[{ label: 'My Drive', to: '/my-drive' }]} />
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
            <ViewModeToggle />
            <button
              onClick={() => setShowCreateFolder(true)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <HiFolderAdd />
              New Folder
            </button>
            <button
              onClick={() => dispatch(openModal({ modal: 'upload' }))}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <HiUpload />
              Upload
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {!isLoading && files.length > 0 && <FileToolbar files={files} onRefresh={handleRefresh} />}

        {/* Sort & Filter */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 text-sm">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="input w-auto py-1.5 text-sm"
          >
            <option value="createdAt">Date Created</option>
            <option value="updatedAt">Date Modified</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="input w-auto py-1.5 text-sm"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="input w-auto py-1.5 text-sm"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="pdf">PDFs</option>
            <option value="document">Documents</option>
            <option value="spreadsheet">Spreadsheets</option>
            <option value="presentation">Presentations</option>
            <option value="archive">Archives</option>
          </select>
        </div>

        {/* Loading */}
        {isLoading && <LoadingSkeleton count={8} />}

        {/* Empty state */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
              <HiUpload className="text-4xl text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200 mb-1">Your drive is empty</h3>
            <p className="text-dark-400 dark:text-dark-500 text-sm mb-4">
              Upload files or create folders to get started
            </p>
            <button
              onClick={() => dispatch(openModal({ modal: 'upload' }))}
              className="btn-primary flex items-center gap-2"
            >
              <HiUpload /> Upload Your First File
            </button>
          </motion.div>
        )}

        {/* Folders */}
        {!isLoading && folders.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-dark-400 dark:text-dark-500 uppercase tracking-wider mb-3">
              Folders
            </h2>
            <FolderGrid folders={folders} onRefresh={handleRefresh} />
          </div>
        )}

        {/* Files */}
        {!isLoading && files.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-dark-400 dark:text-dark-500 uppercase tracking-wider mb-3">
              Files
            </h2>
            {viewMode === 'grid'
              ? <FileGrid files={files} onRefresh={handleRefresh} />
              : <FileList files={files} onRefresh={handleRefresh} />
            }
          </div>
        )}

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="drag-overlay rounded-2xl"
            >
              <div className="text-center text-primary-600">
                <HiUpload className="text-6xl mx-auto mb-3" />
                <p className="text-xl font-semibold">Drop files here to upload</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
          onCreated={handleRefresh}
          parentFolderId={null}
        />
      )}
    </UploadDropzone>
  )
}

export default MyDrivePage
