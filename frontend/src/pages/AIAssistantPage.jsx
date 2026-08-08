import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiSparkles, HiPaperAirplane, HiDocument, HiTag, HiSearch,
  HiDuplicate, HiFolder, HiLightningBolt, HiRefresh, HiX,
} from 'react-icons/hi'
import api from '../services/api'
import toast from 'react-hot-toast'

const AI_FEATURES = [
  { id: 'chat', icon: HiSparkles, label: 'AI Chat', desc: 'Chat with your files or get general help' },
  { id: 'summary', icon: HiDocument, label: 'Summarize', desc: 'Summarize, explain, or extract key points' },
  { id: 'tags', icon: HiTag, label: 'Auto Tags', desc: 'Generate AI tags for your files' },
  { id: 'rename', icon: HiLightningBolt, label: 'Smart Rename', desc: 'AI suggests meaningful filenames' },
  { id: 'search', icon: HiSearch, label: 'Smart Search', desc: 'Search with natural language' },
  { id: 'duplicates', icon: HiDuplicate, label: 'Find Duplicates', desc: 'Detect similar or duplicate files' },
  { id: 'folders', icon: HiFolder, label: 'Folder Suggestions', desc: 'AI recommends how to organize files' },
]

const Message = ({ msg }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    {msg.role === 'assistant' && (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <HiSparkles className="text-white text-sm" />
      </div>
    )}
    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
      msg.role === 'user'
        ? 'bg-primary-600 text-white rounded-br-sm'
        : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 border border-slate-100 dark:border-dark-700 rounded-bl-sm'
    }`}>
      {msg.content}
    </div>
  </motion.div>
)

const AIAssistantPage = () => {
  const [activeFeature, setActiveFeature] = useState('chat')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your Air Drive AI assistant. I can help you chat with files, summarize documents, find duplicates, suggest folder organization, and much more. What would you like to do?' }
  ])
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [smartSearchQuery, setSmartSearchQuery] = useState('')
  const [smartResults, setSmartResults] = useState(null)
  const messagesEndRef = useRef(null)

  const { data: filesData } = useQuery({
    queryKey: ['files-for-ai'],
    queryFn: () => api.get('/files').then(r => r.data),
  })

  const chatMutation = useMutation({
    mutationFn: (data) => api.post('/ai/chat', data),
    onSuccess: (res) => {
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    },
    onError: () => toast.error('AI chat failed. Check your API key.'),
  })

  const tagsMutation = useMutation({
    mutationFn: (fileId) => api.post('/ai/tags', { fileId }),
    onSuccess: (res) => toast.success(`Generated ${res.data.tags.length} tags`),
    onError: () => toast.error('Tag generation failed'),
  })

  const renameMutation = useMutation({
    mutationFn: (fileId) => api.post('/ai/rename', { fileId }),
    onSuccess: (res) => {
      toast.success(`Suggested name: ${res.data.suggestedName}`)
    },
    onError: () => toast.error('Rename suggestion failed'),
  })

  const duplicatesMutation = useMutation({
    mutationFn: () => api.post('/ai/duplicates'),
    onSuccess: (res) => {
      const total = res.data.exactDuplicates.length + res.data.similarNames.length
      toast.success(`Found ${total} potential duplicates`)
    },
    onError: () => toast.error('Duplicate detection failed'),
  })

  const smartSearchMutation = useMutation({
    mutationFn: (query) => api.post('/ai/smart-search', { query }),
    onSuccess: (res) => setSmartResults(res.data.files),
    onError: () => toast.error('Smart search failed'),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    chatMutation.mutate({
      message: input,
      fileId: selectedFile?._id,
      conversationHistory: messages.slice(-10),
    })
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4 animate-fade-in">
      {/* Left: Feature panel */}
      <div className="w-64 flex-shrink-0 space-y-2">
        <h2 className="text-sm font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider px-1 mb-3">
          AI Features
        </h2>
        {AI_FEATURES.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFeature(f.id)}
            className={`w-full text-left p-3 rounded-xl transition-all ${
              activeFeature === f.id
                ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700/50'
                : 'hover:bg-slate-50 dark:hover:bg-dark-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <f.icon className={`text-lg ${activeFeature === f.id ? 'text-primary-600' : 'text-dark-400'}`} />
              <div>
                <p className={`text-sm font-medium ${activeFeature === f.id ? 'text-primary-700 dark:text-primary-300' : 'text-dark-700 dark:text-dark-200'}`}>
                  {f.label}
                </p>
                <p className="text-xs text-dark-400 dark:text-dark-500">{f.desc}</p>
              </div>
            </div>
          </button>
        ))}

        {/* File selector */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-800">
          <p className="text-xs font-medium text-dark-500 mb-2">Context File</p>
          <select
            value={selectedFile?._id || ''}
            onChange={e => {
              const file = filesData?.files?.find(f => f._id === e.target.value)
              setSelectedFile(file || null)
            }}
            className="input text-xs py-2"
          >
            <option value="">No file selected</option>
            {filesData?.files?.map(f => (
              <option key={f._id} value={f._id}>{f.name.substring(0, 40)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Main panel */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-dark-700">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
            <HiSparkles className="text-white text-sm" />
          </div>
          <div>
            <h2 className="font-semibold text-dark-800 dark:text-dark-100">
              {AI_FEATURES.find(f => f.id === activeFeature)?.label}
            </h2>
            {selectedFile && <p className="text-xs text-dark-400">Analyzing: {selectedFile.name}</p>}
          </div>
        </div>

        {/* Chat view */}
        {activeFeature === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              {chatMutation.isPending && (
                <div className="flex gap-2 items-center text-dark-400">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                    <HiSparkles className="text-white text-xs" />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-dark-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-dark-700">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedFile ? `Ask about ${selectedFile.name}...` : "Ask anything about your files..."}
                  rows={2}
                  className="input resize-none flex-1 text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending}
                  className="btn-primary px-4 self-end"
                >
                  <HiPaperAirplane className="rotate-90" />
                </button>
              </div>
              <p className="text-xs text-dark-400 mt-1.5">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </>
        )}

        {/* Smart Search */}
        {activeFeature === 'search' && (
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="flex gap-3">
              <input
                value={smartSearchQuery}
                onChange={e => setSmartSearchQuery(e.target.value)}
                placeholder='e.g. "My resume from last month", "Images with cars"'
                className="input flex-1"
                onKeyDown={e => e.key === 'Enter' && smartSearchMutation.mutate(smartSearchQuery)}
              />
              <button
                onClick={() => smartSearchMutation.mutate(smartSearchQuery)}
                disabled={!smartSearchQuery.trim() || smartSearchMutation.isPending}
                className="btn-primary"
              >
                <HiSearch />
              </button>
            </div>
            {smartSearchMutation.isPending && <div className="text-center text-dark-400 py-8">Searching with AI...</div>}
            {smartResults && (
              <div className="space-y-2">
                <p className="text-sm text-dark-500">{smartResults.length} results found</p>
                {smartResults.map(file => (
                  <div key={file._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-800">
                    <HiDocument className="text-primary-500 text-xl flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-dark-800 dark:text-dark-100">{file.name}</p>
                      <p className="text-xs text-dark-400">{file.category} • {new Date(file.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags, Rename, Duplicates, Folders */}
        {['tags', 'rename', 'duplicates', 'folders'].includes(activeFeature) && (
          <div className="p-6 space-y-4 flex-1">
            {activeFeature === 'tags' && (
              <div className="space-y-3">
                <p className="text-sm text-dark-600 dark:text-dark-300">Select a file from the left to generate AI tags, or generate for all files.</p>
                <button
                  onClick={() => selectedFile && tagsMutation.mutate(selectedFile._id)}
                  disabled={!selectedFile || tagsMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <HiTag /> {tagsMutation.isPending ? 'Generating...' : 'Generate Tags'}
                </button>
              </div>
            )}
            {activeFeature === 'rename' && (
              <div className="space-y-3">
                <p className="text-sm text-dark-600 dark:text-dark-300">Select a file and let AI suggest a better filename.</p>
                <button
                  onClick={() => selectedFile && renameMutation.mutate(selectedFile._id)}
                  disabled={!selectedFile || renameMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <HiLightningBolt /> {renameMutation.isPending ? 'Thinking...' : 'Suggest Better Name'}
                </button>
                {renameMutation.data && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Suggested: <span className="font-bold">{renameMutation.data.data.suggestedName}</span>
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">{renameMutation.data.data.reason}</p>
                  </div>
                )}
              </div>
            )}
            {activeFeature === 'duplicates' && (
              <div className="space-y-3">
                <p className="text-sm text-dark-600 dark:text-dark-300">Scan your drive for duplicate or similar files.</p>
                <button
                  onClick={() => duplicatesMutation.mutate()}
                  disabled={duplicatesMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <HiDuplicate /> {duplicatesMutation.isPending ? 'Scanning...' : 'Find Duplicates'}
                </button>
              </div>
            )}
            {activeFeature === 'folders' && (
              <div className="space-y-3">
                <p className="text-sm text-dark-600 dark:text-dark-300">AI will analyze your files and suggest a better folder structure.</p>
                <button
                  onClick={() => {
                    const ids = filesData?.files?.slice(0, 20).map(f => f._id) || []
                    api.post('/ai/folder-suggestion', { fileIds: ids })
                      .then(r => toast.success('Folder suggestions generated!'))
                      .catch(() => toast.error('Suggestion failed'))
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <HiFolder /> Generate Folder Suggestions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AIAssistantPage
