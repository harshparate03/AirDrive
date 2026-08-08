import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import filesReducer from './slices/filesSlice'
import uploadReducer from './slices/uploadSlice'
import notificationReducer from './slices/notificationSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    files: filesReducer,
    upload: uploadReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['upload/addUpload'],
        ignoredPaths: ['upload.queue'],
      },
    }),
})

export default store
