import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { openModal, toggleTheme } from '../store/slices/uiSlice'

/**
 * Global keyboard shortcuts for Air Drive
 * / or Ctrl+K  → focus search
 * N            → new folder (on My Drive)
 * U            → upload
 * D            → dark/light mode
 * Escape       → close modal / deselect
 * ?            → show shortcuts help
 */
const useKeyboardShortcuts = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      // Skip if typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return

      const { key, ctrlKey, metaKey } = e

      // Ctrl+K or / → focus search bar
      if ((ctrlKey || metaKey) && key === 'k') {
        e.preventDefault()
        document.querySelector('input[type="text"]')?.focus()
        return
      }
      if (key === '/' && !ctrlKey && !metaKey) {
        e.preventDefault()
        document.querySelector('header input[type="text"]')?.focus()
        return
      }

      // U → upload
      if (key === 'u' || key === 'U') {
        dispatch(openModal({ modal: 'upload' }))
        return
      }

      // N → new folder
      if (key === 'n' || key === 'N') {
        if (window.location.pathname.includes('my-drive') || window.location.pathname.includes('folder')) {
          dispatch(openModal({ modal: 'createFolder' }))
        }
        return
      }

      // D → toggle dark/light
      if (key === 'd' && !ctrlKey && !metaKey) {
        dispatch(toggleTheme())
        return
      }

      // ? → show keyboard shortcuts
      if (key === '?') {
        dispatch(openModal({ modal: 'shortcuts' }))
        return
      }

      // G then H → go home
      // G then D → go to My Drive
      // G then S → go to Starred
      // G then T → go to Trash
      if (key === 'g') {
        const listener = (e2) => {
          document.removeEventListener('keydown', listener)
          if (e2.key === 'h') navigate('/dashboard')
          else if (e2.key === 'd') navigate('/my-drive')
          else if (e2.key === 's') navigate('/starred')
          else if (e2.key === 't') navigate('/trash')
          else if (e2.key === 'a') navigate('/ai')
        }
        document.addEventListener('keydown', listener, { once: true })
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dispatch, navigate])
}

export default useKeyboardShortcuts
