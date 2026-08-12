import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiSearch, HiMicrophone, HiViewGrid, HiViewList, HiX, HiMenu,
} from 'react-icons/hi'
import { toggleSidebar, setViewMode, setSearchQuery } from '../../store/slices/uiSlice'
import ProfileMenu from './ProfileMenu'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { setNotifications } from '../../store/slices/notificationSlice'
import NotificationPanel from '../notifications/NotificationPanel'
import { HiBell } from 'react-icons/hi'

const TopBar = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { theme, viewMode } = useSelector(s => s.ui)
  const { unreadCount }     = useSelector(s => s.notifications)

  const [search, setSearch]         = useState('')
  const [showNotif, setShowNotif]   = useState(false)
  const notifRef                    = useRef(null)

  // Fetch notifications
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
  })
  useEffect(() => {
    if (notifData) dispatch(setNotifications(notifData))
  }, [notifData, dispatch])

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
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

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'en-US'
    r.onresult = (e) => {
      const t = e.results[0][0].transcript
      setSearch(t)
      navigate(`/search?q=${encodeURIComponent(t)}`)
    }
    r.start()
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6 py-3
      bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl
      border-b border-slate-100 dark:border-dark-800">

      {/* Mobile menu toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="md:hidden btn-ghost p-2 text-dark-500"
        aria-label="Toggle menu"
      >
        <HiMenu className="text-xl" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative flex items-center">
          <HiSearch className="absolute left-3.5 text-dark-400 text-lg pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files, tags, AI..."
            className="input pl-10 pr-20 h-10 text-sm bg-slate-50 dark:bg-dark-800 border-slate-100 dark:border-dark-700"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-9 text-dark-400 hover:text-dark-600 p-1">
              <HiX className="text-sm" />
            </button>
          )}
          <button type="button" onClick={handleVoice}
            className="absolute right-3 text-dark-400 hover:text-primary-500 transition-colors"
            title="Voice search">
            <HiMicrophone className="text-sm" />
          </button>
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* View toggle — hidden on mobile */}
        <div className="hidden sm:flex items-center rounded-xl border border-slate-200 dark:border-dark-700 overflow-hidden">
          {[
            { mode: 'grid', Icon: HiViewGrid },
            { mode: 'list', Icon: HiViewList },
          ].map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => dispatch(setViewMode(mode))}
              className={`p-2 transition-colors ${
                viewMode === mode
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                  : 'text-dark-400 hover:text-dark-600 dark:hover:text-dark-300'
              }`}
              aria-label={`${mode} view`}
            >
              <Icon className="text-base" />
            </button>
          ))}
        </div>

        {/* Notifications bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotif(o => !o)}
            className="relative btn-ghost p-2.5 text-dark-500"
            aria-label="Notifications"
          >
            <HiBell className="text-xl" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>
          <AnimatePresence>
            {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
          </AnimatePresence>
        </div>

        {/* Profile menu */}
        <ProfileMenu />
      </div>
    </header>
  )
}

export default TopBar
