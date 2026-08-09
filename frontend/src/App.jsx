import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProfile, logoutUser, setInitialized } from './store/slices/authSlice'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'
import { connectSocket, disconnectSocket } from './services/socket'
import { addNotification } from './store/slices/notificationSlice'

// Layout
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'

// Pages
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import MyDrivePage from './pages/MyDrivePage'
import SharedPage from './pages/SharedPage'
import RecentPage from './pages/RecentPage'
import StarredPage from './pages/StarredPage'
import TrashPage from './pages/TrashPage'
import AIAssistantPage from './pages/AIAssistantPage'
import StoragePage from './pages/StoragePage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import SharedFilePage from './pages/SharedFilePage'
import SearchPage from './pages/SearchPage'
import FolderPage from './pages/FolderPage'
import FileRequestPage from './pages/FileRequestPage'
import PublicRequestPage from './pages/PublicRequestPage'
import OnboardingTour from './components/ui/OnboardingTour'
import PageLoader from './components/ui/PageLoader'
import { initTheme } from './components/ui/ThemePicker'

// Guards
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, initialized } = useSelector(state => state.auth)
  if (!initialized) return <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user, isAuthenticated, initialized } = useSelector(state => state.auth)
  if (!initialized) return null
  return !isAuthenticated ? children : <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
}

const AuthenticatedHome = () => {
  const user = useSelector(state => state.auth.user)
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
}

function App() {
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui)

  // Initialize theme from localStorage
  useEffect(() => {
    initTheme()
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Try to restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      dispatch(fetchProfile())
    } else {
      dispatch(setInitialized())
    }
  }, [dispatch])

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('accessToken')
      const socket = connectSocket(token)

      socket.on('notification', (notif) => {
        dispatch(addNotification(notif))
      })

      return () => {
        socket.off('notification')
      }
    } else {
      disconnectSocket()
    }
  }, [isAuthenticated, user, dispatch])

return (
    <>
      {/* Route transition progress indicator */}
      <PageLoader />
      <Routes>
        {/* Public routes */}
<Route path="/login" element={
          <PublicRoute><AuthLayout><LoginPage /></AuthLayout></PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute><AuthLayout><SignupPage /></AuthLayout></PublicRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicRoute><AuthLayout><ForgotPasswordPage /></AuthLayout></PublicRoute>
        } />
        <Route path="/share/:token" element={<SharedFilePage />} />
        <Route path="/request/:token" element={<PublicRequestPage />} />

        {/* Private routes */}
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }>
          <Route index element={<AuthenticatedHome />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="my-drive" element={<MyDrivePage />} />
          <Route path="folder/:folderId" element={<FolderPage />} />
          <Route path="shared" element={<SharedPage />} />
          <Route path="recent" element={<RecentPage />} />
          <Route path="starred" element={<StarredPage />} />
          <Route path="trash" element={<TrashPage />} />
          <Route path="ai" element={<AIAssistantPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="requests" element={<FileRequestPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Global onboarding tour — shown once after first login */}
      {isAuthenticated && <OnboardingTour />}
    </>
  )
}

export default App
