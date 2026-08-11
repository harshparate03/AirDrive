import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import toast from 'react-hot-toast'

const TopBar = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, viewMode } = useSelector(state => state.ui)
  const { unreadCount } = useSelector(state => state.notifications)
  const [search, setSearch] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const notifRef = useRef(null)
  const recognitionRef = useRef(null)
  const supportsFileView = ['/my-drive', '/recent', '/starred', '/trash', '/shared', '/search']
    .some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))
    || location.pathname.startsWith('/folder/')

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

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      dispatch(setSearchQuery(search))
      navigate(`/search?q=${encodeURIComponent(search)}`)
    }
  }

  const handleVoiceSearch = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      toast.error('Voice search is not supported in this browser')
      return
    }
    const recognition = new SR()
    recognition.lang = navigator.language || 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim()
      setSearch(transcript)
      dispatch(setSearchQuery(transcript))
      navigate(`/search?q=${encodeURIComponent(transcript)}`)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'aborted') toast.error(event.error === 'not-allowed' ? 'Microphone permission was denied' : 'Voice search could not start')
    }
    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  return (
    <header className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:gap-4 md:px-6 md:py-3 bg-white dark:bg-dark-900 border-b border-slate-100 dark:border-dark-800 sticky top-0 z-20">
      {/* Menu toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="touch-target btn-ghost shrink-0 p-2 text-dark-500 md:hidden"
        aria-label="Open navigation menu"
      >
        <HiMenu className="text-xl" />
      </button>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="min-w-0 flex-1 max-w-xl">
        <div className="relative flex items-center">
          <HiSearch className="absolute left-3.5 text-dark-400 text-lg pointer-events-none" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`input h-11 pl-9 text-sm sm:pl-10 ${search ? 'pr-20' : 'pr-12'}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-11 flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 transition hover:bg-slate-100 hover:text-dark-600 dark:hover:bg-dark-700 dark:hover:text-dark-200"
              aria-label="Clear search"
            >
              <HiX />
            </button>
          )}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg transition ${isListening ? 'bg-red-50 text-red-600 ring-2 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900/50' : 'text-dark-400 hover:bg-slate-100 hover:text-primary-500 dark:hover:bg-dark-700'}`}
            title={isListening ? 'Listening… click to stop' : 'Voice search'}
            aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
          >
            {isListening && <span className="absolute inset-1 animate-ping rounded-md bg-red-300/30" />}
            <HiMicrophone className="relative text-lg" />
          </button>
        </div>
      </form>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {/* View mode toggle */}
        {supportsFileView && <div className="hidden items-center rounded-xl border border-slate-200 dark:border-dark-700 overflow-hidden sm:flex">
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
        </div>}

        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="touch-target btn-ghost p-2 text-dark-500 sm:p-2.5"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
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
            className="touch-target btn-ghost relative p-2 text-dark-500 sm:p-2.5"
            aria-label="Open notifications"
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
