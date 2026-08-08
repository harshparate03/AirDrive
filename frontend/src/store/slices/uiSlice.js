import { createSlice } from '@reduxjs/toolkit'

const getInitialTheme = () => {
  const saved = localStorage.getItem('theme')
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: getInitialTheme(),
    sidebarOpen: true,
    sidebarCollapsed: false,
    viewMode: localStorage.getItem('viewMode') || 'grid', // grid | list
    previewFile: null,
    selectedFiles: [],
    searchQuery: '',
    contextMenu: null, // { x, y, file, type }
    modals: {
      createFolder: false,
      share: false,
      rename: false,
      move: false,
      aiChat: false,
      uploadProgress: false,
      filePreview: false,
      deleteConfirm: false,
      settings: false,
    },
    activeModal: null,
    modalData: null,
    currentFolder: null, // current folder being viewed
    breadcrumb: [],
  },
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', state.theme)
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    setTheme(state, action) {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    toggleSidebarCollapse(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setViewMode(state, action) {
      state.viewMode = action.payload
      localStorage.setItem('viewMode', action.payload)
    },
    setPreviewFile(state, action) {
      state.previewFile = action.payload
    },
    setSelectedFiles(state, action) {
      state.selectedFiles = action.payload
    },
    toggleFileSelection(state, action) {
      const id = action.payload
      if (state.selectedFiles.includes(id)) {
        state.selectedFiles = state.selectedFiles.filter(f => f !== id)
      } else {
        state.selectedFiles.push(id)
      }
    },
    clearSelection(state) {
      state.selectedFiles = []
    },
    setSearchQuery(state, action) {
      state.searchQuery = action.payload
    },
    setContextMenu(state, action) {
      state.contextMenu = action.payload
    },
    openModal(state, action) {
      state.activeModal = action.payload.modal
      state.modalData = action.payload.data || null
    },
    closeModal(state) {
      state.activeModal = null
      state.modalData = null
    },
    setCurrentFolder(state, action) {
      state.currentFolder = action.payload
    },
    setBreadcrumb(state, action) {
      state.breadcrumb = action.payload
    },
  },
})

export const {
  toggleTheme, setTheme, toggleSidebar, toggleSidebarCollapse, setViewMode,
  setPreviewFile, setSelectedFiles, toggleFileSelection, clearSelection,
  setSearchQuery, setContextMenu, openModal, closeModal,
  setCurrentFolder, setBreadcrumb,
} = uiSlice.actions
export default uiSlice.reducer
