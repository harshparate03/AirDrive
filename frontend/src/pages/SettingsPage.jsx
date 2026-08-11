import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { HiUser, HiMoon, HiSun, HiShieldCheck, HiTrash, HiBell, HiLockClosed, HiEye, HiEyeOff, HiCloud } from 'react-icons/hi'
import { updateProfile, changePassword, fetchProfile } from '../store/slices/authSlice'
import { toggleTheme } from '../store/slices/uiSlice'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useQuery } from '@tanstack/react-query'
import ActivityHeatmap from '../components/charts/ActivityHeatmap'
import ThemePicker from '../components/ui/ThemePicker'
import { useConfirm } from '../components/ui/ConfirmDialog'

const SettingsPage = () => {
  const dispatch = useDispatch()
  const confirm = useConfirm()
  const { user } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [connectingDrive, setConnectingDrive] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const driveStatus = params.get('drive')
    if (params.get('connectDrive') === '1' && !user?.googleConnected) {
      toast.error('Connect Google Drive before uploading')
    }
    if (!driveStatus) return
    if (driveStatus === 'connected') {
      toast.success('Google Drive connected')
      dispatch(fetchProfile())
    } else {
      toast.error(params.get('message') || 'Could not connect Google Drive')
    }
    window.history.replaceState({}, '', window.location.pathname)
  }, [dispatch, user?.googleConnected])

  const connectDrive = async () => {
    setConnectingDrive(true)
    try {
      const { data } = await api.get('/auth/google/connect')
      window.location.assign(data.url)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not start Google Drive connection')
      setConnectingDrive(false)
    }
  }

  const disconnectDrive = async () => {
    const approved = await confirm({ title: 'Disconnect Google Drive?', message: 'Uploads will stop working until Drive is connected again. Existing files in Google Drive will not be deleted.', confirmLabel: 'Disconnect' })
    if (!approved) return
    try {
      await api.delete('/auth/google/connect')
      await dispatch(fetchProfile()).unwrap()
      toast.success('Google Drive disconnected')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not disconnect Google Drive')
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match')
      return
    }
    setChangingPassword(true)
    try {
      await dispatch(changePassword({ currentPassword, newPassword })).unwrap()
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (e) {
      toast.error(e || 'Failed to change password')
    }
    setChangingPassword(false)
  }

  const { data: activityData } = useQuery({
    queryKey: ['activities'],
    queryFn: () => api.get('/activities').then(r => r.data),
  })

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await dispatch(updateProfile({ name })).unwrap()
      toast.success('Profile updated')
    } catch (e) {
      toast.error('Failed to update')
    }
    setSaving(false)
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: HiUser },
    { id: 'appearance', label: 'Appearance', icon: HiMoon },
    { id: 'notifications', label: 'Notifications', icon: HiBell },
    { id: 'security', label: 'Security', icon: HiShieldCheck },
    { id: 'activity', label: 'Activity', icon: HiShieldCheck },
  ]
  const [activeSection, setActiveSection] = useState('profile')

  return (
    <div className="max-w-3xl animate-fade-in">
      <h1 className="text-xl font-bold text-dark-900 dark:text-white mb-6">Settings</h1>

      <div className="flex gap-4">
        {/* Nav */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`sidebar-link w-full text-sm ${activeSection === s.id ? 'active' : ''}`}
            >
              <s.icon className="text-lg" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 card p-6 space-y-5">
          {activeSection === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Profile</h2>
              <div className="flex items-center gap-4">
                <img
                  src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`}
                  alt={user?.name}
                  className="w-16 h-16 rounded-full"
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
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <HiCloud className={`text-2xl ${user?.googleConnected ? 'text-green-500' : 'text-primary-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-dark-800 dark:text-dark-100">Google Drive</p>
                    <p className="text-xs text-dark-400">{user?.googleConnected ? 'Connected — uploads are saved to your Drive' : 'Connect Drive to enable uploads'}</p>
                  </div>
                </div>
                {user?.googleConnected ? (
                  <button onClick={disconnectDrive} className="btn-secondary text-sm text-red-500">Disconnect</button>
                ) : (
                  <button onClick={connectDrive} disabled={connectingDrive} className="btn-primary text-sm whitespace-nowrap">
                    {connectingDrive ? 'Connecting...' : 'Connect Drive'}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Appearance</h2>

              {/* Dark / Light */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-dark-700">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <HiMoon className="text-xl text-primary-500" /> : <HiSun className="text-xl text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium text-dark-800 dark:text-dark-100">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </p>
                    <p className="text-xs text-dark-400">Current theme</p>
                  </div>
                </div>
                <button onClick={() => dispatch(toggleTheme())} className="btn-secondary text-sm">
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>

              {/* Color theme picker */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-700">
                <ThemePicker />
              </div>

              {/* View density */}
              <div>
                <p className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-2">View Mode</p>
                <div className="flex gap-2">
                  {['grid', 'list'].map(mode => (
                    <button key={mode} onClick={() => {
                      localStorage.setItem('viewMode', mode)
                      window.location.reload()
                    }}
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

          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Notifications</h2>
              {['Upload notifications', 'Share notifications', 'Security alerts', 'Login alerts'].map(n => (
                <div key={n} className="flex items-center justify-between">
                  <span className="text-sm text-dark-700 dark:text-dark-200">{n}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Security</h2>
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30">
                <div className="flex items-center gap-3">
                  <HiShieldCheck className="text-green-500 text-2xl" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Account Secured</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Protected by email &amp; password authentication</p>
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-700 space-y-3">
                <p className="text-sm font-semibold text-dark-800 dark:text-dark-100 flex items-center gap-2">
                  <HiLockClosed className="text-primary-500" /> Change Password
                </p>
                <div>
                  <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
                      aria-label="Toggle password visibility"
                    >
                      {showPasswords ? <HiEyeOff /> : <HiEye />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">Confirm New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="input"
                  />
                </div>
                <button onClick={handleChangePassword} disabled={changingPassword} className="btn-primary text-sm">
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-dark-700 dark:text-dark-200">Last login</p>
                <p className="text-sm text-dark-400">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</p>
              </div>
              <button
                onClick={async () => {
                  const approved = await confirm({ title: 'Delete your account?', message: 'Your account metadata and AirDrive records will be permanently removed. This cannot be undone.', confirmLabel: 'Delete account' })
                  if (!approved) return
                  try {
                    await api.delete('/users/account')
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')
                    window.location.assign('/login')
                  } catch (error) {
                    toast.error(error.response?.data?.error || 'Account deletion failed')
                  }
                }}
                className="btn-secondary text-red-500 text-sm flex items-center gap-2"
              >
                <HiTrash /> Delete Account
              </button>
            </div>
          )}

          {activeSection === 'activity' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Activity Log</h2>

              {/* Heatmap */}
              {activityData?.heatmap?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-dark-500 mb-3">Activity Heatmap (Last 12 months)</p>
                  <ActivityHeatmap heatmap={activityData.heatmap} />
                </div>
              )}

              <div className="space-y-1">
                {activityData?.activities?.slice(0, 20).map(a => (
                  <div key={a._id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-50 dark:border-dark-700 last:border-0">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-medium">
                      {a.action}
                    </span>
                    <span className="text-dark-600 dark:text-dark-300 flex-1 truncate">
                      {a.fileId?.name || a.details || a.action}
                    </span>
                    <span className="text-dark-400 text-xs flex-shrink-0">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
