import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HiX, HiDownload, HiExternalLink } from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'
import api, { downloadFile } from '../../services/api'
import { getFileIcon, formatFileSize } from '../../utils/fileUtils'
import { saveFileResponse } from '../../utils/fileActions'
import toast from 'react-hot-toast'

const FilePreviewModal = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { modalData: file } = useSelector(state => state.ui)
  const [aiTags, setAiTags] = useState(file?.aiTags || [])
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewInfo, setPreviewInfo] = useState(null)
  const mime = file?.mimeType || ''
  const canPreviewType = mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || mime.startsWith('text/') || mime === 'application/pdf'
  const canPreview = canPreviewType && (file?.size || 0) <= 25 * 1024 * 1024

  const removeTags = useMutation({
    mutationFn: (tag) => api.delete('/ai/tags', { data: { fileId: file._id, tag: tag || undefined } }),
    onSuccess: (response) => {
      setAiTags(response.data.tags || [])
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['files-for-ai'] })
      toast.success(response.data.tags?.length ? 'AI tag removed' : 'AI tags removed')
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Could not remove AI tag'),
  })

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

  useEffect(() => {
    if (!file?._id) return
    api.get(`/files/${file._id}/preview-info`)
      .then(response => setPreviewInfo(response.data.preview))
      .catch(() => setPreviewInfo({ fallback: 'download', text: '', webViewLink: '' }))
  }, [file?._id])

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

    if (previewInfo?.text) {
      return (
        <div className="w-full max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 text-left text-sm leading-6 text-dark-700 whitespace-pre-wrap dark:border-dark-700 dark:bg-dark-800 dark:text-dark-200">
          {previewInfo.text}
        </div>
      )
    }

    return (
      <div className="text-center space-y-3">
        <Icon className="text-8xl mx-auto text-dark-300" />
        {previewInfo?.available === false ? (
          <p className="text-red-500 text-sm">This legacy file is no longer present in storage. Please upload it again.</p>
        ) : (
          <>
            <p className="text-dark-500 text-sm">{canPreviewType && !canPreview ? 'This file is too large for an in-app preview.' : 'This binary format cannot be displayed by the browser.'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {(previewInfo?.webViewLink || file.webViewLink) && <button onClick={handleOpen} className="btn-primary inline-flex items-center gap-2"><HiExternalLink /> Open in Google Drive</button>}
              <button onClick={handleDownload} className="btn-secondary inline-flex items-center gap-2"><HiDownload /> Download File</button>
            </div>
          </>
        )}
      </div>
    )
  }

  const handleOpen = async () => {
    const viewerLink = previewInfo?.webViewLink || file.webViewLink
    if (viewerLink) {
      window.open(viewerLink, '_blank', 'noopener,noreferrer')
      return
    }

    toast.error('No external viewer is available for this file. Use Download File instead.')
  }

  const handleDownload = async () => {
    try {
      const res = await downloadFile(file._id)
      saveFileResponse(res, file.name)
    } catch { toast.error('File could not be downloaded. Re-upload it if it was stored before persistent Drive storage was enabled.') }
  }

  return (
    <div className="modal-backdrop bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-surface card w-full max-w-2xl overflow-hidden"
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
        {aiTags.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-dark-700">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-dark-500">AI Tags</p>
              <button type="button" onClick={() => removeTags.mutate(null)} disabled={removeTags.isPending} className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50">Remove all</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {aiTags.map(tag => (
                <span key={tag} className="badge flex items-center gap-1 bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <span>{tag}</span>
                  <button type="button" onClick={() => removeTags.mutate(tag)} disabled={removeTags.isPending} className="rounded-full p-0.5 hover:bg-primary-100 disabled:opacity-50 dark:hover:bg-primary-900/50" aria-label={`Remove ${tag} tag`}><HiX className="text-[10px]" /></button>
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
