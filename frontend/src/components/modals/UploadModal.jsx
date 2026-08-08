import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { HiX, HiUpload, HiFolderOpen, HiDocument, HiCheck } from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'
import useUpload from '../../hooks/useUpload'

const UploadModal = () => {
  const dispatch = useDispatch()
  const { modalData } = useSelector(s => s.ui)
  const folderId = modalData?.folderId || null
  const { upload } = useUpload(folderId)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef(null)
  const folderRef = useRef(null)

  const handleFiles = (files) => {
    setSelectedFiles(prev => [...prev, ...Array.from(files)])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (!selectedFiles.length) return
    setUploading(true)
    await upload(selectedFiles)
    setUploading(false)
    setDone(true)
    setTimeout(() => dispatch(closeModal()), 1200)
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-100 dark:border-dark-700">
          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <HiUpload className="text-primary-500 text-lg" />
          </div>
          <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100 flex-1">
            Upload Files
          </h2>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1.5 text-dark-400">
            <HiX />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-dark-600 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-dark-800'
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            <motion.div
              animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <HiUpload className="text-3xl text-primary-500" />
              </div>
              <p className="font-medium text-dark-700 dark:text-dark-200">
                {dragOver ? 'Drop here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-sm text-dark-400">All file types · Up to 5 GB each</p>
            </motion.div>
          </div>

          {/* Folder upload */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-100 dark:border-dark-700" />
            <span className="text-xs text-dark-400">or</span>
            <div className="flex-1 border-t border-slate-100 dark:border-dark-700" />
          </div>
          <button
            onClick={() => folderRef.current?.click()}
            className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
          >
            <HiFolderOpen /> Upload Folder
          </button>
          <input
            ref={folderRef}
            type="file"
            multiple
            className="hidden"
            // @ts-ignore
            webkitdirectory=""
            onChange={e => handleFiles(e.target.files)}
          />

          {/* Selected files list */}
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 max-h-40 overflow-y-auto"
              >
                <p className="text-xs font-medium text-dark-500 dark:text-dark-400 mb-2">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </p>
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-dark-800 group">
                    <HiDocument className="text-primary-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-dark-700 dark:text-dark-200 truncate">{file.name}</p>
                      <p className="text-xs text-dark-400">{formatSize(file.size)}</p>
                    </div>
                    {!uploading && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-red-400 transition-all p-0.5"
                      >
                        <HiX className="text-xs" />
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={() => dispatch(closeModal())}
            className="btn-secondary flex-1"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFiles.length || uploading || done}
            className={`btn-primary flex-1 flex items-center justify-center gap-2 ${
              done ? 'bg-green-500 hover:bg-green-500' : ''
            }`}
          >
            {done ? (
              <><HiCheck /> Done</>
            ) : uploading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
            ) : (
              <><HiUpload /> Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default UploadModal
