import React, { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { HiInbox, HiUpload, HiDocument, HiCheck, HiCloudUpload, HiX } from 'react-icons/hi'
import api from '../services/api'
import toast from 'react-hot-toast'

const PublicRequestPage = () => {
  const { token } = useParams()
  const [files, setFiles] = useState([])
  const [email, setEmail] = useState('')
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['file-request-public', token],
    queryFn: () => api.get(`/file-requests/${token}`).then(r => r.data),
    retry: false,
  })

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped])
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const handleUpload = async () => {
    if (!files.length) return
    setUploading(true)
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    if (email) formData.append('email', email)

    try {
      await api.post(`/file-requests/${token}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDone(true)
      toast.success('Files uploaded successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    }
    setUploading(false)
  }

  const request = data?.request

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !request) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950 p-4">
      <div className="card p-8 text-center max-w-sm w-full">
        <HiInbox className="text-5xl text-dark-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-dark-800 dark:text-dark-100 mb-2">Request Not Found</h2>
        <p className="text-dark-400 text-sm">This file request doesn't exist or has expired.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <HiCloudUpload className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Air Drive · File Request</p>
              <p className="text-xs opacity-60">from {request.userId?.name}</p>
            </div>
          </div>
          <h1 className="text-xl font-bold mt-3">{request.title}</h1>
          {request.description && (
            <p className="text-sm opacity-80 mt-1">{request.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs opacity-70">
            <span>Max {request.maxFiles} files</span>
            <span>·</span>
            <span>Up to {request.maxSizeMB}MB each</span>
            {request.expiresAt && <><span>·</span><span>Expires {new Date(request.expiresAt).toLocaleDateString()}</span></>}
          </div>
        </div>

        {done ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <HiCheck className="text-3xl text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-dark-800 dark:text-dark-100">Files Uploaded!</h2>
            <p className="text-dark-400 text-sm mt-1">
              {files.length} file{files.length > 1 ? 's' : ''} sent to {request.userId?.name}
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">
                Your email (optional)
              </label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" type="email" className="input" />
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-dark-600 hover:border-primary-400'
              }`}
            >
              <input ref={inputRef} type="file" multiple className="hidden"
                onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
              <HiUpload className="text-3xl text-primary-400 mx-auto mb-2" />
              <p className="font-medium text-dark-700 dark:text-dark-200">
                {dragOver ? 'Drop here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                Up to {request.maxFiles} files · {request.maxSizeMB}MB each
              </p>
            </div>

            {/* Selected files */}
            {files.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-dark-800">
                    <HiDocument className="text-primary-400 flex-shrink-0" />
                    <span className="text-xs text-dark-700 dark:text-dark-200 flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-dark-400">{formatSize(f.size)}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, fi) => fi !== i))}
                      className="text-dark-400 hover:text-red-400 p-0.5">
                      <HiX className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleUpload} disabled={!files.length || uploading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {uploading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                : <><HiUpload /> Upload {files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : ''}</>
              }
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default PublicRequestPage
