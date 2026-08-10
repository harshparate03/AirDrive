import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { HiUpload } from 'react-icons/hi'
import useUpload from '../../hooks/useUpload'

const QuickUpload = ({ folderId = null }) => {
  const { upload } = useUpload(folderId)
  const inputRef = useRef(null)

  const handleChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length) await upload(files)
    inputRef.current.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
        aria-label="Upload files"
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        className="touch-target flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 hover:shadow-neon active:scale-95 sm:px-4"
        aria-label="Quick upload files"
      >
        <HiUpload className="text-lg" />
        <span className="hidden sm:inline">Quick Upload</span>
      </motion.button>
    </>
  )
}

export default QuickUpload
