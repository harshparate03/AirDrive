import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Top progress bar shown during route transitions / redirects
 * to reduce perceived latency. Listens to router location changes.
 */
const PageLoader = () => {
  const location = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // On every route change start a quick simulated progress animation
    setVisible(true)
    setProgress(15)

    const step = () => {
      setProgress(prev => {
        if (prev >= 90) return prev
        // Slow down as it approaches 90%
        const increment = prev < 50 ? 20 : prev < 75 ? 12 : 6
        return Math.min(prev + increment, 90)
      })
    }

    const timer = setInterval(step, 120)

    // Complete the bar shortly after the new page mounts
    const doneTimer = setTimeout(() => {
      setProgress(100)
      const hideTimer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      clearInterval(timer)
      return () => clearTimeout(hideTimer)
    }, 500)

    return () => {
      clearInterval(timer)
      clearTimeout(doneTimer)
    }
  }, [location.pathname, location.search])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-primary-500"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PageLoader
