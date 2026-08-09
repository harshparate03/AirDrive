import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  HiUsers, HiDatabase, HiChartBar, HiShieldCheck,
  HiSpeakerphone, HiRefresh, HiExclamation, HiBell, HiUserCircle, HiChevronRight,
  HiHome, HiLogout, HiMenu, HiX, HiMoon, HiSun, HiExternalLink,
  HiCog, HiUser,
  HiLightningBolt, HiShare,
} from 'react-icons/hi'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { formatFileSize } from '../utils/fileUtils'
import ViewModeToggle from '../components/ui/ViewModeToggle'
import { logoutUser } from '../store/slices/authSlice'
import { toggleTheme } from '../store/slices/uiSlice'
import AdminAnalytics from '../components/admin/AdminAnalytics'
import { AdminProfile, AdminSettings } from '../components/admin/AdminProfileSettings'

const AdminPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const { viewMode, theme } = useSelector(s => s.ui)
  const queryClient = useQueryClient()
  const [announcement, setAnnouncement] = useState({ title: '', message: '' })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
    { label: 'Interactions (30d)', value: dashData?.totalInteractions30d || 0, icon: HiLightningBolt, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Sharing Activity (30d)', value: dashData?.shareInteractions30d || 0, icon: HiShare, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  ]

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: HiHome },
    { id: 'users', label: 'User Management', icon: HiUsers },
    { id: 'announce', label: 'Announcements', icon: HiSpeakerphone },
    { id: 'notifications', label: 'Admin Alerts', icon: HiBell },
    { id: 'logs', label: 'System Logs', icon: HiChartBar },
    { id: 'profile', label: 'Admin Profile', icon: HiUser },
    { id: 'settings', label: 'Settings', icon: HiCog },
  ]

  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || 'Overview'
  const handleAdminLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login', { replace: true })
  }

  const AdminNavigation = () => (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950/40">
          <HiShieldCheck className="text-xl text-white" />
        </div>
        <div>
          <p className="font-bold tracking-tight text-white">AirDrive Control</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Administration</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Operations</p>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setMobileNavOpen(false) }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="text-lg" />
            <span>{tab.label}</span>
            {activeTab === tab.id && <HiChevronRight className="ml-auto" />}
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button onClick={() => navigate('/dashboard')} className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          <HiExternalLink /> View user application
        </button>
        <button onClick={handleAdminLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10">
          <HiLogout /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#080c14] dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-[#0c1220] lg:flex">
        <AdminNavigation />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close admin navigation" onClick={() => setMobileNavOpen(false)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <aside className="relative flex h-full w-72 flex-col bg-[#0c1220] shadow-2xl">
            <button onClick={() => setMobileNavOpen(false)} className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><HiX /></button>
            <AdminNavigation />
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0f1a]/90 sm:px-6 lg:px-8">
          <button onClick={() => setMobileNavOpen(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 lg:hidden"><HiMenu className="text-xl" /></button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">Admin workspace</p>
            <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{activeTabLabel}</h1>
          </div>
          {activeTab === 'users' && <ViewModeToggle />}
          <button onClick={() => dispatch(toggleTheme())} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">
            {theme === 'dark' ? <HiSun /> : <HiMoon />}
          </button>
          <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 dark:border-white/10 sm:flex">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">Super administrator</p>
            </div>
            <img src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=4f46e5&color=fff`} alt={user?.name} className="h-10 w-10 rounded-xl ring-2 ring-indigo-500/20" />
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
          {activeTab === 'dashboard' && (
            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" /> System operational
                  </div>
                  <h2 className="text-2xl font-bold sm:text-3xl">Welcome back, {user?.name}</h2>
                  <p className="mt-2 max-w-xl text-sm text-indigo-100">Monitor platform health, manage users, review activity, and communicate with the entire AirDrive community.</p>
                </div>
                <button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20">
                  <HiRefresh /> Refresh metrics
                </button>
              </div>
            </div>
          )}

      {/* Dashboard tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
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

          <AdminAnalytics dashboard={dashData} />

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
      {activeTab === 'profile' && <AdminProfile />}
      {activeTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  )
}

const AdminNotifications = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/admin/notifications').then(r => r.data),
    refetchInterval: 15000,
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
