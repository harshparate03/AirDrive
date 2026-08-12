import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiUser, HiMoon, HiSun, HiShieldCheck, HiTrash, HiBell,
  HiLockClosed, HiEye, HiEyeOff, HiRefresh, HiClock,
  HiChevronRight, HiCheckCircle, HiLogout, HiPhotograph,
  HiColorSwatch, HiViewGrid, HiViewList, HiSparkles,
} from 'react-icons/hi'
import { updateProfile, logoutUser } from '../store/slices/authSlice'
import { toggleTheme } from '../store/slices/uiSlice'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useQuery } from '@tanstack/react-query'
import ActivityHeatmap from '../components/charts/ActivityHeatmap'
import ThemePicker from '../components/ui/ThemePicker'
import { useNavigate } from 'react-router-dom'

/* ── helpers ───────────────────────────────────────── */
const ACTION_BADGE = {
  upload:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  download: 'bg-blue-100   text-blue-700    dark:bg-blue-900/30    dark:text-blue-400',
  delete:   'bg-red-100    text-red-700     dark:bg-red-900/30     dark:text-red-400',
  trash:    'bg-red-100    text-red-600     dark:bg-red-900/30     dark:text-red-400',
  share:    'bg-purple-100 text-purple-700  dark:bg-purple-900/30  dark:text-purple-400',
  login:    'bg-amber-100  text-amber-700   dark:bg-amber-900/30   dark:text-amber-400',
  rename:   'bg-cyan-100   text-cyan-700    dark:bg-cyan-900/30    dark:text-cyan-400',
  view:     'bg-slate-100  text-slate-600   dark:bg-dark-700       dark:text-dark-300',
  ai_tag:   'bg-violet-100 text-violet-700  dark:bg-violet-900/30  dark:text-violet-400',
  default:  'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
}

const SectionCard = ({ title, subtitle, children }) => (
  <div className="space-y-5">
    <div className="pb-3 border-b border-slate-100 dark:border-dark-700">
      <h2 className="text-base font-bold text-dark-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-xs text-dark-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
)

const FieldRow = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-dark-700 dark:text-dark-200">{label}</label>
    {hint && <p className="text-xs text-dark-400">{hint}</p>}
    {children}
  </div>
)

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 dark:border-dark-800 last:border-0">
    <div>
      <p className="text-sm font-medium text-dark-700 dark:text-dark-200">{label}</p>
      {description && <p className="text-xs text-dark-400 mt-0.5">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" defaultChecked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 rounded-full bg-slate-200 dark:bg-dark-600 peer-checked:bg-primary-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
    </label>
  </div>
)

