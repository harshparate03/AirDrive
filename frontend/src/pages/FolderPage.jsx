import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { HiFolderAdd, HiUpload, HiChevronLeft, HiRefresh, HiExclamationCircle } from 'react-icons/hi'
import api from '../services/api'
import FileGrid from '../components/files/FileGrid'
import FileList from '../components/files/FileList'
import FolderGrid from '../components/files/FolderGrid'
import CreateFolderModal from '../components/modals/CreateFolderModal'
import UploadDropzone from '../components/upload/UploadDropzone'
import Breadcrumb from '../components/ui/Breadcrumb'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import ViewModeToggle from '../components/ui/ViewModeToggle'
import FileToolbar from '../components/files/FileToolbar'
import { useDispatch } from 'react-redux'
import { clearSelection, openModal } from '../store/slices/uiSlice'

const FolderPage = () => {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { viewMode } = useSelector(state => state.ui)
  const [showCreateFolder, setShowCreateFolder] = useState(false)

  useEffect(() => {
    dispatch(clearSelection())
    return () => dispatch(clearSelection())
  }, [dispatch, folderId])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['folder-contents', folderId],
    queryFn: () => api.get(`/folders/${folderId}/contents`).then(r => r.data),
    enabled: !!folderId,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['folder-contents', folderId] })
    queryClient.invalidateQueries({ queryKey: ['files'] })
    queryClient.invalidateQueries({ queryKey: ['folders'] })
  }

  const folder = data?.folder
  const subFolders = data?.folders || []
  const files = data?.files || []

  // Build breadcrumb
  const breadcrumbItems = [
    { label: 'My Drive', to: '/my-drive' },
    ...(folder?.path?.map(p => ({ label: p.name, to: `/folder/${p._id}` })) || []),
    { label: folder?.name || 'Loading...' },
  ]

  return (
    <UploadDropzone folderId={folderId}>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 text-dark-400">
                <HiChevronLeft className="text-lg" />
              </button>
              <h1 className="text-xl font-bold text-dark-900 dark:text-white">
                {folder?.name || 'Folder'}
              </h1>
            </div>
            <Breadcrumb items={breadcrumbItems} />
          </div>
<div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
            <ViewModeToggle />
            <button onClick={() => setShowCreateFolder(true)} className="btn-secondary text-sm flex items-center gap-2">
              <HiFolderAdd /> New Folder
            </button>
            <button onClick={() => dispatch(openModal({ modal: 'upload', data: { folderId } }))} className="btn-primary text-sm flex items-center gap-2">
              <HiUpload /> Upload
            </button>
          </div>
        </div>

        {!isLoading && files.length > 0 && <FileToolbar files={files} onRefresh={handleRefresh} />}

        {isLoading && <LoadingSkeleton count={8} />}

        {isError && (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/60 px-5 text-center dark:border-red-900/40 dark:bg-red-900/10">
            <HiExclamationCircle className="mb-3 text-5xl text-red-400" />
            <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200">Folder could not be opened</h3>
            <p className="mt-1 max-w-md text-sm text-dark-400">{error?.response?.data?.error || 'The folder may have been moved, deleted, or the connection was interrupted.'}</p>
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => refetch()} className="btn-primary flex items-center gap-2"><HiRefresh /> Try again</button><button type="button" onClick={() => navigate('/my-drive')} className="btn-secondary">Back to My Drive</button></div>
          </div>
        )}

        {!isLoading && !isError && subFolders.length === 0 && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
              <HiUpload className="text-4xl text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200 mb-1">Folder is empty</h3>
            <p className="text-dark-400 text-sm">Upload files or create subfolders</p>
          </div>
        )}

        {/* Sub-folders */}
        {!isLoading && !isError && subFolders.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Folders</h2>
            <FolderGrid folders={subFolders} onRefresh={handleRefresh} />
          </div>
        )}

        {/* Files */}
        {!isLoading && !isError && files.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Files</h2>
            {viewMode === 'grid'
              ? <FileGrid files={files} onRefresh={handleRefresh} />
              : <FileList files={files} onRefresh={handleRefresh} />
            }
          </div>
        )}
      </div>

      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
          onCreated={handleRefresh}
          parentFolderId={folderId}
        />
      )}
    </UploadDropzone>
  )
}

export default FolderPage
