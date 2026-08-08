import { createSlice } from '@reduxjs/toolkit'

const uuidv4 = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const uploadSlice = createSlice({
  name: 'upload',
  initialState: {
    queue: [], // { id, file, name, size, progress, status, error }
    isUploading: false,
    totalProgress: 0,
  },
  reducers: {
    addToQueue(state, action) {
      const files = Array.isArray(action.payload) ? action.payload : [action.payload]
      files.forEach(file => {
        state.queue.push({
          id: file.id || uuidv4(),
          name: file.name,
          size: file.size,
          mimeType: file.type,
          progress: 0,
          status: 'pending', // pending | uploading | paused | completed | error
          error: null,
          folderId: file.folderId || null,
        })
      })
    },
    updateProgress(state, action) {
      const { id, progress } = action.payload
      const item = state.queue.find(q => q.id === id)
      if (item) {
        item.progress = progress
        item.status = 'uploading'
      }
      // Update total
      const total = state.queue.reduce((sum, q) => sum + q.progress, 0)
      state.totalProgress = Math.round(total / state.queue.length)
    },
    setUploadStatus(state, action) {
      const { id, status, error } = action.payload
      const item = state.queue.find(q => q.id === id)
      if (item) {
        item.status = status
        if (error) item.error = error
        if (status === 'completed') item.progress = 100
      }
    },
    removeFromQueue(state, action) {
      state.queue = state.queue.filter(q => q.id !== action.payload)
    },
    clearCompleted(state) {
      state.queue = state.queue.filter(q => q.status !== 'completed')
    },
    clearQueue(state) {
      state.queue = []
      state.totalProgress = 0
    },
    setIsUploading(state, action) {
      state.isUploading = action.payload
    },
    pauseUpload(state, action) {
      const item = state.queue.find(q => q.id === action.payload)
      if (item && item.status === 'uploading') item.status = 'paused'
    },
    resumeUpload(state, action) {
      const item = state.queue.find(q => q.id === action.payload)
      if (item && item.status === 'paused') item.status = 'pending'
    },
  },
})

export const {
  addToQueue, updateProgress, setUploadStatus, removeFromQueue,
  clearCompleted, clearQueue, setIsUploading, pauseUpload, resumeUpload,
} = uploadSlice.actions
export default uploadSlice.reducer
