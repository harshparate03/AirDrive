import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  HiArrowRight, HiX, HiCloudUpload, HiFolder,
  HiSparkles, HiShare, HiSearch,
} from 'react-icons/hi'

const STEPS = [
  {
    icon: HiCloudUpload,
    title: 'Welcome to Air Drive! 🎉',
    body: 'Your AI-powered cloud storage. Files are stored privately in AirDrive cloud storage and remain available across sessions.',
    color: 'from-primary-500 to-purple-600',
  },
  {
    icon: HiFolder,
    title: 'Organize with Folders',
    body: 'Create nested folders with custom colors. Drag & drop files to upload, or use the Upload button. Right-click any file for quick actions.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: HiSparkles,
    title: 'AI-Powered Features',
    body: 'Use AI to auto-tag files, suggest better names, summarize documents, chat with PDFs, and find duplicates — all from the AI Assistant page.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: HiShare,
    title: 'Easy Sharing',
    body: 'Share files with password protection, expiry dates, and QR codes. Create File Request links so others can upload directly to your AirDrive storage.',
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: HiSearch,
    title: 'Smart Search',
    body: 'Search by name, type, AI tags, or OCR text. Use AI Smart Search with natural language: "My PDF from last month" or "Images containing cars".',
    color: 'from-blue-500 to-cyan-500',
  },
]

const OnboardingTour = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user) return
    const key = `onboarded_${user._id}`
    if (!localStorage.getItem(key)) {
      setTimeout(() => setVisible(true), 1000)
    }
  }, [user])

  const finish = () => {
    if (user) localStorage.setItem(`onboarded_${user._id}`, '1')
    setVisible(false)
  }

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={finish}
          />

          {/* Card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto card w-full max-w-sm overflow-hidden shadow-glass-lg">
              {/* Gradient header */}
              <div className={`bg-gradient-to-br ${current.color} p-8 flex flex-col items-center text-white`}>
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4"
                >
                  <Icon className="text-3xl" />
                </motion.div>
                <h2 className="text-xl font-bold text-center">{current.title}</h2>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-dark-600 dark:text-dark-300 text-sm leading-relaxed text-center">
                  {current.body}
                </p>

                {/* Step dots */}
                <div className="flex items-center justify-center gap-1.5 my-5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`rounded-full transition-all ${
                        i === step
                          ? 'w-5 h-2 bg-primary-500'
                          : 'w-2 h-2 bg-slate-200 dark:bg-dark-600'
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button onClick={finish} className="btn-secondary flex-1 text-sm">
                    Skip Tour
                  </button>
                  {isLast ? (
                    <button
                      onClick={finish}
                      className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
                    >
                      Get Started <HiArrowRight />
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep(s => s + 1)}
                      className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
                    >
                      Next <HiArrowRight />
                    </button>
                  )}
                </div>

                <p className="text-center text-xs text-dark-400 mt-3">
                  {step + 1} of {STEPS.length}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default OnboardingTour
