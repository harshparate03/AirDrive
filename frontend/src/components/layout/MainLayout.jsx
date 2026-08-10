import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import UploadPanel from '../upload/UploadPanel'
import FilePreviewModal from '../modals/FilePreviewModal'
import ShareModal from '../modals/ShareModal'
import RenameModal from '../modals/RenameModal'
import UploadModal from '../modals/UploadModal'
import ShortcutsModal from '../modals/ShortcutsModal'
import VersionHistoryModal from '../modals/VersionHistoryModal'
import MoveModal from '../modals/MoveModal'
import CommentsModal from '../modals/CommentsModal'
import MobileNav from './MobileNav'
import ContextMenu from '../ui/ContextMenu'
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts'
import { ConfirmProvider } from '../ui/ConfirmDialog'
import { AnimatePresence, motion } from 'framer-motion'
import { closeSidebar } from '../../store/slices/uiSlice'

const MainLayout = () => {
  const dispatch = useDispatch()
  const { sidebarOpen, activeModal, contextMenu } = useSelector(state => state.ui)

  // Global keyboard shortcuts
  useKeyboardShortcuts()

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) dispatch({ type: 'ui/setContextMenu', payload: null })
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [contextMenu, dispatch])

  return (
    <ConfirmProvider>
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-dark-950">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.button
              type="button"
              aria-label="Close navigation menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => dispatch(closeSidebar())}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="relative h-full w-[min(86vw,320px)] shadow-2xl"
            >
              <Sidebar mobile onNavigate={() => dispatch(closeSidebar())} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overscroll-contain overflow-x-hidden overflow-y-auto p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Upload Panel (floating) */}
      <UploadPanel />

      {/* Modals */}
      {activeModal === 'filePreview' && <FilePreviewModal />}
      {activeModal === 'share' && <ShareModal />}
      {activeModal === 'rename' && <RenameModal />}
      {activeModal === 'upload' && <UploadModal />}
      {activeModal === 'shortcuts' && <ShortcutsModal />}
      {activeModal === 'versionHistory' && <VersionHistoryModal />}
      {activeModal === 'move' && <MoveModal />}
      {activeModal === 'comments' && <CommentsModal />}

      {/* Context Menu */}
      {contextMenu && <ContextMenu />}
    </div>
    </ConfirmProvider>
  )
}

export default MainLayout
