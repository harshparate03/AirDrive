import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { HiUser, HiMoon, HiSun, HiShieldCheck, HiTrash, HiBell, HiLockClosed, HiEye, HiEyeOff, HiCloud, HiRefresh, HiClock } from 'react-icons/hi'
import { updateProfile } from '../store/slices/authSlice'
import { toggleTheme } from '../store/slices/uiSlice'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useQuery } from '@tanstack/react-query'
import ActivityHeatmap from '../components/charts/ActivityHeatmap'
import ThemePicker from '../components/ui/ThemePicker'

const ACTION_COLORS = {
  upload: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  download: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  delete: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  share: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  login: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  rename: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  default: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
}

const SettingsPage = () => {
  const dispatch = useDispatch()
  const { user } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')

  const { data: activityData, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useQuery({
    queryKey: ['activities-settings'],
    queryFn: () => api.get('/activities').then(r => r.data),
    enabled: activeSection === 'activity',
  })

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await dispatch(updateProfile({ name })).unwrap()
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update')
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return toast.error('Fill in all password fields')
    }
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters')
    if (newPassword !== confirmNewPassword) return toast.error('Passwords do not match')
    setChangingPassword(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      toast.success('Password changed successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to change password')
    }
    setChangingPassword(false)
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account? This cannot be undone.')) return
    try {
      await api.delete('/users/account')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.assign('/login')
    } catch {
      toast.error('Account deletion failed')
    }
  }

  const sections = [
    { id: 'profile',       label: 'Profile',       icon: HiUser },
    { id: 'appearance',    label: 'Appearance',     icon: HiMoon },
    { id: 'notifications', label: 'Notifications',  icon: HiBell },
    { id: 'security',      label: 'Security',       icon: HiShieldCheck },
    { id: 'activity',      label: 'Activity',       icon: HiClock },
  ]

  return (
    <div className="max-w-3xl animate-fade-in">
      <h1 className="text-xl font-bold text-dark-900 dark:text-white mb-6">Settings</h1>

      <div className="flex gap-4">
        {/* Sidebar nav */}
        <div className="w-44 flex-shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`sidebar-link w-full text-sm ${activeSection === s.id ? 'active' : ''}`}>
              <s.icon className="text-lg" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="flex-1 card p-6 space-y-5 min-w-0">

          {/* ── Profile ── */}
          {activeSection === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Profile</h2>
              <div className="flex items-center gap-4">
                <img
                  src={user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff`}
                  alt={user?.name}
                  className="w-16 h-16 rounded-full ring-2 ring-primary-200 dark:ring-primary-800"
                />
                <div>
                  <p className="text-sm font-medium text-dark-700 dark:text-dark-200">{user?.email}</p>
                  <p className="text-xs text-dark-400">Air Drive Account</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Display Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input" />
              </div>
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeSection === 'appearance' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Appearance</h2>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-dark-700">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <HiMoon className="text-xl text-primary-500" /> : <HiSun className="text-xl text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium text-dark-800 dark:text-dark-100">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                    <p className="text-xs text-dark-400">Current theme</p>
                  </div>
                </div>
                <button onClick={() => dispatch(toggleTheme())} className="btn-secondary text-sm">
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-700">
                <ThemePicker />
              </div>
              <div>
                <p className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-2">Default View</p>
                <div className="flex gap-2">
                  {['grid', 'list'].map(mode => (
                    <button key={mode} onClick={() => { localStorage.setItem('viewMode', mode); window.location.reload() }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                        localStorage.getItem('viewMode') === mode
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-slate-200 dark:border-dark-600 text-dark-600 dark:text-dark-300'
                      }`}>
                      {mode} View
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Notifications</h2>
              {['Upload notifications', 'Share notifications', 'Security alerts', 'Login alerts'].map(n => (
                <div key={n} className="flex items-center justify-between">
                  <span className="text-sm text-dark-700 dark:text-dark-200">{n}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* ── Security ── */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Security</h2>
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 flex items-center gap-3">
                <HiShieldCheck className="text-green-500 text-2xl flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Account Secured</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Protected by email & password authentication</p>
                </div>
              </div>

              {/* Change password */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-700 space-y-3">
                <p className="text-sm font-semibold text-dark-800 dark:text-dark-100 flex items-center gap-2">
                  <HiLockClosed className="text-primary-500" /> Change Password
                </p>
                {[
                  { label: 'Current Password', val: currentPassword, set: setCurrentPassword },
                  { label: 'New Password',     val: newPassword,     set: setNewPassword },
                  { label: 'Confirm New',      val: confirmNewPassword, set: setConfirmNewPassword },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">{label}</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={val}
                        onChange={e => set(e.target.value)}
                        placeholder={label}
                        className="input pr-10"
                      />
                      <button type="button" onClick={() => setShowPasswords(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600">
                        {showPasswords ? <HiEyeOff /> : <HiEye />}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={handleChangePassword} disabled={changingPassword} className="btn-primary text-sm">
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-dark-700 dark:text-dark-200 mb-1">Last login</p>
                <p className="text-sm text-dark-400">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</p>
              </div>

              <button onClick={handleDeleteAccount} className="btn-secondary text-red-500 text-sm flex items-center gap-2">
                <HiTrash /> Delete Account
              </button>
            </div>
          )}

          {/* ── Activity ── */}
          {activeSection === 'activity' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Activity Log</h2>
                  <p className="text-xs text-dark-400 mt-0.5">Your recent file actions</p>
                </div>
                <button onClick={() => refetchActivity()} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <HiRefresh className={activityLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {/* Loading skeleton */}
              {activityLoading && (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="skeleton h-5 w-16 rounded-full" />
                      <div className="skeleton h-4 flex-1 rounded" />
                      <div className="skeleton h-3 w-20 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {activityError && !activityLoading && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10 p-4 text-sm text-red-600 dark:text-red-400">
                  Could not load activity. Check your connection and try Refresh.
                </div>
              )}

              {/* Heatmap */}
              {!activityLoading && !activityError && activityData?.heatmap?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800">
                  <p className="text-xs font-medium text-dark-500 mb-3">Activity Heatmap — Last 12 months</p>
                  <ActivityHeatmap heatmap={activityData.heatmap} />
                </div>
              )}

              {/* List */}
              {!activityLoading && !activityError && (
                <div className="space-y-0.5">
                  {activityData?.activities?.length === 0 && (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 dark:border-dark-700 py-10 text-center">
                      <HiClock className="mb-2 text-3xl text-dark-300" />
                      <p className="text-sm font-medium text-dark-600 dark:text-dark-300">No activity yet</p>
                      <p className="mt-1 text-xs text-dark-400">Upload or interact with a file to get started.</p>
                    </div>
                  )}
                  {activityData?.activities?.slice(0, 30).map(a => (
                    <div key={a._id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-dark-800 last:border-0">
                      <span className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${ACTION_COLORS[a.action] || ACTION_COLORS.default}`}>
                        {a.action}
                      </span>
                      <span className="text-sm text-dark-600 dark:text-dark-300 flex-1 truncate">
                        {a.fileId?.name || a.folderId?.name || a.details || a.action}
                      </span>
                      <span className="text-xs text-dark-400 flex-shrink-0 hidden sm:block">
                        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default SettingsPage
