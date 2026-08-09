import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { HiBadgeCheck, HiBell, HiPhotograph, HiSave, HiShieldCheck, HiUser } from 'react-icons/hi'
import toast from 'react-hot-toast'
import { updateProfile } from '../../store/slices/authSlice'
import ThemePicker from '../ui/ThemePicker'

export const AdminProfile = () => {
  const dispatch = useDispatch()
  const user = useSelector(state => state.auth.user)
  const [name, setName] = useState(user?.name || '')
  const [photo, setPhoto] = useState(user?.photo || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return toast.error('Display name is required')
    setSaving(true)
    try {
      await dispatch(updateProfile({ name: name.trim(), photo: photo.trim() })).unwrap()
      toast.success('Admin profile updated')
    } catch (error) { toast.error(error || 'Profile update failed') }
    setSaving(false)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="card p-6 text-center">
        <div className="relative mx-auto w-fit">
          <img src={photo || `https://ui-avatars.com/api/?name=${user?.name}&background=4f46e5&color=fff`} alt={user?.name} className="h-28 w-28 rounded-3xl object-cover ring-4 ring-indigo-500/10" />
          <span className="absolute -bottom-2 -right-2 rounded-xl bg-indigo-600 p-2 text-white shadow-lg"><HiShieldCheck /></span>
        </div>
        <h2 className="mt-5 text-xl font-bold text-dark-900 dark:text-white">{user?.name}</h2>
        <p className="text-sm text-dark-400">{user?.email}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><HiBadgeCheck /> Super administrator</div>
      </section>
      <section className="card p-6">
        <div className="mb-6"><h2 className="text-lg font-bold text-dark-900 dark:text-white">Administrator profile</h2><p className="text-sm text-dark-400">Manage the identity displayed across the control center.</p></div>
        <div className="space-y-5">
          <label className="block"><span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark-600 dark:text-dark-300"><HiUser /> Display name</span><input value={name} onChange={event => setName(event.target.value)} className="input" /></label>
          <label className="block"><span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark-600 dark:text-dark-300"><HiPhotograph /> Profile image URL</span><input value={photo} onChange={event => setPhoto(event.target.value)} className="input" placeholder="https://..." /></label>
          <label className="block"><span className="mb-1.5 text-sm font-medium text-dark-600 dark:text-dark-300">Account email</span><input value={user?.email || ''} disabled className="input cursor-not-allowed opacity-60" /></label>
          <button onClick={save} disabled={saving} className="btn-primary inline-flex items-center gap-2"><HiSave /> {saving ? 'Saving...' : 'Save profile'}</button>
        </div>
      </section>
    </div>
  )
}

export const AdminSettings = () => {
  const dispatch = useDispatch()
  const user = useSelector(state => state.auth.user)
  const defaults = user?.preferences?.notifications || {}
  const [notifications, setNotifications] = useState({ upload: defaults.upload ?? true, share: defaults.share ?? true, security: defaults.security ?? true })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await dispatch(updateProfile({ preferences: { notifications } })).unwrap()
      toast.success('Admin settings saved')
    } catch (error) { toast.error(error || 'Settings update failed') }
    setSaving(false)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-6"><h2 className="text-lg font-bold text-dark-900 dark:text-white">Control center appearance</h2><p className="mb-6 text-sm text-dark-400">Choose the visual accent used across AirDrive administration.</p><ThemePicker /></section>
      <section className="card p-6"><h2 className="text-lg font-bold text-dark-900 dark:text-white">Administrator notifications</h2><p className="mb-5 text-sm text-dark-400">Control the operational events delivered to this account.</p><div className="space-y-3">{[['upload','Upload activity'],['share','Sharing activity'],['security','Security alerts']].map(([key,label]) => <label key={key} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"><span className="flex items-center gap-3 text-sm text-dark-700 dark:text-dark-200"><HiBell className="text-indigo-500" />{label}</span><input type="checkbox" checked={notifications[key]} onChange={event => setNotifications(value => ({ ...value, [key]: event.target.checked }))} className="h-4 w-4 accent-indigo-600" /></label>)}</div><button onClick={save} disabled={saving} className="btn-primary mt-5 inline-flex items-center gap-2"><HiSave /> {saving ? 'Saving...' : 'Save settings'}</button></section>
    </div>
  )
}
