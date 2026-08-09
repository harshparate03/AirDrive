import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiCloudUpload, HiSparkles, HiShieldCheck, HiLightningBolt, HiMail, HiLockClosed, HiEye, HiEyeOff, HiClock } from 'react-icons/hi'
import { login } from '../store/slices/authSlice'
import toast from 'react-hot-toast'

const features = [
  { icon: HiCloudUpload, title: 'Secure Cloud Storage', desc: 'Store and access your files from anywhere' },
  { icon: HiSparkles, title: 'AI-Powered', desc: 'Smart tags, OCR, auto-rename, and intelligent search' },
  { icon: HiShieldCheck, title: 'Secure Sharing', desc: 'Password-protected links with expiry and access control' },
  { icon: HiLightningBolt, title: 'Lightning Fast', desc: 'Real-time sync with drag & drop uploads' },
]

const LoginPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector(state => state.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      const loggedInUser = await dispatch(login({ email, password })).unwrap()
      toast.success('Welcome to Air Drive!')
      navigate(loggedInUser?.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      toast.error(err || 'Login failed. Please try again.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-8 text-white"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-neon mb-4"
        >
          <HiCloudUpload className="text-3xl text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-dark-900 dark:text-white">Air Drive</h1>
        <p className="text-dark-500 dark:text-dark-300 mt-1">AI-Powered Cloud Storage</p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="p-3 rounded-xl bg-slate-50 dark:bg-dark-700/50"
          >
            <f.icon className="text-primary-500 text-xl mb-1" />
            <p className="text-xs font-semibold text-dark-800 dark:text-dark-200">{f.title}</p>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Sign in form */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-8">
        <p className="text-center text-sm text-dark-500 dark:text-dark-400">
          Sign in to get started
        </p>

        <div>
          <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
            Email
          </label>
          <div className="relative">
            <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
            Password
          </label>
          <div className="relative">
<HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <HiEyeOff /> : <HiEye />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-primary-500 hover:text-primary-600 font-medium">
            Forgot password?
          </Link>
        </div>

{error && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
            error.toLowerCase().includes('attempts') || error.toLowerCase().includes('locked') || error.toLowerCase().includes('try again later')
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}>
            <HiClock className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-dark-500 dark:text-dark-400 mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary-500 hover:text-primary-600 font-medium">
          Sign up
        </Link>
      </p>

      <p className="text-center text-xs text-dark-400 dark:text-dark-500 mt-4">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </motion.div>
  )
}

export default LoginPage
