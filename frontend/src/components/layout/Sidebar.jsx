import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import {
  HiHome, HiFolder, HiShare, HiClock, HiStar, HiTrash,
  HiSparkles, HiChartBar, HiCog, HiLogout, HiChevronLeft,
  HiCloudUpload, HiUpload,
  HiShieldCheck,
} from 'react-icons/hi'
import { logoutUser } from '../../store/slices/authSlice'
import { toggleSidebarCollapse, openModal } from '../../store/slices/uiSlice'
import StorageBar from '../ui/StorageBar'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: HiHome, label: 'Home' },
  { to: '/my-drive', icon: HiFolder, label: 'My Drive' },
  { to: '/shared', icon: HiShare, label: 'Shared With Me' },
  { to: '/recent', icon: HiClock, label: 'Recent' },
  { to: '/starred', icon: HiStar, label: 'Starred' },
  { to: '/trash', icon: HiTrash, label: 'Trash' },
  { divider: true },
  { to: '/ai', icon: HiSparkles, label: 'AI Assistant' },
  { to: '/requests', icon: HiCloudUpload, label: 'File Requests' },
  { to: '/storage', icon: HiChartBar, label: 'Storage' },
  { divider: true },
  { to: '/settings', icon: HiCog, label: 'Settings' },
]

const Sidebar = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { sidebarCollapsed } = useSelector(state => state.ui)
  const { user } = useSelector(state => state.auth)
  const [uploadHover, setUploadHover] = useState(false)

  const { data: storageData } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get('/files/storage').then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <AnimatePresence>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-shrink-0 flex flex-col h-full bg-white dark:bg-dark-900 border-r border-slate-100 dark:border-dark-800 relative z-20"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100 dark:border-dark-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <HiCloudUpload className="text-white text-lg" />
          </div>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-bold text-lg bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"
            >
              Air Drive
            </motion.span>
          )}
          <button
            onClick={() => dispatch(toggleSidebarCollapse())}
            className="ml-auto text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700"
          >
            <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }}>
              <HiChevronLeft />
            </motion.div>
          </button>
        </div>

        {/* Upload Button */}
        <div className="px-3 py-3">
          <motion.button
            onClick={() => dispatch(openModal({ modal: 'upload' }))}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium transition-all hover:shadow-neon ${sidebarCollapsed ? 'justify-center' : ''}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HiUpload className="text-lg flex-shrink-0" />
            {!sidebarCollapsed && <span>Upload Files</span>}
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            if (item.divider) {
              return <div key={idx} className="my-2 border-t border-slate-100 dark:border-dark-800" />
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center' : ''}`
                }
              >
                <item.icon className="text-xl flex-shrink-0" />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm sidebar-label"
                  >
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            )
          })}
          {user?.role === 'admin' && (
            <>
              <div className="my-2 border-t border-slate-100 dark:border-dark-800" />
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center' : ''}`
                }
                title="Admin Panel"
              >
                <HiShieldCheck className="text-xl flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm sidebar-label">Admin Panel</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* Storage */}
        {!sidebarCollapsed && storageData && (
          <div className="px-3 pb-3">
            <StorageBar
              used={storageData.storageUsed}
              total={storageData.storageLimit}
            />
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="border-t border-slate-100 dark:border-dark-800 p-3">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <img
              src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`}
              alt={user?.name}
              className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-primary-200 dark:ring-primary-800"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-800 dark:text-dark-100 truncate">{user?.name}</p>
                <p className="text-xs text-dark-400 truncate">{user?.email}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="text-dark-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Logout"
              >
                <HiLogout />
              </button>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

export default Sidebar
