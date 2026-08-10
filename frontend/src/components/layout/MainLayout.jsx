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

const MainLayout = () => {
  const dispatch = useDispatch()
  const { activeModal, contextMenu } = useSelector(state => state.ui)

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
