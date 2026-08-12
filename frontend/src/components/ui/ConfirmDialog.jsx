import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiExclamation, HiPhotograph, HiX } from 'react-icons/hi'

const ConfirmContext = createContext(null)

export const useConfirm = () => {
  const value = useContext(ConfirmContext)
  if (!value) throw new Error('useConfirm must be used inside ConfirmProvider')
  return value
}

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options) => new Promise(resolve => {
    resolver.current = resolve
    setDialog(typeof options === 'string' ? { message: options } : options)
  }), [])

  const finish = (result) => {
    resolver.current?.(result)
    resolver.current = null
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={() => finish(false)}>
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onMouseDown={e => e.stopPropagation()}
              className="card w-full max-w-md p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                  dialog.danger === false
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  {dialog.danger === false
                    ? <HiPhotograph className="text-xl text-primary-500" />
                    : <HiExclamation className="text-xl text-red-500" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="confirm-title" className="font-semibold text-dark-900 dark:text-white">{dialog.title || 'Please confirm'}</h2>
                  <p className="mt-1 text-sm text-dark-500 dark:text-dark-300">{dialog.message}</p>
                </div>
                <button onClick={() => finish(false)} className="btn-ghost p-1.5" aria-label="Close"><HiX /></button>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => finish(false)} className="btn-secondary">{dialog.cancelLabel || 'Cancel'}</button>
                <button autoFocus onClick={() => finish(true)} className={dialog.danger === false ? 'btn-primary' : 'rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600'}>
                  {dialog.confirmLabel || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}
