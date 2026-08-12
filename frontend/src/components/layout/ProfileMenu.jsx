import React, { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiUser, HiCog, HiLogout, HiShieldCheck, HiChartBar,
  HiSparkles, HiMoon, HiSun, HiBell, HiFolder,
  HiChevronRight, HiColorSwatch,
} from 'react-icons/hi'
import { logoutUser } from '../../store/slices/authSlice'
import { toggleTheme } from '../../store/slices/uiSlice'
import toast from 'react-hot-toast'

/* Default avatar when no photo */
const DefaultAvatar = ({ name = 'U', size = 36 }) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold select-none flex-shrink-0"
    >
      <span style={{ fontSize: size * 0.38 }}>{initials}</span>
    </div>
  )
}

export { DefaultAvatar }

const menuSections = [
  {
    items: [
      { icon: HiUser,      label: 'My Profile',     to: '/settings',           param: 'profile' },
      { icon: HiCog,       label: 'Settings',        to: '/settings',           param: 'appearance' },
      { icon: HiBell,      label: 'Notifications',   to: '/settings',           param: 'notifications' },
    ],
  },
  {
    items: [
      { icon: HiFolder,    label: 'My Drive',        to: '/my-drive' },
      { icon: HiSparkles,  label: 'AI Assistant',    to: '/ai' },
      { icon: HiChartBar,  label: 'Storage',         to: '/storage' },
    ],
  },
  {
    items: [
      { icon: HiShieldCheck, label: 'Security',      to: '/settings',           param: 'security' },
    ],
  },
]

const ProfileMenu = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { user }   = useSelector(s => s.auth)
  const { theme }  = useSelector(s => s.ui)

  const [open, setOpen]     = useState(false)
  const [hovered, setHov]   = useState(false)
  const menuRef             = useRef(null)

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* also open on hover */
  let hoverTimeout = useRef(null)
  const onMouseEnter = () => {
    clearTimeout(hoverTimeout.current)
    setOpen(true)
  }
  const onMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setOpen(false), 200)
  }

  const handleLogout = async () => {
    setOpen(false)
    await dispatch(logoutUser())
    navigate('/login')
    toast.success('Logged out')
  }

  const handleNav = (item) => {
    setOpen(false)
    if (item.param) {
      navigate(item.to, { state: { section: item.param } })
    } else {
      navigate(item.to)
    }
  }

  const avatar = user?.photo
    ? <img src={user.photo} alt={user.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-dark-700 shadow" />
    : <DefaultAvatar name={user?.name || 'U'} size={36} />

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition-all duration-200 ${
          open || hovered
            ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-md'
            : 'border-slate-200 dark:border-dark-600 hover:border-primary-300 dark:hover:border-primary-600'
        }`}
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {avatar}
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-xs font-semibold text-dark-800 dark:text-dark-100 leading-tight truncate max-w-[100px]">
            {user?.name?.split(' ')[0]}
          </p>
          <p className="text-[10px] text-dark-400 capitalize leading-tight">{user?.role || 'user'}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <HiChevronRight className="text-dark-400 text-sm rotate-90 hidden sm:block" />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-dark-800 rounded-2xl shadow-glass-lg border border-slate-100 dark:border-dark-700 overflow-hidden z-50"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border-b border-slate-100 dark:border-dark-700">
              <div className="flex-shrink-0">
                {user?.photo
                  ? <img src={user.photo} alt={user.name} className="w-11 h-11 rounded-xl object-cover ring-2 ring-white dark:ring-dark-700" />
                  : <DefaultAvatar name={user?.name || 'U'} size={44} />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-dark-900 dark:text-white text-sm truncate">{user?.name}</p>
                <p className="text-xs text-dark-500 dark:text-dark-400 truncate">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-semibold capitalize">
                  {user?.role || 'user'}
                </span>
              </div>
            </div>

            {/* Menu sections */}
            <div className="p-2">
              {menuSections.map((section, si) => (
                <React.Fragment key={si}>
                  {si > 0 && <div className="my-1 border-t border-slate-50 dark:border-dark-700" />}
                  {section.items.map(item => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-700 dark:text-dark-200 hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors flex-shrink-0">
                        <item.icon className="text-dark-500 dark:text-dark-400 group-hover:text-primary-500 text-base transition-colors" />
                      </div>
                      <span className="flex-1 font-medium">{item.label}</span>
                      <HiChevronRight className="text-dark-300 dark:text-dark-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </React.Fragment>
              ))}

              {/* Theme toggle row */}
              <div className="my-1 border-t border-slate-50 dark:border-dark-700" />
              <button
                onClick={() => { dispatch(toggleTheme()); setOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-700 dark:text-dark-200 hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 flex items-center justify-center transition-colors flex-shrink-0">
                  {theme === 'dark'
                    ? <HiSun className="text-amber-500 text-base" />
                    : <HiMoon className="text-primary-500 text-base" />
                  }
                </div>
                <span className="flex-1 font-medium">
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
                </span>
                <span className="text-xs text-dark-400 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-dark-700">
                  D
                </span>
              </button>

              {/* Logout */}
              <div className="my-1 border-t border-slate-50 dark:border-dark-700" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
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
