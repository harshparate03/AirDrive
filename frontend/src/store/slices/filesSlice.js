import { createSlice } from '@reduxjs/toolkit'

const filesSlice = createSlice({
  name: 'files',
  initialState: {
    items: [],
    folders: [],
    loading: false,
    error: null,
    totalCount: 0,
    pagination: { page: 1, limit: 50, total: 0, pages: 0 },
  },
  reducers: {
    setFiles(state, action) {
      state.items = action.payload.files || []
      state.totalCount = action.payload.total || 0
      if (action.payload.pagination) state.pagination = action.payload.pagination
    },
    setFolders(state, action) {
      state.folders = action.payload
    },
    addFile(state, action) {
      state.items.unshift(action.payload)
    },
    updateFile(state, action) {
      const idx = state.items.findIndex(f => f._id === action.payload._id)
      if (idx !== -1) state.items[idx] = action.payload
    },
    removeFile(state, action) {
      state.items = state.items.filter(f => f._id !== action.payload)
    },
    addFolder(state, action) {
      state.folders.unshift(action.payload)
    },
    updateFolder(state, action) {
      const idx = state.folders.findIndex(f => f._id === action.payload._id)
      if (idx !== -1) state.folders[idx] = action.payload
    },
    removeFolder(state, action) {
      state.folders = state.folders.filter(f => f._id !== action.payload)
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    setError(state, action) {
      state.error = action.payload
    },
  },
})

export const {
  setFiles, setFolders, addFile, updateFile, removeFile,
  addFolder, updateFolder, removeFolder, setLoading, setError,
} = filesSlice.actions
export default filesSlice.reducer
