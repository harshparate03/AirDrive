import React, { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiUser, HiMoon, HiSun, HiShieldCheck, HiTrash, HiBell,
  HiLockClosed, HiEye, HiEyeOff, HiRefresh, HiClock,
  HiChevronRight, HiCheckCircle, HiPhotograph, HiX,
  HiColorSwatch, HiViewGrid, HiViewList, HiSparkles,
  HiUpload, HiCamera,
} from 'react-icons/hi'
import { updateProfile } from '../store/slices/authSlice'
import { toggleTheme } from '../store/slices/uiSlice'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useQuery } from '@tanstack/react-query'
import ActivityHeatmap from '../components/charts/ActivityHeatmap'
import ThemePicker from '../components/ui/ThemePicker'
import { DefaultAvatar } from '../components/layout/ProfileMenu'

/* ── UserAvatar — shows photo or gradient initials fallback ── */
const UserAvatar = ({ src, name, size = 96 }) => {
  const initials = (name || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // border wrapper size = size + 5px (2.5px border each side)
  const outer = size + 5

  if (src && src.trim() !== '') {
    return (
      <div
        style={{ width: outer, height: outer }}
        className="rounded-2xl bg-gradient-to-br from-primary-400 to-purple-600 p-[2.5px] flex-shrink-0"
      >
        <img
          src={src}
          alt={name || 'User'}
          style={{ width: size, height: size }}
          className="rounded-2xl object-cover w-full h-full block"
        />
      </div>
    )
  }

  // Default — gradient initials
  return (
    <div
      style={{ width: outer, height: outer }}
      className="rounded-2xl bg-gradient-to-br from-primary-400 to-purple-600 p-[2.5px] flex-shrink-0"
    >
      <div
        style={{ width: size, height: size }}
        className="rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center w-full h-full"
      >
        <span
          style={{ fontSize: Math.max(size * 0.36, 12) }}
          className="text-white font-bold select-none leading-none"
        >
          {initials}
        </span>
      </div>
    </div>
  )
}

/* ─── helpers ───────────────────────────────────── */
const ACTION_BADGE = {
  upload:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  download: 'bg-blue-100   text-blue-700    dark:bg-blue-900/30    dark:text-blue-400',
  delete:   'bg-red-100    text-red-600     dark:bg-red-900/30     dark:text-red-400',
  trash:    'bg-red-100    text-red-600     dark:bg-red-900/30     dark:text-red-400',
  share:    'bg-purple-100 text-purple-700  dark:bg-purple-900/30  dark:text-purple-400',
  login:    'bg-amber-100  text-amber-700   dark:bg-amber-900/30   dark:text-amber-400',
  rename:   'bg-cyan-100   text-cyan-700    dark:bg-cyan-900/30    dark:text-cyan-400',
  view:     'bg-slate-100  text-slate-600   dark:bg-dark-700       dark:text-dark-300',
  ai_tag:   'bg-violet-100 text-violet-700  dark:bg-violet-900/30  dark:text-violet-400',
  default:  'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
}

const Toggle = ({ label, description, defaultChecked = true }) => (
  <div className="flex items-start sm:items-center justify-between gap-4 py-3.5
    border-b border-slate-100 dark:border-dark-700 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-dark-800 dark:text-dark-100">{label}</p>
      {description && <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5 sm:mt-0">
      <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
      <div className="w-11 h-6 rounded-full bg-slate-200 dark:bg-dark-600
        peer-checked:bg-primary-500 transition-colors duration-200
        after:content-[''] after:absolute after:top-0.5 after:left-0.5
        after:bg-white after:rounded-full after:h-5 after:w-5
        after:transition-all peer-checked:after:translate-x-5 after:shadow-sm" />
    </label>
  </div>
)

/* ─── main ───────────────────────────────────────── */
const SettingsPage = () => {
  const dispatch    = useDispatch()
  const location    = useLocation()
  const { user }    = useSelector(s => s.auth)
  const { theme }   = useSelector(s => s.ui)

  // default section from navigation state (e.g. from ProfileMenu)
  const [activeSection, setActiveSection] = useState(
    location.state?.section || 'profile'
  )

  // Profile
  const [name, setName]       = useState(user?.name || '')
  const [saving, setSaving]   = useState(false)
  const [photo, setPhoto]     = useState(user?.photo || '')
  const [photoLoading, setPhotoLoading] = useState(false)
  const photoInputRef         = useRef(null)

  // Sync photo when user updates in Redux (e.g. after remove/upload)
  useEffect(() => {
    setPhoto(user?.photo || '')
  }, [user?.photo])

  useEffect(() => {
    setName(user?.name || '')
  }, [user?.name])

  // Password
  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [cnfPwd,  setCnfPwd]  = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [chgPwd,  setChgPwd]  = useState(false)

  // Activity
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

  /* ── Photo handlers ── */
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('Photo must be under 2MB')
    if (!file.type.startsWith('image/')) return toast.error('Select an image file')

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      // Optimistically show preview immediately
      setPhoto(base64)
      setPhotoLoading(true)
      try {
        const updatedUser = await dispatch(updateProfile({ photo: base64 })).unwrap()
        // Sync local state to whatever the server returned (could be URL or base64)
        setPhoto(updatedUser?.photo || '')
        toast.success('Profile photo updated')
      } catch {
        // Revert on failure
        setPhoto(user?.photo || '')
        toast.error('Failed to update photo')
      }
      setPhotoLoading(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemovePhoto = async () => {
    if (!window.confirm('Remove your profile photo?')) return
    setPhotoLoading(true)
    // Optimistically clear photo immediately so default avatar shows right away
    setPhoto('')
    try {
      await dispatch(updateProfile({ photo: '' })).unwrap()
      toast.success('Profile photo removed')
    } catch {
      // Revert on failure
      setPhoto(user?.photo || '')
      toast.error('Failed to remove photo')
    }
    setPhotoLoading(false)
  }

  /* ── Profile save ── */
  const saveProfile = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setSaving(true)
    try {
      await dispatch(updateProfile({ name: name.trim() })).unwrap()
      toast.success('Profile updated')
    } catch { toast.error('Failed to update') }
    setSaving(false)
  }

  /* ── Password change ── */
  const changePassword = async () => {
    if (!curPwd || !newPwd || !cnfPwd) return toast.error('Fill all password fields')
    if (newPwd.length < 6)             return toast.error('New password must be ≥ 6 characters')
    if (newPwd !== cnfPwd)             return toast.error('Passwords do not match')
    setChgPwd(true)
    try {
      await api.post('/auth/change-password', { currentPassword: curPwd, newPassword: newPwd })
      toast.success('Password changed')
      setCurPwd(''); setNewPwd(''); setCnfPwd('')
    } catch (e) { toast.error(e.response?.data?.error || 'Failed') }
    setChgPwd(false)
  }

  /* ── Delete account ── */
  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account? Cannot be undone.')) return
    try {
      await api.delete('/users/account')
      localStorage.clear()
      window.location.assign('/login')
    } catch { toast.error('Account deletion failed') }
  }

  const strengthLevel = !newPwd.length ? 0 : newPwd.length < 6 ? 1 : newPwd.length < 10 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong']
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-green-500']

  const sections = [
    { id: 'profile',       label: 'Profile',       icon: HiUser },
    { id: 'appearance',    label: 'Appearance',     icon: HiColorSwatch },
    { id: 'notifications', label: 'Notifications',  icon: HiBell },
    { id: 'security',      label: 'Security',       icon: HiShieldCheck },
    { id: 'activity',      label: 'Activity',       icon: HiClock },
  ]

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-5 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Settings</h1>

      <div className="flex flex-col md:flex-row gap-4">

        {/* ── Sidebar tabs ── */}
        <div className="md:w-52 flex-shrink-0">
          {/* Mobile: horizontal scroll */}
          <div className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium
                  whitespace-nowrap flex-shrink-0 transition-all duration-150 text-left
                  ${activeSection === s.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-dark-500 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
              >
                <s.icon className={`text-lg flex-shrink-0 ${activeSection === s.id ? 'text-primary-500' : ''}`} />
                <span>{s.label}</span>
                {activeSection === s.id && (
                  <HiChevronRight className="ml-auto text-primary-300 hidden md:block text-sm" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="card p-5 sm:p-6 space-y-6"
            >

              {/* ━━━ PROFILE ━━━ */}
              {activeSection === 'profile' && (
                <>
                  <div className="pb-4 border-b border-slate-100 dark:border-dark-700">
                    <h2 className="text-base font-bold text-dark-900 dark:text-white">Profile</h2>
                    <p className="text-xs text-dark-400 mt-0.5">Manage your name and profile photo</p>
                  </div>

                  {/* Photo upload */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Avatar with gradient border */}
                    <div className="relative flex-shrink-0">
                      {photoLoading ? (
                        <div style={{ width: 100, height: 100 }}
                          className="rounded-2xl bg-slate-100 dark:bg-dark-700 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-dark-700">
                          <div className="w-7 h-7 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <UserAvatar src={photo} name={user?.name} size={96} />
                      )}
                      {/* Camera button */}
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoLoading}
                        title="Change photo"
                        className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full
                          bg-primary-600 hover:bg-primary-700 text-white shadow-lg
                          flex items-center justify-center transition-colors z-10 border-2 border-white dark:border-dark-800"
                      >
                        <HiCamera className="text-sm" />
                      </button>
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    </div>

                    {/* Photo actions */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <p className="font-bold text-dark-900 dark:text-white text-lg">{user?.name}</p>
                      <p className="text-sm text-dark-500 dark:text-dark-400">{user?.email}</p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          disabled={photoLoading}
                          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
                        >
                          <HiUpload className="text-sm" />
                          {photo ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        {photo && (
                          <button
                            onClick={handleRemovePhoto}
                            disabled={photoLoading}
                            className="btn-secondary text-xs text-red-500 flex items-center gap-1.5 py-1.5"
                          >
                            <HiX className="text-sm" /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-dark-400 mt-2">JPG, PNG, GIF — max 2MB</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-dark-700 dark:text-dark-200 mb-1.5">
                      Display Name
                    </label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input"
                      placeholder="Your display name"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-dark-700 dark:text-dark-200 mb-1.5">
                      Email Address
                    </label>
                    <input
                      value={user?.email || ''}
                      readOnly
                      className="input opacity-60 cursor-not-allowed"
                    />
                    <p className="text-xs text-dark-400 mt-1">Email cannot be changed</p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                      {saving
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                        : 'Save Changes'
                      }
                    </button>
                    <button onClick={() => { setName(user?.name || '') }} className="btn-secondary text-sm">Reset</button>
                  </div>

                  {/* Info strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { label: 'Member since', val: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
                      { label: 'Last login',   val: user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—' },
                      { label: 'Role',         val: user?.role || 'user' },
                    ].map(({ label, val }) => (
                      <div key={label} className="p-3 rounded-xl bg-slate-50 dark:bg-dark-800">
                        <p className="text-xs text-dark-400">{label}</p>
                        <p className="text-sm font-semibold text-dark-700 dark:text-dark-200 capitalize mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ━━━ APPEARANCE ━━━ */}
              {activeSection === 'appearance' && (
                <>
                  <div className="pb-4 border-b border-slate-100 dark:border-dark-700">
                    <h2 className="text-base font-bold text-dark-900 dark:text-white">Appearance</h2>
                    <p className="text-xs text-dark-400 mt-0.5">Customize how Air Drive looks</p>
                  </div>

                  {/* Dark/Light toggle */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-dark-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        theme === 'dark' ? 'bg-dark-700' : 'bg-amber-100'
                      }`}>
                        {theme === 'dark'
                          ? <HiMoon className="text-xl text-primary-400" />
                          : <HiSun className="text-xl text-amber-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-dark-800 dark:text-dark-100">
                          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </p>
                        <p className="text-xs text-dark-400">Current theme</p>
                      </div>
                    </div>
                    <button onClick={() => dispatch(toggleTheme())} className="btn-primary text-sm flex items-center gap-2 flex-shrink-0">
                      {theme === 'dark' ? <HiSun /> : <HiMoon />}
                      <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
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
                        { mode: 'grid', Icon: HiViewGrid, label: 'Grid View', desc: 'Thumbnail cards' },
                        { mode: 'list', Icon: HiViewList, label: 'List View', desc: 'Compact rows' },
                      ].map(({ mode, Icon, label, desc }) => {
                        const active = (localStorage.getItem('viewMode') || 'grid') === mode
                        return (
                          <button key={mode}
                            onClick={() => { localStorage.setItem('viewMode', mode); window.location.reload() }}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                              active
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-slate-200 dark:border-dark-600 hover:border-primary-300'
                            }`}
                          >
                            <Icon className={`text-2xl flex-shrink-0 ${active ? 'text-primary-500' : 'text-dark-400'}`} />
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${active ? 'text-primary-700 dark:text-primary-300' : 'text-dark-700 dark:text-dark-200'}`}>{label}</p>
                              <p className="text-xs text-dark-400">{desc}</p>
                            </div>
                            {active && <HiCheckCircle className="ml-auto text-primary-500 text-lg flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ━━━ NOTIFICATIONS ━━━ */}
              {activeSection === 'notifications' && (
                <>
                  <div className="pb-4 border-b border-slate-100 dark:border-dark-700">
                    <h2 className="text-base font-bold text-dark-900 dark:text-white">Notifications</h2>
                    <p className="text-xs text-dark-400 mt-0.5">Choose what you get notified about</p>
                  </div>

                  {/* Groups */}
                  {[
                    {
                      title: 'File Activity',
                      items: [
                        { label: 'Upload complete', description: 'When a file finishes uploading', on: true },
                        { label: 'Download started', description: 'When someone downloads your shared file', on: false },
                        { label: 'File deleted', description: 'When you move a file to trash', on: false },
                      ],
                    },
                    {
                      title: 'Sharing & Collaboration',
                      items: [
                        { label: 'File shared with you', description: 'When someone shares a file or folder', on: true },
                        { label: 'New comment', description: 'When someone comments on your file', on: true },
                        { label: 'File request upload', description: 'When someone uploads to your request link', on: true },
                        { label: 'Permission changed', description: 'When your access level changes', on: true },
                      ],
                    },
                    {
                      title: 'Security & Storage',
                      items: [
                        { label: 'New login detected', description: 'When your account is accessed from a new device', on: true },
                        { label: 'Storage warning', description: 'When you use more than 80% of storage', on: true },
                        { label: 'AI task complete', description: 'When AI tagging, rename or OCR finishes', on: false },
                      ],
                    },
                  ].map(group => (
                    <div key={group.title} className="rounded-2xl border border-slate-100 dark:border-dark-700 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 dark:bg-dark-800 border-b border-slate-100 dark:border-dark-700">
                        <p className="text-xs font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">{group.title}</p>
                      </div>
                      <div className="px-4">
                        {group.items.map(item => (
                          <Toggle key={item.label} label={item.label} description={item.description} defaultChecked={item.on} />
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-400">
                    <HiBell className="text-base flex-shrink-0 mt-0.5" />
                    <p>Notifications appear in the bell icon in the top bar in real-time. Email notifications require a configured email address.</p>
                  </div>
                </>
              )}

              {/* ━━━ SECURITY ━━━ */}
              {activeSection === 'security' && (
                <>
                  <div className="pb-4 border-b border-slate-100 dark:border-dark-700">
                    <h2 className="text-base font-bold text-dark-900 dark:text-white">Security</h2>
                    <p className="text-xs text-dark-400 mt-0.5">Manage your password and account access</p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                      <HiShieldCheck className="text-green-600 dark:text-green-400 text-xl" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">Account Secured</p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        Last login: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Change password */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800 space-y-4">
                    <p className="text-sm font-bold text-dark-800 dark:text-dark-100 flex items-center gap-2">
                      <HiLockClosed className="text-primary-500" /> Change Password
                    </p>
                    {[
                      { label: 'Current Password', val: curPwd,  set: setCurPwd,  ph: 'Enter current password' },
                      { label: 'New Password',      val: newPwd,  set: setNewPwd,  ph: 'At least 6 characters' },
                      { label: 'Confirm New',       val: cnfPwd,  set: setCnfPwd,  ph: 'Repeat new password' },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label}>
                        <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">{label}</label>
                        <div className="relative">
                          <input
                            type={showPwd ? 'text' : 'password'}
                            value={val} onChange={e => set(e.target.value)}
                            placeholder={ph} className="input pr-10"
                          />
                          <button type="button" onClick={() => setShowPwd(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200">
                            {showPwd ? <HiEyeOff /> : <HiEye />}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Strength bar */}
                    {newPwd.length > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-dark-700 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(strengthLevel / 3) * 100}%` }}
                            className={`h-full rounded-full transition-all ${strengthColor[strengthLevel]}`}
                          />
                        </div>
                        <p className={`text-xs font-medium ${
                          strengthLevel === 1 ? 'text-red-500' : strengthLevel === 2 ? 'text-amber-500' : 'text-green-500'
                        }`}>
                          {strengthLabel[strengthLevel]}
                        </p>
                      </div>
                    )}

                    <button onClick={changePassword} disabled={chgPwd} className="btn-primary text-sm flex items-center gap-2">
                      {chgPwd
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Changing...</>
                        : <><HiLockClosed />Change Password</>
                      }
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div className="p-4 rounded-2xl border-2 border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 space-y-3">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">⚠️ Danger Zone</p>
                    <p className="text-xs text-red-600 dark:text-red-500 leading-relaxed">
                      Deleting your account removes all metadata, activities, and settings from Air Drive.
                      Your actual files in Google Drive are not affected.
                    </p>
                    <button onClick={deleteAccount}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                      <HiTrash /> Delete My Account
                    </button>
                  </div>
                </>
              )}

              {/* ━━━ ACTIVITY ━━━ */}
              {activeSection === 'activity' && (
                <>
                  <div className="pb-4 border-b border-slate-100 dark:border-dark-700 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-dark-900 dark:text-white">Activity Log</h2>
                      <p className="text-xs text-dark-400 mt-0.5">Your recent actions across Air Drive</p>
                    </div>
                    <button onClick={() => actRefetch()} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 flex-shrink-0">
                      <HiRefresh className={actLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                  </div>

                  {/* Loading skeletons */}
                  {actLoading && (
                    <div className="space-y-2">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <div className="skeleton w-20 h-5 rounded-full flex-shrink-0" />
                          <div className="skeleton h-4 flex-1 rounded" />
                          <div className="skeleton w-20 h-3 rounded hidden sm:block" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {actError && !actLoading && (
                    <div className="flex flex-col items-center py-10 text-center rounded-2xl border-2 border-dashed border-red-200 dark:border-red-900/40">
                      <HiRefresh className="text-3xl text-red-400 mb-2" />
                      <p className="text-sm font-medium text-dark-700 dark:text-dark-200">Could not load activity</p>
                      <button onClick={() => actRefetch()} className="btn-secondary text-xs mt-3">Try Again</button>
                    </div>
                  )}

                  {/* Heatmap */}
                  {!actLoading && !actError && actData?.heatmap?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800 overflow-x-auto">
                      <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
                        Last 12 months
                      </p>
                      <ActivityHeatmap heatmap={actData.heatmap} />
                    </div>
                  )}

                  {/* Empty */}
                  {!actLoading && !actError && !actData?.activities?.length && (
                    <div className="flex flex-col items-center py-14 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-dark-700">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-dark-800 flex items-center justify-center mb-3">
                        <HiClock className="text-3xl text-dark-300" />
                      </div>
                      <p className="text-sm font-semibold text-dark-600 dark:text-dark-300">No activity yet</p>
                      <p className="text-xs text-dark-400 mt-1 max-w-xs">
                        Upload, rename, share, or organize files to start your activity history.
                      </p>
                    </div>
                  )}

                  {/* Activity table */}
                  {!actLoading && !actError && actData?.activities?.length > 0 && (
                    <div className="rounded-2xl border border-slate-100 dark:border-dark-700 overflow-hidden">
                      {/* Header row — hidden on mobile */}
                      <div className="hidden sm:grid grid-cols-[130px_1fr_110px] gap-3 px-4 py-2.5
                        bg-slate-50 dark:bg-dark-800 text-xs font-bold text-dark-400 uppercase tracking-wider
                        border-b border-slate-100 dark:border-dark-700">
                        <span>Action</span>
                        <span>File / Detail</span>
                        <span className="text-right">Date</span>
                      </div>

                      {actData.activities.slice(0, 30).map((a, i) => (
                        <motion.div key={a._id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                          className="flex flex-col sm:grid sm:grid-cols-[130px_1fr_110px] gap-1 sm:gap-3 items-start sm:items-center
                            px-4 py-3 border-b border-slate-50 dark:border-dark-800 last:border-0
                            hover:bg-slate-50/80 dark:hover:bg-dark-800/60 transition-colors"
                        >
                          <span className={`w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ACTION_BADGE[a.action] || ACTION_BADGE.default}`}>
                            {a.action?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm text-dark-600 dark:text-dark-300 truncate w-full">
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

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
