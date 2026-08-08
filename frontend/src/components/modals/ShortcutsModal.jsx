import React from 'react'
import { motion } from 'framer-motion'
import { useDispatch } from 'react-redux'
import { HiX, HiLightningBolt } from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'

const shortcuts = [
  { keys: ['/', 'Ctrl', 'K'], label: 'Focus search' },
  { keys: ['U'], label: 'Upload files' },
  { keys: ['N'], label: 'New folder' },
  { keys: ['D'], label: 'Toggle dark mode' },
  { keys: ['?'], label: 'Show shortcuts' },
  { divider: true, label: 'Navigation' },
  { keys: ['G', 'H'], label: 'Go to Home' },
  { keys: ['G', 'D'], label: 'Go to My Drive' },
  { keys: ['G', 'S'], label: 'Go to Starred' },
  { keys: ['G', 'T'], label: 'Go to Trash' },
  { keys: ['G', 'A'], label: 'Go to AI Assistant' },
  { divider: true, label: 'Files' },
  { keys: ['Enter'], label: 'Open / Preview selected' },
  { keys: ['Del', 'Backspace'], label: 'Move to trash' },
  { keys: ['Esc'], label: 'Close modal / Deselect' },
]

const Kbd = ({ children }) => (
  <kbd className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 text-xs font-mono font-medium border border-slate-200 dark:border-dark-600">
    {children}
  </kbd>
)

const ShortcutsModal = () => {
  const dispatch = useDispatch()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-dark-700">
          <HiLightningBolt className="text-primary-500 text-lg" />
          <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100 flex-1">Keyboard Shortcuts</h2>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1.5 text-dark-400"><HiX /></button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-1">
          {shortcuts.map((s, i) => {
            if (s.divider) return (
              <p key={i} className="text-xs font-semibold text-dark-400 uppercase tracking-wider pt-3 pb-1 first:pt-0">
                {s.label}
              </p>
            )
            return (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-dark-600 dark:text-dark-300">{s.label}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k, ki) => (
                    <React.Fragment key={ki}>
                      {ki > 0 && <span className="text-dark-300 text-xs">then</span>}
                      <Kbd>{k}</Kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

export default ShortcutsModal
