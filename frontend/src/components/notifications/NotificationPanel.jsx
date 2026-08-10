import React from 'react'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { HiBell, HiX } from 'react-icons/hi'
import { markRead, markAllRead, removeNotification } from '../../store/slices/notificationSlice'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

const ICONS = {
  upload: '📤', share: '🔗', storage_warning: '⚠️', login: '🔐',
  comment: '💬', permission: '🛡️', system: '📢', ai: '✨',
}

const NotificationPanel = ({ onClose }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, unreadCount } = useSelector(state => state.notifications)

  const handleMarkRead = (id) => {
    api.patch(`/notifications/${id}/read`).catch(() => {})
    dispatch(markRead(id))
  }

  const handleMarkAllRead = () => {
    api.patch('/notifications/read-all').catch(() => {})
    dispatch(markAllRead())
  }

  const handleDelete = (id) => {
    api.delete(`/notifications/${id}`).catch(() => {})
    dispatch(removeNotification(id))
  }

  const handleOpen = (notification) => {
    if (!notification.read) handleMarkRead(notification._id)
    if (notification.link) {
      navigate(notification.link)
      onClose?.()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="fixed inset-x-3 top-[4.25rem] z-50 max-h-[calc(100dvh-5.25rem)] overflow-hidden card shadow-glass-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80 sm:max-h-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-dark-700">
        <div className="flex items-center gap-2">
          <HiBell className="text-primary-500" />
          <span className="font-semibold text-sm text-dark-800 dark:text-dark-100">Notifications</span>
          {unreadCount > 0 && (
            <span className="badge bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs text-primary-500 hover:text-primary-600 font-medium">
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <HiBell className="text-3xl text-dark-300 mb-2" />
            <p className="text-sm text-dark-400">No notifications</p>
          </div>
        ) : (
          items.slice(0, 20).map(notif => (
            <div
              key={notif._id}
              onClick={() => handleOpen(notif)}
              className={`flex items-start gap-3 p-3.5 border-b border-slate-50 dark:border-dark-800 last:border-0 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-dark-800 ${!notif.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{ICONS[notif.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!notif.read ? 'text-dark-900 dark:text-white' : 'text-dark-600 dark:text-dark-300'}`}>
                  {notif.title}
                </p>
                <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">{notif.message}</p>
                <p className="text-xs text-dark-300 dark:text-dark-600 mt-1">
                  {new Date(notif.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(notif._id) }}
                className="text-dark-300 hover:text-red-400 p-0.5 flex-shrink-0"
              >
                <HiX className="text-sm" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default NotificationPanel
