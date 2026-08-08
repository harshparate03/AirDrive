import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HiX, HiChatAlt2, HiPaperAirplane, HiTrash,
  HiPencil, HiCheck, HiReply,
} from 'react-icons/hi'
import { closeModal } from '../../store/slices/uiSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'

const CommentItem = ({ comment, fileId, onReply, currentUserId }) => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/comments/${comment._id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', fileId] }),
  })

  const editMutation = useMutation({
    mutationFn: () => api.patch(`/comments/${comment._id}`, { text: editText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] })
      setEditing(false)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => api.patch(`/comments/${comment._id}`, { resolved: !comment.resolved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', fileId] }),
  })

  const isOwn = comment.userId?._id === currentUserId

  return (
    <div className={`p-3 rounded-xl ${comment.resolved ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2.5">
        <img
          src={comment.userId?.photo || `https://ui-avatars.com/api/?name=${comment.userId?.name}&background=6366f1&color=fff`}
          alt={comment.userId?.name}
          className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-dark-700 dark:text-dark-200">
              {comment.userId?.name}
            </span>
            <span className="text-xs text-dark-400">
              {new Date(comment.createdAt).toLocaleString()}
            </span>
            {comment.editedAt && (
              <span className="text-xs text-dark-400 italic">(edited)</span>
            )}
            {comment.resolved && (
              <span className="badge bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs">
                Resolved
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-1.5 flex gap-2">
              <input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="input text-sm py-1.5 flex-1"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') editMutation.mutate(); if (e.key === 'Escape') setEditing(false) }}
              />
              <button onClick={() => editMutation.mutate()} className="btn-primary px-3 py-1.5 text-xs">
                <HiCheck />
              </button>
            </div>
          ) : (
            <p className="text-sm text-dark-700 dark:text-dark-200 mt-1 leading-relaxed">{comment.text}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-dark-400 hover:text-primary-500 flex items-center gap-1 transition-colors"
            >
              <HiReply className="text-xs" /> Reply
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => resolveMutation.mutate()}
                  className="text-xs text-dark-400 hover:text-green-500 transition-colors"
                >
                  {comment.resolved ? 'Unresolve' : 'Resolve'}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-dark-400 hover:text-primary-500 transition-colors"
                >
                  <HiPencil className="text-xs" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  className="text-xs text-dark-400 hover:text-red-500 transition-colors"
                >
                  <HiTrash className="text-xs" />
                </button>
              </>
            )}
          </div>

          {/* Replies */}
          {comment.replies?.length > 0 && (
            <div className="mt-2 ml-2 pl-3 border-l-2 border-slate-100 dark:border-dark-700 space-y-2">
              {comment.replies.map(reply => (
                <div key={reply._id} className="flex items-start gap-2">
                  <img
                    src={reply.userId?.photo || `https://ui-avatars.com/api/?name=${reply.userId?.name}&background=6366f1&color=fff`}
                    alt={reply.userId?.name}
                    className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-semibold text-dark-700 dark:text-dark-200 mr-1.5">
                      {reply.userId?.name}
                    </span>
                    <span className="text-xs text-dark-700 dark:text-dark-200">{reply.text}</span>
                    <p className="text-xs text-dark-400 mt-0.5">
                      {new Date(reply.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const CommentsModal = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { modalData: file, user } = useSelector(s => ({ modalData: s.ui.modalData, user: s.auth.user }))
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['comments', file?._id],
    queryFn: () => api.get(`/comments/${file._id}`).then(r => r.data),
    enabled: !!file?._id,
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/comments/${file._id}`, {
      text,
      parentId: replyTo?._id || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', file._id] })
      setText('')
      setReplyTo(null)
      toast.success('Comment added')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  const comments = data?.comments || []
  const totalComments = comments.length + comments.reduce((s, c) => s + (c.replies?.length || 0), 0)

  if (!file) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="card w-full sm:max-w-lg h-[80vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-dark-700 flex-shrink-0">
          <HiChatAlt2 className="text-primary-500 text-lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-dark-800 dark:text-dark-100">Comments</h2>
            <p className="text-xs text-dark-400 truncate">{file.name} · {totalComments} comment{totalComments !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1.5 text-dark-400">
            <HiX />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          )}
          {!isLoading && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HiChatAlt2 className="text-4xl text-dark-300 mb-3" />
              <p className="text-sm text-dark-500">No comments yet</p>
              <p className="text-xs text-dark-400 mt-1">Be the first to comment on this file</p>
            </div>
          )}
          {comments.map(comment => (
            <motion.div
              key={comment._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <CommentItem
                comment={comment}
                fileId={file._id}
                onReply={setReplyTo}
                currentUserId={user?._id}
              />
              {comments.indexOf(comment) < comments.length - 1 && (
                <div className="border-b border-slate-50 dark:border-dark-800 mx-3" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 dark:border-dark-700 p-4 flex-shrink-0">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-xs text-primary-600 dark:text-primary-400">
              <HiReply />
              Replying to <strong>{replyTo.userId?.name}</strong>
              <button onClick={() => setReplyTo(null)} className="ml-auto"><HiX /></button>
            </div>
          )}
          <div className="flex gap-2">
            <img
              src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`}
              alt={user?.name}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div className="flex-1 flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); addMutation.mutate() } }}
                placeholder={replyTo ? `Reply to ${replyTo.userId?.name}...` : 'Add a comment...'}
                className="input flex-1 text-sm py-2"
              />
              <button
                onClick={() => addMutation.mutate()}
                disabled={!text.trim() || addMutation.isPending}
                className="btn-primary px-3"
              >
                {addMutation.isPending
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <HiPaperAirplane className="rotate-90" />
                }
              </button>
            </div>
          </div>
          <p className="text-xs text-dark-400 mt-1.5 ml-10">Press Enter to send</p>
        </div>
      </motion.div>
    </div>
  )
}

export default CommentsModal