/* ── main component ────────────────────────────────── */
const SettingsPage = () => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { user }  = useSelector(s => s.auth)
  const { theme } = useSelector(s => s.ui)

  const [activeSection, setActiveSection] = useState('profile')

  // Profile
  const [name, setName]       = useState(user?.name || '')
  const [saving, setSaving]   = useState(false)

  // Password
  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [cnfPwd,  setCnfPwd]  = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [chgPwd,  setChgPwd]  = useState(false)

  // Activity query (lazy — only when tab active)
  const {
    data: actData,
    isLoading: actLoading,
    isError: actError,
    refetch: actRefetch,
  } = useQuery({
    queryKey: ['activities-settings'],
    queryFn: () => api.get('/activities').then(r => r.data),
    enabled: activeSection === 'activity',
    staleTime: 30_000,
  })

  const saveProfile = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setSaving(true)
    try {
      await dispatch(updateProfile({ name: name.trim() })).unwrap()
      toast.success('Profile updated')
    } catch { toast.error('Failed to update') }
    setSaving(false)
  }

  const changePassword = async () => {
    if (!curPwd || !newPwd || !cnfPwd)      return toast.error('Fill in all password fields')
    if (newPwd.length < 6)                  return toast.error('New password must be ≥ 6 characters')
    if (newPwd !== cnfPwd)                  return toast.error('Passwords do not match')
    setChgPwd(true)
    try {
      await api.post('/auth/change-password', { currentPassword: curPwd, newPassword: newPwd })
      toast.success('Password changed successfully')
      setCurPwd(''); setNewPwd(''); setCnfPwd('')
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to change password') }
    setChgPwd(false)
  }

  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account and all data? This cannot be undone.')) return
    try {
      await api.delete('/users/account')
      localStorage.clear()
      window.location.assign('/login')
    } catch { toast.error('Account deletion failed') }
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
    toast.success('Logged out')
  }

  const sections = [
    { id: 'profile',       label: 'Profile',       icon: HiUser },
    { id: 'appearance',    label: 'Appearance',     icon: HiColorSwatch },
    { id: 'notifications', label: 'Notifications',  icon: HiBell },
    { id: 'security',      label: 'Security',       icon: HiShieldCheck },
    { id: 'activity',      label: 'Activity',       icon: HiClock },
  ]

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-4">
      <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Settings</h1>

      <div className="flex flex-col sm:flex-row gap-4">

        {/* ── Sidebar ── */}
        <div className="sm:w-52 flex-shrink-0">
          {/* Mobile: horizontal scroll tabs */}
          <div className="flex sm:flex-col gap-1 overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${activeSection === s.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-dark-500 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-dark-700 dark:hover:text-dark-200'
                  }`}
              >
                <s.icon className={`text-lg flex-shrink-0 ${activeSection === s.id ? 'text-primary-500' : ''}`} />
                <span className="sm:inline">{s.label}</span>
                {activeSection === s.id && (
                  <HiChevronRight className="ml-auto text-primary-400 hidden sm:block" />
                )}
              </button>
            ))}

            <div className="hidden sm:block mt-3 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
              >
                <HiLogout className="text-lg" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="card p-5 sm:p-6"
            >

              {/* ━━━ PROFILE ━━━ */}
              {activeSection === 'profile' && (
                <SectionCard title="Profile" subtitle="Manage your personal information">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-100 dark:border-primary-800/30">
                    <div className="relative">
                      <img
                        src={user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff&size=80`}
                        alt={user?.name}
                        className="w-16 h-16 rounded-2xl ring-2 ring-white dark:ring-dark-700 shadow-md"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white dark:border-dark-800" title="Online" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-dark-900 dark:text-white text-base truncate">{user?.name}</p>
                      <p className="text-sm text-dark-500 dark:text-dark-400 truncate">{user?.email}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-medium">
                        <HiCheckCircle /> Air Drive Account
                      </span>
                    </div>
                  </div>

                  {/* Name field */}
                  <FieldRow label="Display Name">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input"
                      placeholder="Your display name"
                    />
                  </FieldRow>

                  {/* Email (read-only) */}
                  <FieldRow label="Email Address" hint="Email cannot be changed">
                    <input
                      value={user?.email || ''}
                      readOnly
                      className="input opacity-60 cursor-not-allowed select-all"
                    />
                  </FieldRow>

                  <div className="flex items-center gap-3 pt-1">
                    <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                      {saving
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                        : 'Save Changes'
                      }
                    </button>
                    <button onClick={() => setName(user?.name || '')} className="btn-secondary text-sm">
                      Reset
                    </button>
                  </div>

                  {/* Stats strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { label: 'Member since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
                      { label: 'Last login',   value: user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—' },
                      { label: 'Account role', value: user?.role || 'user' },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-xl bg-slate-50 dark:bg-dark-800">
                        <p className="text-xs text-dark-400">{s.label}</p>
                        <p className="text-sm font-semibold text-dark-700 dark:text-dark-200 capitalize mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* ━━━ APPEARANCE ━━━ */}
              {activeSection === 'appearance' && (
                <SectionCard title="Appearance" subtitle="Customize how Air Drive looks">
                  {/* Dark / Light */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-dark-700' : 'bg-amber-100'}`}>
                        {theme === 'dark'
                          ? <HiMoon className="text-xl text-primary-400" />
                          : <HiSun className="text-xl text-amber-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-dark-800 dark:text-dark-100">
                          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'} Active
                        </p>
                        <p className="text-xs text-dark-400">Click to toggle</p>
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch(toggleTheme())}
                      className="btn-primary text-sm flex items-center gap-2"
                    >
                      {theme === 'dark' ? <HiSun /> : <HiMoon />}
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                  </div>

                  {/* Color theme */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800">
                    <div className="flex items-center gap-2 mb-3">
                      <HiSparkles className="text-primary-500" />
                      <p className="text-sm font-semibold text-dark-800 dark:text-dark-100">Color Theme</p>
                    </div>
                    <ThemePicker />
                  </div>

                  {/* View mode */}
                  <div>
                    <p className="text-sm font-semibold text-dark-800 dark:text-dark-100 mb-3">Default File View</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { mode: 'grid', icon: HiViewGrid, label: 'Grid View', desc: 'Thumbnail cards' },
                        { mode: 'list', icon: HiViewList, label: 'List View', desc: 'Compact rows' },
                      ].map(({ mode, icon: Icon, label, desc }) => {
                        const active = (localStorage.getItem('viewMode') || 'grid') === mode
                        return (
                          <button
                            key={mode}
                            onClick={() => { localStorage.setItem('viewMode', mode); window.location.reload() }}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                              active
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-slate-200 dark:border-dark-600 hover:border-primary-300'
                            }`}
                          >
                            <Icon className={`text-2xl ${active ? 'text-primary-500' : 'text-dark-400'}`} />
                            <div>
                              <p className={`text-sm font-semibold ${active ? 'text-primary-700 dark:text-primary-300' : 'text-dark-700 dark:text-dark-200'}`}>{label}</p>
                              <p className="text-xs text-dark-400">{desc}</p>
                            </div>
                            {active && <HiCheckCircle className="ml-auto text-primary-500 text-lg flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* ━━━ NOTIFICATIONS ━━━ */}
              {activeSection === 'notifications' && (
                <SectionCard title="Notifications" subtitle="Choose what you want to be notified about">
                  <div className="rounded-2xl border border-slate-100 dark:border-dark-700 overflow-hidden divide-y divide-slate-50 dark:divide-dark-800">
                    <Toggle checked label="Upload complete"        description="When a file upload finishes" onChange={() => {}} />
                    <Toggle checked label="File shared with you"   description="When someone shares a file" onChange={() => {}} />
                    <Toggle checked label="Security alerts"        description="New logins and suspicious activity" onChange={() => {}} />
                    <Toggle checked label="Storage warning"        description="When storage exceeds 80%" onChange={() => {}} />
                    <Toggle checked={false} label="AI task complete" description="When AI tagging or rename finishes" onChange={() => {}} />
                    <Toggle checked={false} label="File request upload" description="When someone uploads to your request link" onChange={() => {}} />
                  </div>
                  <p className="text-xs text-dark-400 bg-slate-50 dark:bg-dark-800 rounded-xl px-4 py-3">
                    🔔 Notifications are sent in-app via the bell icon. Email notifications require your email to be configured in settings.
                  </p>
                </SectionCard>
              )}

              {/* ━━━ SECURITY ━━━ */}
              {activeSection === 'security' && (
                <SectionCard title="Security" subtitle="Manage your password and account access">
                  {/* Status */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                      <HiShieldCheck className="text-green-600 dark:text-green-400 text-xl" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">Account Secured</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Protected by email & password · Last login: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</p>
                    </div>
                  </div>

                  {/* Change password */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800 space-y-3">
                    <p className="text-sm font-bold text-dark-800 dark:text-dark-100 flex items-center gap-2">
                      <HiLockClosed className="text-primary-500" /> Change Password
                    </p>
                    {[
                      { label: 'Current Password', val: curPwd,  set: setCurPwd,  ph: 'Enter current password' },
                      { label: 'New Password',      val: newPwd,  set: setNewPwd,  ph: 'At least 6 characters' },
                      { label: 'Confirm Password',  val: cnfPwd,  set: setCnfPwd,  ph: 'Repeat new password' },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label}>
                        <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">{label}</label>
                        <div className="relative">
                          <input
                            type={showPwd ? 'text' : 'password'}
                            value={val}
                            onChange={e => set(e.target.value)}
                            placeholder={ph}
                            className="input pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
                          >
                            {showPwd ? <HiEyeOff /> : <HiEye />}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Password strength */}
                    {newPwd.length > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-dark-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              newPwd.length < 6 ? 'w-1/4 bg-red-500' :
                              newPwd.length < 10 ? 'w-2/4 bg-amber-500' :
                              'w-full bg-green-500'
                            }`}
                          />
                        </div>
                        <p className={`text-xs ${newPwd.length < 6 ? 'text-red-500' : newPwd.length < 10 ? 'text-amber-500' : 'text-green-500'}`}>
                          {newPwd.length < 6 ? 'Too short' : newPwd.length < 10 ? 'Fair' : 'Strong password'}
                        </p>
                      </div>
                    )}

                    <button onClick={changePassword} disabled={chgPwd} className="btn-primary text-sm flex items-center gap-2">
                      {chgPwd
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Changing...</>
                        : <><HiLockClosed /> Change Password</>
                      }
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div className="p-4 rounded-2xl border-2 border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 space-y-3">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">⚠️ Danger Zone</p>
                    <p className="text-xs text-red-600 dark:text-red-500">
                      Deleting your account will permanently remove all metadata, activities, and settings.
                      Your files in Google Drive are not affected.
                    </p>
                    <button
                      onClick={deleteAccount}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                    >
                      <HiTrash /> Delete My Account
                    </button>
                  </div>
                </SectionCard>
              )}

              {/* ━━━ ACTIVITY ━━━ */}
              {activeSection === 'activity' && (
                <SectionCard title="Activity Log" subtitle="Your recent actions across Air Drive">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-dark-400">
                      {actData?.activities?.length
                        ? `Showing ${Math.min(actData.activities.length, 30)} recent actions`
                        : 'No actions recorded yet'}
                    </p>
                    <button
                      onClick={() => actRefetch()}
                      className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
                    >
                      <HiRefresh className={actLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>

                  {/* Loading */}
                  {actLoading && (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <div className="skeleton w-16 h-5 rounded-full flex-shrink-0" />
                          <div className="skeleton h-4 flex-1 rounded" />
                          <div className="skeleton w-20 h-3 rounded hidden sm:block" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {actError && !actLoading && (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                        <HiRefresh className="text-red-500 text-xl" />
                      </div>
                      <p className="text-sm font-medium text-dark-700 dark:text-dark-200">Could not load activity</p>
                      <p className="text-xs text-dark-400 mt-1">Check your connection</p>
                      <button onClick={() => actRefetch()} className="btn-secondary text-xs mt-3">Try Again</button>
                    </div>
                  )}

                  {/* Heatmap */}
                  {!actLoading && !actError && actData?.heatmap?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800 overflow-x-auto">
                      <p className="text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-3">
                        Activity — Last 12 Months
                      </p>
                      <ActivityHeatmap heatmap={actData.heatmap} />
                    </div>
                  )}

                  {/* Activity list */}
                  {!actLoading && !actError && (
                    <>
                      {(!actData?.activities?.length) ? (
                        <div className="flex flex-col items-center py-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-dark-700">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-dark-800 flex items-center justify-center mb-3">
                            <HiClock className="text-3xl text-dark-300" />
                          </div>
                          <p className="text-sm font-semibold text-dark-600 dark:text-dark-300">No activity yet</p>
                          <p className="text-xs text-dark-400 mt-1 max-w-xs">
                            Upload, view, rename, or organize a file to start building your activity log.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-100 dark:border-dark-700 overflow-hidden">
                          {/* Table header */}
                          <div className="hidden sm:grid grid-cols-[120px_1fr_120px] gap-3 px-4 py-2 bg-slate-50 dark:bg-dark-800 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                            <span>Action</span>
                            <span>File / Detail</span>
                            <span className="text-right">Date</span>
                          </div>
                          {/* Rows */}
                          {actData.activities.slice(0, 30).map((a, i) => (
                            <motion.div
                              key={a._id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="grid grid-cols-1 sm:grid-cols-[120px_1fr_120px] gap-1 sm:gap-3 items-center px-4 py-3 border-b border-slate-50 dark:border-dark-800 last:border-0 hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors"
                            >
                              <span className={`w-fit px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ACTION_BADGE[a.action] || ACTION_BADGE.default}`}>
                                {a.action?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-sm text-dark-600 dark:text-dark-300 truncate">
                                {a.fileId?.name || a.folderId?.name || a.details || '—'}
                              </span>
                              <span className="text-xs text-dark-400 sm:text-right">
                                {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </SectionCard>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
