import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { HiDownload, HiLockClosed, HiFolder, HiExternalLink, HiCloudUpload, HiEye } from 'react-icons/hi'
import api, { shareDownload, sharePreviewUrl } from '../services/api'
import { getFileIcon, formatFileSize } from '../utils/fileUtils'

const SharedFilePage = () => {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shared', token, password],
    queryFn: () => api.get(`/share/${token}`, { params: password ? { password } : {} }).then(r => r.data),
    retry: false,
  })

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPasswordError('')
    setPassword(passwordInput)
  }

  const needsPassword = error?.response?.data?.passwordRequired
  const isExpired = error?.response?.status === 410
  const notFound = error?.response?.status === 404

  const shareLink = data?.shareLink
  const content = data?.content

  if (isExpired) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-950">
      <div className="card p-8 text-center max-w-sm mx-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <HiCloudUpload className="text-3xl text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-dark-800 dark:text-dark-100 mb-2">Link Expired</h2>
        <p className="text-dark-400 text-sm">This share link has expired.</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-950">
      <div className="card p-8 text-center max-w-sm mx-4">
        <h2 className="text-lg font-bold text-dark-800 dark:text-dark-100 mb-2">Not Found</h2>
        <p className="text-dark-400 text-sm">This share link doesn't exist or has been revoked.</p>
      </div>
    </div>
  )

  if (needsPassword || (error?.response?.status === 401 && !password)) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-8 w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
            <HiLockClosed className="text-2xl text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-dark-800 dark:text-dark-100">Password Protected</h2>
          <p className="text-dark-400 text-sm mt-1">Enter the password to access this file</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            className="input"
            autoFocus
          />
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          <button type="submit" className="btn-primary w-full">Access File</button>
        </form>
      </motion.div>
    </div>
  )

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-950">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const file = content?.file || content?.folder
  const Icon = content?.file ? getFileIcon(content.file.mimeType) : HiFolder

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-100 dark:border-dark-700">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <HiCloudUpload className="text-primary-500 text-xl" />
          </div>
          <div>
            <p className="font-bold text-primary-600 dark:text-primary-400">Air Drive</p>
            <p className="text-xs text-dark-400">Shared file</p>
          </div>
        </div>

        {/* File info */}
        <div className="p-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-dark-800 mb-5">
            <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Icon className="text-3xl text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-dark-800 dark:text-dark-100 truncate">
                {content?.file?.name || content?.folder?.name || 'Shared item'}
              </p>
              {content?.file && (
                <p className="text-sm text-dark-400 mt-0.5">
                  {formatFileSize(content.file.size)} · {content.file.mimeType}
                </p>
              )}
              {content?.files && (
                <p className="text-sm text-dark-400 mt-0.5">{content.files.length} files in folder</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-dark-400 mb-5">
            <span className="capitalize badge bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              {shareLink?.permission} access
            </span>
            {shareLink?.downloadDisabled && (
              <span className="badge bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                Download disabled
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {content?.file && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await shareDownload(token, password)
                    const url = URL.createObjectURL(new Blob([res.data]))
                    const a = document.createElement('a')
                    a.href = url
                    a.download = content.file.name
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch {
                    if (content.file.webContentLink) window.open(content.file.webContentLink)
                  }
                }}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <HiDownload /> Download File
              </button>
            )}

            {/* Inline preview for previewable types */}
            {content?.file && (
              <button
                type="button"
                onClick={() => window.open(sharePreviewUrl(token, password), '_blank')}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <HiEye /> Preview File
              </button>
            )}
          </div>

          {/* Inline embedded preview */}
          {content?.file && (['image/', 'video/', 'audio/'].some(p => content.file.mimeType.startsWith(p)) || content.file.mimeType === 'application/pdf') && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Preview</p>
              {content.file.mimeType.startsWith('image/') && (
                <img
                  src={sharePreviewUrl(token, password)}
                  alt={content.file.name}
                  className="w-full max-h-80 object-contain rounded-xl bg-slate-50 dark:bg-dark-800"
                />
              )}
              {content.file.mimeType.startsWith('video/') && (
                <video controls className="w-full max-h-80 rounded-xl bg-black" src={sharePreviewUrl(token, password)} />
              )}
              {content.file.mimeType.startsWith('audio/') && (
                <audio controls className="w-full" src={sharePreviewUrl(token, password)} />
              )}
              {content.file.mimeType === 'application/pdf' && (
                <iframe
                  src={sharePreviewUrl(token, password)}
                  title={content.file.name}
                  className="w-full h-80 rounded-xl border border-slate-100 dark:border-dark-700"
                />
              )}
            </div>
          )}

          {/* Folder contents */}
          {content?.files && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Files in this folder</p>
              {content.files.slice(0, 10).map(f => {
                const FIcon = getFileIcon(f.mimeType)
                return (
                  <div key={f._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-800">
                    <FIcon className="text-primary-400 flex-shrink-0" />
                    <span className="text-sm text-dark-700 dark:text-dark-200 flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-dark-400">{formatFileSize(f.size)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default SharedFilePage
