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
        className="btn-primary flex items-center gap-2"
      >
        <HiUpload className="text-lg" />
        Quick Upload
      </motion.button>
    </>
  )
}

export default QuickUpload
