import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
  },
  reducers: {
    setNotifications(state, action) {
      state.items = action.payload.notifications || []
      state.unreadCount = action.payload.unreadCount || 0
    },
    addNotification(state, action) {
      state.items.unshift(action.payload)
      state.unreadCount += 1
    },
    markRead(state, action) {
      const notif = state.items.find(n => n._id === action.payload)
      if (notif && !notif.read) {
        notif.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllRead(state) {
      state.items.forEach(n => { n.read = true })
      state.unreadCount = 0
    },
    removeNotification(state, action) {
      const notif = state.items.find(n => n._id === action.payload)
      if (notif && !notif.read) state.unreadCount = Math.max(0, state.unreadCount - 1)
      state.items = state.items.filter(n => n._id !== action.payload)
    },
  },
})

export const { setNotifications, addNotification, markRead, markAllRead, removeNotification } = notificationSlice.actions
export default notificationSlice.reducer
