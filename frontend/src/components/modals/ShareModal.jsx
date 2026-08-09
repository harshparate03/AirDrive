import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { useMutation } from '@tanstack/react-query'
import { HiX, HiLink, HiLockClosed, HiMail, HiQrcode, HiCheck, HiShare } from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ShareModal = () => {
  const dispatch = useDispatch()
  const { modalData: item } = useSelector(s => s.ui)
  const isFolder = item?.type === 'folder'
  const permission = 'viewer'
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [downloadDisabled, setDownloadDisabled] = useState(false)
  const [email, setEmail] = useState('')
  const [allowedEmails, setAllowedEmails] = useState('')
  const [createdLink, setCreatedLink] = useState(null)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('link') // link | email | qr

  const createMutation = useMutation({
    mutationFn: () => api.post('/share', {
      ...(isFolder ? { folderId: item?._id } : { fileId: item?._id }),
      permission,
      password: password || undefined,
      expiresAt: expiresAt || undefined,
      downloadDisabled,
      allowedEmails: allowedEmails.split(',').map(value => value.trim()).filter(Boolean),
    }),
    onSuccess: (res) => {
      setCreatedLink(res.data)
      toast.success('Share link created')
    },
    onError: () => toast.error('Failed to create share link'),
  })

  const emailMutation = useMutation({
    mutationFn: () => api.post('/share/email', {
      email,
      shareLinkId: createdLink?.shareLink?._id,
    }),
    onSuccess: () => { toast.success(`Invitation sent to ${email}`); setEmail('') },
    onError: () => toast.error('Failed to send email'),
  })

  const copyLink = () => {
    const url = `${window.location.origin}/share/${createdLink?.shareLink?.token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied!')
  }

  const shareUrl = createdLink ? `${window.location.origin}/share/${createdLink.shareLink?.token}` : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-dark-700">
          <HiShare className="text-primary-500 text-xl" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Share File</h2>
            <p className="text-xs text-dark-400 truncate">{item?.name}</p>
          </div>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1.5"><HiX /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Permission */}
          <div>
            <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-2">Access Level</label>
            <div className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-700 dark:border-primary-700/50 dark:bg-primary-900/20 dark:text-primary-300">Viewer access</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-500 mb-1">Restrict to emails (optional, comma separated)</label>
            <input value={allowedEmails} onChange={e => setAllowedEmails(e.target.value)} placeholder="person@example.com" className="input text-sm py-2" />
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-500 mb-1 flex items-center gap-1">
                <HiLockClosed className="text-xs" /> Password (optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Set password"
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-500 mb-1">Expiry (optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="input text-sm py-2"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={downloadDisabled}
              onChange={e => setDownloadDisabled(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-600"
            />
            <span className="text-sm text-dark-600 dark:text-dark-300">Disable download</span>
          </label>

          {/* Create link */}
          {!createdLink ? (
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <HiLink /> {createMutation.isPending ? 'Creating...' : 'Create Share Link'}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-dark-800 rounded-xl">
                {[['link', 'Link'], ['email', 'Email'], ['qr', 'QR Code']].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tab === id ? 'bg-white dark:bg-dark-700 shadow-sm text-dark-800 dark:text-dark-100' : 'text-dark-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Link tab */}
              {tab === 'link' && (
                <div className="flex gap-2">
                  <input readOnly value={shareUrl} className="input text-xs flex-1 bg-slate-50 dark:bg-dark-800" />
                  <button onClick={copyLink} className={`btn-primary px-4 text-sm flex items-center gap-1 ${copied ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                    {copied ? <HiCheck /> : <HiLink />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Email tab */}
              {tab === 'email' && (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="input text-sm flex-1"
                  />
                  <button
                    onClick={() => emailMutation.mutate()}
                    disabled={!email || emailMutation.isPending}
                    className="btn-primary px-4 text-sm flex items-center gap-1"
                  >
                    <HiMail /> Send
                  </button>
                </div>
              )}

              {/* QR tab */}
              {tab === 'qr' && createdLink?.shareLink?.qrCode && (
                <div className="flex flex-col items-center gap-3">
                  <img src={createdLink.shareLink.qrCode} alt="QR Code" className="w-40 h-40 rounded-xl" />
                  <a
                    href={createdLink.shareLink.qrCode}
                    download="airdrive-qr.png"
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <HiQrcode /> Download QR Code
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ShareModal
