import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  HiInbox, HiPlus, HiLink, HiTrash, HiClock,
  HiUpload, HiX, HiCheck, HiDocument,
} from 'react-icons/hi'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useConfirm } from '../components/ui/ConfirmDialog'

const CreateRequestModal = ({ onClose, onCreated }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    maxFiles: 10,
    maxSizeMB: 100,
    expiresAt: '',
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/file-requests', form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['file-requests'] })
      toast.success('File request created!')
      onCreated?.(res.data)
      onClose()
    },
    onError: () => toast.error('Failed to create request'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-h-[calc(100dvh-1rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-b-none p-4 sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center gap-3">
          <HiInbox className="text-primary-500 text-xl" />
          <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100 flex-1">New File Request</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><HiX /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Submit your assignment" className="input" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Instructions for uploaders..." rows={2} className="input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">Max files</label>
              <input type="number" min={1} max={50} value={form.maxFiles}
                onChange={e => setForm(f => ({ ...f, maxFiles: parseInt(e.target.value) }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">Max size (MB)</label>
              <input type="number" min={1} max={5000} value={form.maxSizeMB}
                onChange={e => setForm(f => ({ ...f, maxSizeMB: parseInt(e.target.value) }))} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">Expiry (optional)</label>
            <input type="datetime-local" value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="input" />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => createMutation.mutate()}
            disabled={!form.title.trim() || createMutation.isPending} className="btn-primary flex-1">
            {createMutation.isPending ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const FileRequestPage = () => {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['file-requests'],
    queryFn: () => api.get('/file-requests').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/file-requests/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['file-requests'] }); toast.success('Request deactivated') },
  })

  const copyLink = (token) => {
    const url = `${window.location.origin}/request/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    toast.success('Link copied!')
    setTimeout(() => setCopied(null), 2000)
  }

  const requests = data?.requests || []

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark-900 dark:text-white">File Requests</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-0.5">
            Create a link so others can upload files directly to your Drive
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
          <HiPlus /> New Request
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
            <HiInbox className="text-4xl text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200 mb-1">No file requests yet</h3>
          <p className="text-dark-400 text-sm mb-4">Create a request link to collect files from anyone</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <HiPlus /> Create Your First Request
          </button>
        </motion.div>
      )}

      <div className="space-y-3">
        {requests.map((req, i) => (
          <motion.div key={req._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`card p-5 ${!req.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <HiInbox className="text-primary-500 text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-dark-800 dark:text-dark-100">{req.title}</h3>
                  {!req.isActive && <span className="badge bg-slate-100 dark:bg-dark-700 text-dark-400 text-xs">Inactive</span>}
                  {req.expiresAt && new Date(req.expiresAt) < new Date() && (
                    <span className="badge bg-red-100 dark:bg-red-900/30 text-red-500 text-xs">Expired</span>
                  )}
                </div>
                {req.description && <p className="text-sm text-dark-500 dark:text-dark-400 mt-0.5">{req.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-dark-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <HiUpload className="text-xs" /> {req.uploads?.length || 0} / {req.maxFiles} uploads
                  </span>
                  <span className="flex items-center gap-1">
                    <HiDocument className="text-xs" /> Max {req.maxSizeMB}MB/file
                  </span>
                  {req.expiresAt && (
                    <span className="flex items-center gap-1">
                      <HiClock className="text-xs" /> Expires {new Date(req.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                  <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => copyLink(req.token)}
                  className={`btn-secondary text-sm flex items-center gap-1.5 ${copied === req.token ? 'text-green-500 border-green-300' : ''}`}>
                  {copied === req.token ? <><HiCheck /> Copied</> : <><HiLink /> Copy Link</>}
                </button>
                <button onClick={async () => { if (await confirm({ title: 'Deactivate request?', message: 'This upload link will stop accepting files.', confirmLabel: 'Deactivate' })) deleteMutation.mutate(req._id) }}
                  className="btn-ghost p-2 text-red-400 hover:text-red-500">
                  <HiTrash />
                </button>
              </div>
            </div>

            {/* Recent uploads */}
            {req.uploads?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-dark-700">
                <p className="text-xs font-medium text-dark-500 mb-2">Recent Uploads</p>
                <div className="space-y-1.5">
                  {req.uploads.slice(-3).reverse().map((u, ui) => (
                    <div key={ui} className="flex items-center gap-2 text-xs text-dark-500">
                      <HiDocument className="text-primary-400 flex-shrink-0" />
                      <span className="truncate flex-1">{u.name}</span>
                      <span className="text-dark-400 flex-shrink-0">{u.uploaderEmail}</span>
                    </div>
                  ))}
                  {req.uploads.length > 3 && (
                    <p className="text-xs text-primary-500">+{req.uploads.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {showCreate && <CreateRequestModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

export default FileRequestPage
