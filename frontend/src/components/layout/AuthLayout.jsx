import React from 'react'
import { motion } from 'framer-motion'

const AuthLayout = ({ children }) => {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-x-hidden bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950 px-3 py-6 sm:px-4">
      {/* Animated blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/2 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  )
}

export default AuthLayout
