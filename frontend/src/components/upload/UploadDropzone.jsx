import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { HiUpload } from 'react-icons/hi'
import useUpload from '../../hooks/useUpload'

const UploadDropzone = ({ children, folderId }) => {
  const { upload } = useUpload(folderId)
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback(async (acceptedFiles) => {
    setIsDragActive(false)
    if (acceptedFiles?.length) {
      await upload(acceptedFiles)
    }
  }, [upload])

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    noClick: true,
    multiple: true,
  })

  const active = isDragActive || dropzoneActive

  return (
    <div {...getRootProps()} className="relative w-full min-h-0 flex-1">
      <input {...getInputProps()} />
      {children}

      {/* Drag overlay */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-primary-500/20 backdrop-blur-sm border-4 border-dashed border-primary-500 pointer-events-none"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <HiUpload className="text-6xl text-primary-500 mb-3" />
            </motion.div>
            <p className="text-xl font-bold text-primary-700 dark:text-primary-300">
              Drop files to upload
            </p>
            <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
              All file types supported
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UploadDropzone
