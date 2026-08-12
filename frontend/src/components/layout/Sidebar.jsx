import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import {
  HiHome, HiFolder, HiShare, HiClock, HiStar, HiTrash,
  HiSparkles, HiChartBar, HiCog, HiLogout, HiChevronLeft,
  HiCloudUpload, HiUpload, HiShieldCheck,
} from 'react-icons/hi'
import { logoutUser } from '../../store/slices/authSlice'
import { toggleSidebarCollapse, openModal } from '../../store/slices/uiSlice'
import StorageBar from '../ui/StorageBar'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { DefaultAvatar } from './ProfileMenu'

/* Avatar with gradient border — works for photo & initials */
const SidebarAvatar = ({ user, size = 32 }) => {
  if (user?.photo?.trim()) {
    return (
      <div
        style={{ width: size + 4, height: size + 4 }}
        className="rounded-full bg-gradient-to-br from-primary-400 to-purple-600 p-[2px] flex-shrink-0"
      >
        <img
          src={user.photo}
          alt={user?.name || 'User'}
          style={{ width: size, height: size }}
          className="rounded-full object-cover block w-full h-full"
        />
      </div>
    )
  }
  return <DefaultAvatar name={user?.name || 'U'} size={size} />
}

const navItems = [
  { to: '/dashboard',  icon: HiHome,        label: 'Home' },
  { to: '/my-drive',   icon: HiFolder,      label: 'My Drive' },
  { to: '/shared',     icon: HiShare,       label: 'Shared With Me' },
  { to: '/recent',     icon: HiClock,       label: 'Recent' },
  { to: '/starred',    icon: HiStar,        label: 'Starred' },
  { to: '/trash',      icon: HiTrash,       label: 'Trash' },
  { divider: true },
  { to: '/ai',         icon: HiSparkles,    label: 'AI Assistant' },
  { to: '/requests',   icon: HiCloudUpload, label: 'File Requests' },
  { to: '/storage',    icon: HiChartBar,    label: 'Storage' },
  { divider: true },
  { to: '/settings',   icon: HiCog,         label: 'Settings' },
]

const Sidebar = ({ mobile = false, onNavigate }) => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { sidebarCollapsed } = useSelector(s => s.ui)
  const { user }  = useSelector(s => s.auth)
  const collapsed = !mobile && sidebarCollapsed

  const { data: storageData } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get('/files/storage').then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <AnimatePresence>
      <motion.aside
        animate={{ width: mobile ? '100%' : collapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-shrink-0 flex flex-col h-full bg-white dark:bg-dark-900 border-r border-slate-100 dark:border-dark-800 relative z-20"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100 dark:border-dark-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <HiCloudUpload className="text-white text-lg" />
          </div>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="font-bold text-lg bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Air Drive
            </motion.span>
          )}
          {!mobile && (
            <button onClick={() => dispatch(toggleSidebarCollapse())}
              className="ml-auto text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors">
              <motion.div animate={{ rotate: collapsed ? 180 : 0 }}>
                <HiChevronLeft />
              </motion.div>
            </button>
          )}
        </div>

        {/* Upload Button */}
        <div className="px-3 py-3">
          <motion.button
            onClick={() => dispatch(openModal({ modal: 'upload' }))}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium
              transition-all hover:shadow-neon ${collapsed ? 'justify-center' : ''}`}
          >
            <HiUpload className="text-lg flex-shrink-0" />
            {!collapsed && <span>Upload Files</span>}
          </motion.button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            if (item.divider) return <div key={idx} className="my-2 border-t border-slate-100 dark:border-dark-800" />
            return (
              <NavLink key={item.to} to={item.to} onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
                }
              >
                <item.icon className="text-xl flex-shrink-0" />
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            )
          })}
          {user?.role === 'admin' && (
            <>
              <div className="my-2 border-t border-slate-100 dark:border-dark-800" />
              <NavLink to="/admin" onClick={onNavigate} title={collapsed ? 'Admin' : undefined}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
                }
              >
                <HiShieldCheck className="text-xl flex-shrink-0" />
                {!collapsed && <span className="text-sm">Admin Panel</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* Storage bar */}
        {!collapsed && storageData && (
          <div className="px-3 pb-3">
            <StorageBar used={storageData.storageUsed} total={storageData.storageLimit} />
          </div>
        )}

        {/* User row */}
        <div className="border-t border-slate-100 dark:border-dark-800 p-3">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <SidebarAvatar user={user} size={32} />
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-800 dark:text-dark-100 truncate leading-tight">{user?.name}</p>
                  <p className="text-xs text-dark-400 truncate leading-tight">{user?.email}</p>
                </div>
                <button onClick={handleLogout} title="Logout"
                  className="text-dark-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 transition-colors">
                  <HiLogout />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

export default Sidebar
