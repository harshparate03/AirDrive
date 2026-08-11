import { useDispatch } from 'react-redux'
import { useQueryClient } from '@tanstack/react-query'
import { addToQueue, setUploadStatus, updateProgress, setIsUploading } from '../store/slices/uploadSlice'
import { uploadFiles } from '../services/api'
import toast from 'react-hot-toast'

const genId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const useUpload = (folderId = null) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  const uploadOne = async (file, id) => {
    const formData = new FormData()
    formData.append('files', file)
    if (folderId) formData.append('folderId', folderId)
    if (file.webkitRelativePath) formData.append('relativePath', file.webkitRelativePath)

    try {
      const response = await uploadFiles(formData, (progress) => {
        // Per-file progress (each file is uploaded in its own request)
        // Reserve the final 5% for server-side storage/database processing.
        dispatch(updateProgress({ id, progress: Math.min(progress, 95) }))
      })
      dispatch(setUploadStatus({ id, status: 'completed' }))
      return response.data?.files || []
    } catch (error) {
      dispatch(setUploadStatus({
        id,
        status: 'error',
        error: error.response?.data?.error || 'Upload failed',
      }))
      return []
    }
  }

  const upload = async (files) => {
    if (!files?.length) return

    const fileArray = Array.isArray(files) ? files : Array.from(files)

    // Add each file to queue with its own id (id is passed so progress
    // updates target the correct queue item)
    const queueItems = fileArray.map(file => {
      const id = genId()
      dispatch(addToQueue({ id, name: file.name, size: file.size, type: file.type, folderId }))
      return { id, file }
    })

    // Upload files one at a time (sequential) for stable per-file progress
    dispatch(setIsUploading(true))
    let successCount = 0
    const uploadedFiles = []

    for (const item of queueItems) {
      const uploaded = await uploadOne(item.file, item.id)
      if (uploaded.length) {
        successCount += 1
        uploadedFiles.push(...uploaded)
      }
    }

    dispatch(setIsUploading(false))

    queryClient.invalidateQueries({ queryKey: ['files'] })
    queryClient.invalidateQueries({ queryKey: ['storage'] })
    queryClient.invalidateQueries({ queryKey: ['recent'] })
    queryClient.invalidateQueries({ queryKey: ['userStats'] })
    queryClient.invalidateQueries({ queryKey: ['files-for-ai'] })

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`)
    }
    if (successCount < fileArray.length) {
      toast.error(`${fileArray.length - successCount} file${fileArray.length - successCount > 1 ? 's' : ''} failed to upload`)
    }

    return uploadedFiles
  }

  return { upload }
}

export default useUpload
