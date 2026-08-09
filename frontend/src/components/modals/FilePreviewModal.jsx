import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { HiX, HiDownload, HiShare, HiStar, HiExternalLink } from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'
import { downloadFile } from '../../services/api'
import { getFileIcon, formatFileSize } from '../../utils/fileUtils'
import toast from 'react-hot-toast'

const FilePreviewModal = () => {
  const dispatch = useDispatch()
  const { modalData: file } = useSelector(state => state.ui)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const mime = file?.mimeType || ''
  const canPreviewType = mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || mime.startsWith('text/') || mime === 'application/pdf'
  const canPreview = canPreviewType && (file?.size || 0) <= 25 * 1024 * 1024

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false
    if (!file?._id || !canPreview) return undefined
    setPreviewLoading(true)
    downloadFile(file._id)
      .then(res => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: file.mimeType }))
        setPreviewUrl(objectUrl)
      })
      .catch(() => toast.error('Preview could not be loaded'))
      .finally(() => !cancelled && setPreviewLoading(false))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file?._id, file?.mimeType, canPreview])

  if (!file) return null

  const Icon = getFileIcon(file.mimeType)

  const renderPreview = () => {
    if (previewLoading) return <div className="h-9 w-9 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />

    if (mime.startsWith('image/') && previewUrl) {
      return (
        <img
          src={previewUrl}
          alt={file.name}
          className="max-w-full max-h-[60vh] object-contain rounded-xl"
        />
      )
    }

    if (mime.startsWith('video/') && previewUrl) {
      return <video src={previewUrl} controls className="max-w-full max-h-[60vh] rounded-xl" />
    }

    if (mime.startsWith('audio/') && previewUrl) {
      return <audio src={previewUrl} controls className="w-full max-w-lg" />
    }

    if ((mime === 'application/pdf' || mime.startsWith('text/')) && previewUrl) {
      return <iframe src={previewUrl} title={file.name} className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white" />
    }

    return (
      <div className="text-center space-y-3">
        <Icon className="text-8xl mx-auto text-dark-300" />
        <p className="text-dark-500 text-sm">{canPreviewType && !canPreview ? 'Preview is disabled for files larger than 25 MB' : 'No preview available'}</p>
        {file.webViewLink && (
          <a href={file.webViewLink} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
            <HiExternalLink /> Open in Google Drive
          </a>
        )}
      </div>
    )
  }

  const handleDownload = async () => {
    try {
      const res = await downloadFile(file._id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = file.name; a.click()
      URL.revokeObjectURL(url)
    } catch { if (file.webContentLink) window.open(file.webContentLink) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-dark-700">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-dark-800 dark:text-dark-100 truncate">{file.name}</p>
            <p className="text-xs text-dark-400 mt-0.5">{formatFileSize(file.size)} · {file.mimeType}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleDownload} className="btn-ghost p-2" title="Download">
              <HiDownload />
            </button>
            <button onClick={() => dispatch(closeModal())} className="btn-ghost p-2">
              <HiX />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="p-8 flex items-center justify-center min-h-48 bg-slate-50 dark:bg-dark-900">
          {renderPreview()}
        </div>

        {/* Meta */}
        {file.aiTags?.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-dark-700">
            <p className="text-xs font-medium text-dark-500 mb-2">AI Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {file.aiTags.map(tag => (
                <span key={tag} className="badge bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default FilePreviewModal
