import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  HiUsers, HiDatabase, HiChartBar, HiShieldCheck,
  HiSpeakerphone, HiRefresh, HiExclamation, HiBell, HiUserCircle, HiChevronRight,
} from 'react-icons/hi'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { formatFileSize } from '../utils/fileUtils'
import ViewModeToggle from '../components/ui/ViewModeToggle'

const AdminPage = () => {
  const { user } = useSelector(s => s.auth)
  const { viewMode } = useSelector(s => s.ui)
  const queryClient = useQueryClient()
  const [announcement, setAnnouncement] = useState({ title: '', message: '' })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users', userPage, userSearch],
    queryFn: () => api.get('/admin/users', { params: { page: userPage, search: userSearch || undefined } }).then(r => r.data),
    enabled: activeTab === 'users',
  })

  const announceMutation = useMutation({
    mutationFn: () => api.post('/admin/announcements', announcement),
    onSuccess: () => { toast.success('Announcement sent'); setAnnouncement({ title: '', message: '' }) },
    onError: () => toast.error('Failed to send'),
  })

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, ...changes }) => api.patch(`/admin/users/${id}`, changes),
    onSuccess: () => queryClient.invalidateQueries(['admin-users']),
  })

  const stats = [
    { label: 'Total Users', value: dashData?.totalUsers || 0, icon: HiUsers, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Active Today', value: dashData?.activeUsers || 0, icon: HiShieldCheck, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Total Files', value: dashData?.totalFiles || 0, icon: HiDatabase, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'AI Requests', value: dashData?.aiUsage?.reduce((a, b) => a + b.count, 0) || 0, icon: HiChartBar, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ]

const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'announce', label: 'Announcements' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'logs', label: 'Logs' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <HiShieldCheck className="text-red-500 text-lg" />
        </div>
        <h1 className="text-xl font-bold text-dark-900 dark:text-white">Admin Panel</h1>
        <div className="ml-auto"><ViewModeToggle /></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-dark-800 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-dark-700 text-dark-800 dark:text-dark-100 shadow-sm'
                : 'text-dark-500 hover:text-dark-700 dark:text-dark-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`text-xl ${s.color}`} />
                </div>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">{s.value.toLocaleString()}</p>
                <p className="text-xs text-dark-400 mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Storage by category */}
          {dashData?.storageStats?.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Storage by Category</h2>
              <div className="space-y-2">
                {dashData.storageStats.map(s => (
                  <div key={s._id} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-dark-500 dark:text-dark-400 capitalize">{s._id || 'other'}</span>
                    <span className="w-20 text-dark-700 dark:text-dark-200 font-medium">{formatFileSize(s.totalSize)}</span>
                    <span className="text-dark-400">{s.count} files</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {dashData?.recentActivities?.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Recent Activity</h2>
              <div className="space-y-2">
                {dashData.recentActivities.slice(0, 10).map(a => (
                  <div key={a._id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-50 dark:border-dark-700 last:border-0">
                    <span className="capitalize badge bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs">{a.action}</span>
                    <span className="text-dark-600 dark:text-dark-300 flex-1 truncate">{a.userId?.email || 'Unknown'}</span>
                    <span className="text-dark-400 text-xs">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-dark-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">All Users ({usersData?.total || 0})</h2>
            <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1) }} placeholder="Search users" className="input max-w-52 py-1.5 text-sm" />
            <button onClick={() => queryClient.invalidateQueries(['admin-users'])} className="btn-ghost p-2"><HiRefresh /></button>
          </div>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3' : 'divide-y divide-slate-50 dark:divide-dark-700'}>
            {usersData?.users?.map(u => (
              <div key={u._id} className={`flex items-center gap-4 p-4 ${viewMode === 'grid' ? 'rounded-xl border border-slate-100 dark:border-dark-700' : ''}`}>
                <img src={u.photo || `https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff`} alt={u.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-800 dark:text-dark-100">{u.name}</p>
                  <p className="text-xs text-dark-400 truncate">{u.email}</p>
                </div>
                <span className={`badge text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-600 dark:bg-dark-700 dark:text-dark-300'}`}>
                  {u.role}
                </span>
                <select value={u.role} onChange={e => toggleUserMutation.mutate({ id: u._id, role: e.target.value })} className="input w-auto py-1 text-xs">
                  <option value="user">User</option><option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => toggleUserMutation.mutate({ id: u._id, isActive: !u.isActive })}
                  className={`text-xs font-medium px-2 py-1 rounded-lg ${u.isActive ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}
                >
                  {u.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
          {(usersData?.total || 0) > 20 && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-3 dark:border-dark-700">
              <button disabled={userPage === 1} onClick={() => setUserPage(page => page - 1)} className="btn-secondary text-sm">Previous</button>
              <span className="text-xs text-dark-400">Page {userPage}</span>
              <button disabled={userPage * 20 >= usersData.total} onClick={() => setUserPage(page => page + 1)} className="btn-secondary text-sm">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Announcements tab */}
      {activeTab === 'announce' && (
        <div className="card p-6 max-w-lg space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HiSpeakerphone className="text-primary-500 text-xl" />
            <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">Send Announcement</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">Title</label>
            <input
              value={announcement.title}
              onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))}
              className="input"
              placeholder="Announcement title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">Message</label>
            <textarea
              value={announcement.message}
              onChange={e => setAnnouncement(a => ({ ...a, message: e.target.value }))}
              className="input resize-none"
              rows={4}
              placeholder="Write your announcement..."
            />
          </div>
          <button
            onClick={() => announceMutation.mutate()}
            disabled={!announcement.title || !announcement.message || announceMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <HiSpeakerphone /> {announceMutation.isPending ? 'Sending...' : 'Send to All Users'}
          </button>
        </div>
      )}

{/* Notifications tab */}
      {activeTab === 'notifications' && (
        <AdminNotifications />
      )}

      {/* Logs tab */}
      {activeTab === 'logs' && (
        <SystemLogs />
      )}
    </div>
  )
}

const AdminNotifications = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/admin/notifications').then(r => r.data),
  })

  const notifications = data?.notifications || []

  if (isLoading) return <div className="skeleton h-64 rounded-2xl" />

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-dark-700 flex items-center gap-2">
        <HiBell className="text-primary-500" />
        <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">Admin Notifications</h2>
      </div>
      {notifications.length === 0 ? (
        <div className="p-8 text-center text-sm text-dark-400">No admin notifications yet</div>
      ) : (
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-dark-700">
          {notifications.map(n => (
            <div key={n._id} className="flex items-start gap-3 p-4">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                <HiUserCircle className="text-primary-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-dark-800 dark:text-dark-100">{n.title}</p>
                <p className="text-xs text-dark-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-dark-300 dark:text-dark-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SystemLogs = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['system-logs'],
    queryFn: () => api.get('/admin/system-logs').then(r => r.data),
  })
  const [selectedUser, setSelectedUser] = useState(null)

  const { data: userActivityData } = useQuery({
    queryKey: ['user-activity', selectedUser],
    queryFn: () => api.get(`/admin/users/${selectedUser}/activity`).then(r => r.data),
    enabled: !!selectedUser,
  })

  if (isLoading) return <div className="skeleton h-64 rounded-2xl" />

  const logs = data?.logs || []

  return (
    <div className="space-y-4">
      {/* Per-user activity selector */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-3">User Activity Logs</h2>
        <select
          value={selectedUser || ''}
          onChange={e => setSelectedUser(e.target.value || null)}
          className="input w-full sm:w-80"
        >
          <option value="">Select a user to view their activity</option>
          {logs.map(log => log.userId?._id && (
            <option key={`${log.userId._id}-${log._id}`} value={log.userId._id}>
              {log.userId.email || log.userId.name}
            </option>
          ))}
        </select>
        {selectedUser && userActivityData && (
          <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-dark-700">
            {userActivityData.activities?.length === 0 ? (
              <p className="text-sm text-dark-400 p-2">No activity found for this user</p>
            ) : userActivityData.activities?.map(a => (
              <div key={a._id} className="flex items-start gap-3 p-3 text-xs">
                <span className="capitalize badge bg-slate-100 dark:bg-dark-700 text-dark-500 dark:text-dark-400 flex-shrink-0 mt-0.5">{a.action}</span>
                <span className="text-dark-500 dark:text-dark-400 truncate flex-1">{a.details || a.fileId?.name || ''}</span>
                <span className="text-dark-300 dark:text-dark-600 flex-shrink-0">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All system logs */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-dark-700">
          <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">System Logs</h2>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-dark-700">
          {logs.map(log => (
            <div key={log._id} className="flex items-start gap-3 p-3 text-xs">
              <span className="capitalize badge bg-slate-100 dark:bg-dark-700 text-dark-500 dark:text-dark-400 flex-shrink-0 mt-0.5">{log.action}</span>
              <span className="text-dark-500 dark:text-dark-400 truncate flex-1">{log.userId?.email}</span>
              <span className="text-dark-300 dark:text-dark-600 flex-shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
