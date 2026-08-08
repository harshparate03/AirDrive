import React from 'react'
import { useSelector } from 'react-redux'

const ICONS = { upload: '📤', share: '🔗', storage_warning: '⚠️', login: '🔐', comment: '💬', system: '📢' }

const NotificationsList = ({ compact }) => {
  const { items } = useSelector(state => state.notifications)
  const list = compact ? items.slice(0, 5) : items

  if (!list.length) return <p className="text-xs text-dark-400 py-4 text-center">No notifications yet</p>

  return (
    <div className="space-y-2">
      {list.map(n => (
        <div key={n._id} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${!n.read ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
          <span className="text-base">{ICONS[n.type] || '🔔'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-dark-700 dark:text-dark-200 truncate">{n.title}</p>
            <p className="text-xs text-dark-400 truncate">{n.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default NotificationsList
