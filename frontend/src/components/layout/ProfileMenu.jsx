import React, { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiUser, HiCog, HiLogout, HiShieldCheck, HiChartBar,
  HiSparkles, HiMoon, HiSun, HiBell, HiFolder,
  HiChevronRight, HiColorSwatch,
} from 'react-icons/hi'
import { logoutUser } from '../../store/slices/authSlice'
import { toggleTheme } from '../../store/slices/uiSlice'
import toast from 'react-hot-toast'

/* ─────────────────────────────────────────────
   DefaultAvatar — initials fallback
   Always rendered inside a perfect circle with
   a visible gradient border ring.
───────────────────────────────────────────── */
export const DefaultAvatar = ({ name = 'U', size = 36, className = '' }) => {
  const initials = (name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-full flex-shrink-0 ${className}`}
    >
      {/* gradient border ring */}
      <div
        style={{ width: size, height: size }}
        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-400 to-purple-600 p-[2px]"
      >
        {/* inner circle with initials */}
        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <span
            style={{ fontSize: Math.max(size * 0.36, 10) }}
            className="text-white font-bold leading-none select-none"
          >
            {initials}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   UserAvatar — shows photo or DefaultAvatar
   with a consistent ring border in both cases
───────────────────────────────────────────── */
const UserAvatar = ({ user, size = 36, className = '' }) => {
  if (user?.photo) {
    return (
      <div
        style={{ width: size + 4, height: size + 4 }}
        className={`rounded-full bg-gradient-to-br from-primary-400 to-purple-600 p-[2px] flex-shrink-0 ${className}`}
      >
        <img
          src={user.photo}
          alt={user.name || 'User'}
          style={{ width: size, height: size }}
          className="rounded-full object-cover w-full h-full block"
        />
      </div>
    )
  }
  return <DefaultAvatar name={user?.name || 'U'} size={size} className={className} />
}

/* ─────────────────────────────────────────────
   Menu sections config
───────────────────────────────────────────── */
const menuSections = [
  {
    items: [
      { icon: HiUser,        label: 'My Profile',    to: '/settings', param: 'profile' },
      { icon: HiCog,         label: 'Settings',      to: '/settings', param: 'appearance' },
      { icon: HiBell,        label: 'Notifications', to: '/settings', param: 'notifications' },
    ],
  },
  {
    items: [
      { icon: HiFolder,      label: 'My Drive',      to: '/my-drive' },
      { icon: HiSparkles,    label: 'AI Assistant',  to: '/ai' },
      { icon: HiChartBar,    label: 'Storage',       to: '/storage' },
    ],
  },
  {
    items: [
      { icon: HiShieldCheck, label: 'Security',      to: '/settings', param: 'security' },
    ],
  },
]

/* ─────────────────────────────────────────────
   ProfileMenu component
───────────────────────────────────────────── */
const ProfileMenu = () => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { user }  = useSelector(s => s.auth)
  const { theme } = useSelector(s => s.ui)

  const [open, setOpen] = useState(false)
  const menuRef         = useRef(null)
  const hoverTimer      = useRef(null)

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onMouseEnter = () => { clearTimeout(hoverTimer.current); setOpen(true) }
  const onMouseLeave = () => { hoverTimer.current = setTimeout(() => setOpen(false), 250) }

  const handleLogout = async () => {
    setOpen(false)
    await dispatch(logoutUser())
    navigate('/login')
    toast.success('Logged out')
  }

  const handleNav = (item) => {
    setOpen(false)
    navigate(item.to, item.param ? { state: { section: item.param } } : undefined)
  }

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Profile menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full transition-all duration-200 outline-none
          focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
          ${open
            ? 'ring-2 ring-primary-400 dark:ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-900'
            : 'hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-600 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-dark-900'
          }`}
      >
        {/* Avatar — always visible on all screen sizes */}
        <UserAvatar user={user} size={34} />

        {/* Name + role — hidden on small screens */}
        <div className="hidden sm:flex flex-col text-left min-w-0 pr-1">
          <span className="text-xs font-semibold text-dark-800 dark:text-dark-100 leading-tight truncate max-w-[90px]">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
          <span className="text-[10px] text-dark-400 capitalize leading-tight">
            {user?.role || 'user'}
          </span>
        </div>
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="absolute right-0 top-full mt-2.5 w-72
              bg-white dark:bg-dark-800 rounded-2xl
              shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
              border border-slate-100 dark:border-dark-700
              overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4
              bg-gradient-to-r from-primary-50 via-white to-purple-50
              dark:from-primary-900/20 dark:via-dark-800 dark:to-purple-900/20
              border-b border-slate-100 dark:border-dark-700">
              <div className="flex-shrink-0">
                <UserAvatar user={user} size={44} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-dark-900 dark:text-white text-sm truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 truncate">
                  {user?.email}
                </p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full
                  bg-primary-100 dark:bg-primary-900/40
                  text-primary-700 dark:text-primary-300 text-[10px] font-semibold capitalize">
                  {user?.role || 'user'}
                </span>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2 space-y-0.5">
              {menuSections.map((section, si) => (
                <React.Fragment key={si}>
                  {si > 0 && <div className="my-1.5 border-t border-slate-100 dark:border-dark-700" />}
                  {section.items.map(item => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                        text-dark-700 dark:text-dark-200
                        hover:bg-slate-50 dark:hover:bg-dark-700/60
                        transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-700
                        group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30
                        flex items-center justify-center flex-shrink-0 transition-colors">
                        <item.icon className="text-dark-500 dark:text-dark-400 group-hover:text-primary-500 text-base transition-colors" />
                      </div>
                      <span className="flex-1 font-medium">{item.label}</span>
                      <HiChevronRight className="text-dark-300 dark:text-dark-600 text-sm
                        opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0
                        transition-all duration-150" />
                    </button>
                  ))}
                </React.Fragment>
              ))}

              {/* Theme toggle */}
              <div className="my-1.5 border-t border-slate-100 dark:border-dark-700" />
              <button
                onClick={() => { dispatch(toggleTheme()); setOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                  text-dark-700 dark:text-dark-200
                  hover:bg-slate-50 dark:hover:bg-dark-700/60 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-700
                  group-hover:bg-amber-100 dark:group-hover:bg-amber-900/20
                  flex items-center justify-center flex-shrink-0 transition-colors">
                  {theme === 'dark'
                    ? <HiSun className="text-amber-500 text-base" />
                    : <HiMoon className="text-primary-500 text-base" />
                  }
                </div>
                <span className="flex-1 font-medium">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
                <kbd className="text-[10px] text-dark-400 px-1.5 py-0.5 rounded-md
                  bg-slate-100 dark:bg-dark-700 font-mono">D</kbd>
              </button>

              {/* Logout */}
              <div className="my-1.5 border-t border-slate-100 dark:border-dark-700" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                  text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20
                  flex items-center justify-center flex-shrink-0">
                  <HiLogout className="text-red-500 text-base" />
                </div>
                <span className="flex-1 font-medium">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProfileMenu
