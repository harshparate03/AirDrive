import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiSearch, HiMoon, HiSun, HiBell, HiMenu, HiMicrophone,
  HiViewGrid, HiViewList, HiX,
} from 'react-icons/hi'
import { toggleTheme, toggleSidebar, setViewMode, setSearchQuery } from '../../store/slices/uiSlice'
import NotificationPanel from '../notifications/NotificationPanel'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { setNotifications } from '../../store/slices/notificationSlice'

const TopBar = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { theme, viewMode } = useSelector(state => state.ui)
  const { unreadCount } = useSelector(state => state.notifications)
  const [search, setSearch] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef(null)

  // Fetch notifications
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (notifData) dispatch(setNotifications(notifData))
  }, [notifData, dispatch])

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      dispatch(setSearchQuery(search))
      navigate(`/search?q=${encodeURIComponent(search)}`)
    }
  }

  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SR()
      recognition.lang = 'en-US'
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        setSearch(transcript)
        navigate(`/search?q=${encodeURIComponent(transcript)}`)
      }
      recognition.start()
    }
  }

  return (
    <header className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-dark-900 border-b border-slate-100 dark:border-dark-800 sticky top-0 z-10">
      {/* Menu toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="btn-ghost p-2 text-dark-500 md:hidden"
      >
        <HiMenu className="text-xl" />
      </button>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative flex items-center">
          <HiSearch className="absolute left-3.5 text-dark-400 text-lg pointer-events-none" />
          <input
            type="text"
            placeholder="Search files, folders, AI tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 pr-10 h-10 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-10 text-dark-400 hover:text-dark-600 p-1"
            >
              <HiX />
            </button>
          )}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className="absolute right-3 text-dark-400 hover:text-primary-500 transition-colors"
            title="Voice search"
          >
            <HiMicrophone />
          </button>
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* View mode toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-dark-700 overflow-hidden">
          <button
            onClick={() => dispatch(setViewMode('grid'))}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-dark-400 hover:text-dark-600 dark:hover:text-dark-300'}`}
          >
            <HiViewGrid />
          </button>
          <button
            onClick={() => dispatch(setViewMode('list'))}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-dark-400 hover:text-dark-600 dark:hover:text-dark-300'}`}
          >
            <HiViewList />
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="btn-ghost p-2.5 text-dark-500"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {theme === 'dark' ? <HiSun className="text-xl" /> : <HiMoon className="text-xl" />}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-ghost p-2.5 text-dark-500 relative"
          >
            <HiBell className="text-xl" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>
          <AnimatePresence>
            {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default TopBar
