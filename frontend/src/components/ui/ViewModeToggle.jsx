import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { HiViewGrid, HiViewList } from 'react-icons/hi'
import { setViewMode } from '../../store/slices/uiSlice'

/**
 * Grid / List view toggle that persists to localStorage via the ui slice.
 * Reused only where file results can switch layout (Dashboard, MyDrive, Recent, Starred,
 * Shared, Search, Trash, Folder) so the preference is consistent.
 */
const ViewModeToggle = ({ className = '' }) => {
  const dispatch = useDispatch()
  const { viewMode } = useSelector(state => state.ui)

  return (
    <div className={`flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-dark-800 rounded-lg ${className}`}>
      <button
        onClick={() => dispatch(setViewMode('grid'))}
        title="Grid view"
        aria-label="Grid view"
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-all ${
          viewMode === 'grid'
            ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-dark-400 hover:text-dark-600 dark:hover:text-dark-200'
        }`}
      >
        <HiViewGrid className="text-base" />
      </button>
      <button
        onClick={() => dispatch(setViewMode('list'))}
        title="List view"
        aria-label="List view"
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-all ${
          viewMode === 'list'
            ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-dark-400 hover:text-dark-600 dark:hover:text-dark-200'
        }`}
      >
        <HiViewList className="text-base" />
      </button>
    </div>
  )
}

export default ViewModeToggle
