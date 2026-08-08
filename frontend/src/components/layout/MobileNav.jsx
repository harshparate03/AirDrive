import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HiHome, HiFolder, HiStar, HiSparkles, HiUpload,
} from 'react-icons/hi'
import { useDispatch } from 'react-redux'
import { openModal } from '../../store/slices/uiSlice'

const navItems = [
  { to: '/dashboard', icon: HiHome, label: 'Home' },
  { to: '/my-drive', icon: HiFolder, label: 'Drive' },
  { upload: true, icon: HiUpload, label: 'Upload' },
  { to: '/starred', icon: HiStar, label: 'Starred' },
  { to: '/ai', icon: HiSparkles, label: 'AI' },
]

const MobileNav = () => {
  const dispatch = useDispatch()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white dark:bg-dark-900 border-t border-slate-100 dark:border-dark-800 pb-safe">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item, i) => {
          if (item.upload) {
            return (
              <motion.button
                key="upload"
                whileTap={{ scale: 0.9 }}
                onClick={() => dispatch(openModal({ modal: 'upload' }))}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 -mt-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-neon">
                  <HiUpload className="text-white text-xl" />
                </div>
              </motion.button>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-dark-400 dark:text-dark-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-6 h-6 flex items-center justify-center transition-transform ${isActive ? 'scale-110' : ''}`}>
                    <item.icon className="text-xl" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
