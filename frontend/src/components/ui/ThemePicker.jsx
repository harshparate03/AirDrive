import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { HiCheck } from 'react-icons/hi'

const THEMES = [
  { id: 'violet',  label: 'Violet',  primary: '#6366f1', gradient: 'from-violet-500 to-purple-600' },
  { id: 'blue',    label: 'Blue',    primary: '#3b82f6', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'emerald', label: 'Emerald', primary: '#10b981', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'rose',    label: 'Rose',    primary: '#f43f5e', gradient: 'from-rose-500 to-pink-500' },
  { id: 'amber',   label: 'Amber',   primary: '#f59e0b', gradient: 'from-amber-500 to-orange-500' },
  { id: 'slate',   label: 'Slate',   primary: '#64748b', gradient: 'from-slate-500 to-gray-600' },
]

const CSS_VARS = {
  violet:  { '--color-primary': '99 102 241' },
  blue:    { '--color-primary': '59 130 246' },
  emerald: { '--color-primary': '16 185 129' },
  rose:    { '--color-primary': '244 63 94' },
  amber:   { '--color-primary': '245 158 11' },
  slate:   { '--color-primary': '100 116 139' },
}

const applyTheme = (themeId) => {
  const vars = CSS_VARS[themeId]
  if (!vars) return
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value)
  })
  localStorage.setItem('colorTheme', themeId)
}

export const initTheme = () => {
  const saved = localStorage.getItem('colorTheme') || 'violet'
  applyTheme(saved)
}

const ThemePicker = () => {
  const currentTheme = localStorage.getItem('colorTheme') || 'violet'
  const [selected, setSelected] = React.useState(currentTheme)

  const handleSelect = (themeId) => {
    setSelected(themeId)
    applyTheme(themeId)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">Color Theme</p>
      <div className="flex flex-wrap gap-2">
        {THEMES.map(theme => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(theme.id)}
            title={theme.label}
            className="relative w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)` }}
          >
            {selected === theme.id && (
              <HiCheck className="text-white text-sm font-bold drop-shadow" />
            )}
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-dark-400 capitalize">{THEMES.find(t => t.id === selected)?.label} theme active</p>
    </div>
  )
}

export default ThemePicker
