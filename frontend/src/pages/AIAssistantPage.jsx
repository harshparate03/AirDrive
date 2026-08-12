import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  HiSparkles, HiPaperAirplane, HiDocument, HiTag, HiSearch,
  HiDuplicate, HiFolder, HiLightningBolt, HiUpload, HiCheckCircle, HiPlus, HiX, HiMicrophone,
} from 'react-icons/hi'
import { useDispatch } from 'react-redux'
import { openModal } from '../store/slices/uiSlice'
import api from '../services/api'
import useUpload from '../hooks/useUpload'
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

const showApiError = (error, fallback) => toast.error(error.response?.data?.details || error.response?.data?.error || fallback)

const StructuredAIText = ({ content }) => {
  const lines = String(content || '').split('\n').map(line => line.trim()).filter(Boolean)
  return <div className="space-y-2 text-sm leading-6 text-dark-600 dark:text-dark-200">{lines.map((line, index) => {
    const clean = line.replace(/^#{1,6}\s*/, '').replace(/^\*\*(.*?)\*\*:?$/, '$1')
    if (/^#{1,6}\s/.test(line) || /^\*\*.*\*\*:?$/.test(line)) return <h3 key={index} className="pt-2 text-base font-semibold text-dark-800 dark:text-white">{clean}</h3>
    if (/^[-*â€¢]\s+/.test(line)) return <div key={index} className="flex gap-2 pl-2"><span className="text-primary-500">•</span><span>{line.replace(/^[-*â€¢]\s+/, '')}</span></div>
    if (/^\d+[.)]\s+/.test(line)) return <div key={index} className="flex gap-2 pl-2"><span className="font-semibold text-primary-500">{line.match(/^\d+[.)]/)?.[0]}</span><span>{line.replace(/^\d+[.)]\s+/, '')}</span></div>
    return <p key={index}>{line}</p>
  })}</div>
}

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
    <div className={`max-w-[88%] px-3 py-2.5 sm:max-w-[75%] sm:px-4 sm:py-3 rounded-2xl text-sm leading-relaxed ${
      msg.role === 'user'
        ? 'bg-primary-600 text-white rounded-br-sm'
        : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 border border-slate-100 dark:border-dark-700 rounded-bl-sm'
    }`}>
      {msg.role === 'assistant' ? <StructuredAIText content={msg.content} /> : msg.content}
    </div>
  </motion.div>
)

const ContextFileCard = ({ files = [], selectedFile, onSelect, onUpload, title = 'Select a file to analyze' }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-800/60">
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"><HiDocument /></div>
      <div>
        <h3 className="text-sm font-semibold text-dark-800 dark:text-white">{title}</h3>
        <p className="text-xs text-dark-400">Choose an existing file or upload a new one.</p>
      </div>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        value={selectedFile?._id || ''}
        onChange={event => onSelect(files.find(file => file._id === event.target.value) || null)}
        className="input min-w-0 flex-1 text-sm"
      >
        <option value="">Select a file...</option>
        {files.map(file => <option key={file._id} value={file._id}>{file.name}</option>)}
      </select>
      <button type="button" onClick={onUpload} className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap text-sm"><HiUpload /> Upload file</button>
    </div>
    {selectedFile && <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-dark-600 shadow-sm dark:bg-dark-700 dark:text-dark-200"><HiCheckCircle className="flex-shrink-0 text-green-500" /><span className="truncate">Ready: {selectedFile.name}</span></div>}
  </div>
)

const AIAssistantPage = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const [activeFeature, setActiveFeature] = useState('chat')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your Air Drive AI assistant. I can help you chat with files, summarize documents, find duplicates, suggest folder organization, and much more. What would you like to do?' }
  ])
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [smartSearchQuery, setSmartSearchQuery] = useState('')
  const [smartResults, setSmartResults] = useState(null)
  const [summaryType, setSummaryType] = useState('summary')
  const [folderSuggestions, setFolderSuggestions] = useState([])
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef(null)
  const chatFileRef = useRef(null)
  const recognitionRef = useRef(null)
  const { upload } = useUpload()

  const { data: filesData } = useQuery({
    queryKey: ['files-for-ai'],
    queryFn: () => api.get('/files').then(r => r.data),
  })

  const chatMutation = useMutation({
    mutationFn: (data) => api.post('/ai/chat', data),
    onSuccess: (res) => {
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    },
    onError: (error) => showApiError(error, 'AI chat failed'),
  })

  const tagsMutation = useMutation({
    mutationFn: (fileId) => api.post('/ai/tags', { fileId }),
    onSuccess: (res) => {
      setSelectedFile(prev => prev ? { ...prev, aiTags: res.data.tags } : prev)
      queryClient.invalidateQueries({ queryKey: ['files-for-ai'] })
      toast.success(`Generated ${res.data.tags.length} tags`)
    },
    onError: (error) => showApiError(error, 'Tag generation failed'),
  })

  const removeTagsMutation = useMutation({
    mutationFn: (tag) => api.delete('/ai/tags', { data: { fileId: selectedFile._id, tag: tag || undefined } }),
    onSuccess: (res) => {
      setSelectedFile(prev => prev ? { ...prev, aiTags: res.data.tags || [] } : prev)
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['files-for-ai'] })
      toast.success(res.data.tags?.length ? 'AI tag removed' : 'AI tags removed')
    },
    onError: (error) => showApiError(error, 'Could not remove AI tag'),
  })

  const summaryMutation = useMutation({
    mutationFn: ({ fileId, type }) => api.post('/ai/summary', { fileId, type }),
    onError: (error) => showApiError(error, 'Document summary failed'),
  })

  const applyRenameMutation = useMutation({
    mutationFn: ({ fileId, newName }) => api.post('/ai/rename/apply', { fileId, newName }),
    onSuccess: (res) => {
      setSelectedFile(prev => prev ? { ...prev, name: res.data.file.name } : prev)
      queryClient.invalidateQueries({ queryKey: ['files-for-ai'] })
      toast.success('File renamed')
    },
    onError: (error) => showApiError(error, 'Could not apply the suggested name'),
  })

  const renameMutation = useMutation({
    mutationFn: (fileId) => api.post('/ai/rename', { fileId }),
    onSuccess: (res) => {
      toast.success(`Suggested name: ${res.data.suggestedName}`)
    },
    onError: (error) => showApiError(error, 'Rename suggestion failed'),
  })

  const duplicatesMutation = useMutation({
    mutationFn: () => api.post('/ai/duplicates'),
    onSuccess: (res) => {
      const total = res.data.exactDuplicates.length + res.data.similarNames.length
      toast.success(`Found ${total} potential duplicates`)
    },
    onError: (error) => showApiError(error, 'Duplicate detection failed'),
  })

  const smartSearchMutation = useMutation({
    mutationFn: (query) => api.post('/ai/smart-search', { query }),
    onSuccess: (res) => setSmartResults(res.data.files),
    onError: (error) => showApiError(error, 'Smart search failed'),
  })

  const folderMutation = useMutation({
    mutationFn: (fileIds) => api.post('/ai/folder-suggestion', { fileIds }),
    onSuccess: (res) => setFolderSuggestions(res.data.suggestions || []),
    onError: (error) => showApiError(error, 'Folder suggestion failed'),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  useEffect(() => {
    const handleContextUpload = (event) => {
      const uploadedFile = event.detail?.file
      if (!uploadedFile) return
      setSelectedFile(uploadedFile)
      const feature = event.detail?.feature || 'chat'
      setActiveFeature(feature)
      if (feature === 'chat') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `${uploadedFile.name} is uploaded and selected. Ask me a question about this file.`,
        }])
      } else {
        toast.success(`${uploadedFile.name} is ready to analyze`)
      }
      queryClient.invalidateQueries({ queryKey: ['files-for-ai'] })
    }
    window.addEventListener('airdrive:ai-context-uploaded', handleContextUpload)
    return () => window.removeEventListener('airdrive:ai-context-uploaded', handleContextUpload)
  }, [queryClient])

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

  const handleChatFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAttachmentUploading(true)
    const uploadedFiles = await upload([file])
    setAttachmentUploading(false)
    const uploadedFile = uploadedFiles?.[0]
    if (!uploadedFile) return
    setSelectedFile(uploadedFile)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `${uploadedFile.name} is attached. You can now ask anything about this file.`,
    }])
  }

  const toggleMicrophone = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = navigator.language || 'en-US'
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').trim()
      if (transcript) setInput(previous => `${previous}${previous.trim() ? ' ' : ''}${transcript}`)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'aborted') toast.error(event.error === 'not-allowed' ? 'Microphone permission was denied' : 'Voice input could not start')
    }
    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  return (
    <div className="min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4 animate-fade-in">
      {/* Left: Feature panel */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <h2 className="text-sm font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider px-1 mb-3">
          AI Features
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2">
        {AI_FEATURES.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFeature(f.id)}
            className={`min-w-[150px] lg:min-w-0 lg:w-full text-left p-3 rounded-xl transition-all ${
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
        </div>

      </div>

      {/* Right: Main panel */}
      <div className="flex h-[calc(100dvh-11rem)] min-h-[500px] flex-1 flex-col overflow-hidden card lg:h-auto lg:min-h-0">
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
              {selectedFile && (
                <div className="mb-2 flex w-fit max-w-full items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                  <HiDocument className="flex-shrink-0" />
                  <span className="truncate">{selectedFile.name}</span>
                  <button type="button" onClick={() => setSelectedFile(null)} className="rounded p-0.5 hover:bg-primary-100 dark:hover:bg-primary-900/40" aria-label="Remove attached file"><HiX /></button>
                </div>
              )}
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:border-dark-600 dark:bg-dark-800 dark:focus-within:border-primary-500 dark:focus-within:ring-primary-900/30">
                <input ref={chatFileRef} type="file" className="hidden" onChange={handleChatFile} />
                <button
                  type="button"
                  onClick={() => chatFileRef.current?.click()}
                  disabled={attachmentUploading || chatMutation.isPending}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-dark-500 transition hover:bg-slate-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-300 dark:hover:bg-dark-700 dark:hover:text-primary-400"
                  aria-label="Upload and attach a file"
                  title="Upload and attach a file"
                >
                  {attachmentUploading ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /> : <HiPlus className="text-lg" />}
                </button>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedFile ? `Ask about ${selectedFile.name}...` : "Ask anything about your files..."}
                  rows={2}
                  className="min-h-10 max-h-32 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-dark-800 outline-none placeholder:text-dark-400 dark:text-dark-100"
                />
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  disabled={attachmentUploading || chatMutation.isPending}
                  className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50 ${isListening ? 'bg-red-50 text-red-600 ring-2 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900/50' : 'text-dark-500 hover:bg-slate-100 hover:text-primary-600 dark:text-dark-300 dark:hover:bg-dark-700 dark:hover:text-primary-400'}`}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  title={isListening ? 'Listening… click to stop' : 'Use microphone'}
                >
                  {isListening && <span className="absolute inset-1 animate-ping rounded-lg bg-red-300/30" />}
                  <HiMicrophone className="relative text-lg" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending || attachmentUploading}
                  className="btn-primary flex h-10 w-10 flex-shrink-0 items-center justify-center self-end rounded-xl p-0"
                >
                  <HiPaperAirplane className="rotate-90" />
                </button>
              </div>
              {attachmentUploading && <p className="mt-1.5 text-xs text-primary-500">Uploading and attaching your file...</p>}
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
            {smartSearchMutation.isPending && <div className="text-center text-dark-400 py-8">Searching files...</div>}
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

        {activeFeature === 'summary' && (
          <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
            <ContextFileCard
              files={filesData?.files || []}
              selectedFile={selectedFile}
              onSelect={(file) => { setSelectedFile(file); summaryMutation.reset() }}
              onUpload={() => dispatch(openModal({ modal: 'upload', data: { selectForAI: true, aiFeature: 'summary' } }))}
              title="Document to summarize"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ['summary', 'Summary'], ['important', 'Key points'], ['explain', 'Explain simply'], ['notes', 'Study notes'],
              ].map(([value, label]) => (
                <button key={value} onClick={() => { setSummaryType(value); summaryMutation.reset() }} className={`${summaryType === value ? 'border-primary-500 bg-primary-600 text-white shadow-sm' : 'border-slate-200 bg-white text-dark-600 hover:border-primary-300 hover:bg-primary-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700'} rounded-xl border px-3 py-3 text-sm font-medium transition`}>{label}</button>
              ))}
            </div>
            <button
              onClick={() => summaryMutation.mutate({ fileId: selectedFile._id, type: summaryType })}
              disabled={!selectedFile || summaryMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <HiDocument /> {summaryMutation.isPending ? 'Analyzing document...' : 'Analyze document'}
            </button>
            {!selectedFile && <p className="text-sm text-amber-600">Select a context file first.</p>}
            {summaryMutation.data && (
              <div className="rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 p-4 sm:p-5">
                <h3 className="font-semibold text-dark-800 dark:text-white mb-3">Result</h3>
                <StructuredAIText content={summaryMutation.data.data.response} />
              </div>
            )}
          </div>
        )}

        {/* Tags, Rename, Duplicates, Folders */}
        {['tags', 'rename', 'duplicates', 'folders'].includes(activeFeature) && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {activeFeature === 'tags' && (
              <div className="space-y-3">
                <ContextFileCard
                  files={filesData?.files || []}
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                  onUpload={() => dispatch(openModal({ modal: 'upload', data: { selectForAI: true, aiFeature: 'tags' } }))}
                  title="File to tag"
                />
                <button
                  onClick={() => selectedFile && tagsMutation.mutate(selectedFile._id)}
                  disabled={!selectedFile || tagsMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <HiTag /> {tagsMutation.isPending ? 'Generating...' : 'Generate Tags'}
                </button>
                {selectedFile?.aiTags?.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-dark-700">
                    <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-medium text-dark-500">Generated tags</p><button type="button" onClick={() => removeTagsMutation.mutate(null)} disabled={removeTagsMutation.isPending} className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50">Remove all</button></div>
                    <div className="flex flex-wrap gap-2">{selectedFile.aiTags.map(tag => <span key={tag} className="flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><span>{tag}</span><button type="button" onClick={() => removeTagsMutation.mutate(tag)} disabled={removeTagsMutation.isPending} className="rounded-full p-0.5 hover:bg-primary-100 disabled:opacity-50 dark:hover:bg-primary-900/50" aria-label={`Remove ${tag} tag`}><HiX /></button></span>)}</div>
                  </div>
                )}
              </div>
            )}
            {activeFeature === 'rename' && (
              <div className="space-y-3">
                <ContextFileCard
                  files={filesData?.files || []}
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                  onUpload={() => dispatch(openModal({ modal: 'upload', data: { selectForAI: true, aiFeature: 'rename' } }))}
                  title="File to rename"
                />
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
                    <button
                      onClick={() => applyRenameMutation.mutate({ fileId: selectedFile._id, newName: renameMutation.data.data.suggestedName })}
                      disabled={applyRenameMutation.isPending}
                      className="btn-primary mt-3 text-sm"
                    >
                      {applyRenameMutation.isPending ? 'Renaming...' : 'Apply this name'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {activeFeature === 'duplicates' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-dark-700 dark:from-dark-800 dark:to-dark-900 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-dark-800 dark:text-white"><HiDuplicate className="text-primary-500" /> Duplicate scanner</h3>
                      <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">Compares file size, type, and normalized names across your drive.</p>
                    </div>
                    <button onClick={() => duplicatesMutation.mutate()} disabled={duplicatesMutation.isPending} className="btn-primary flex min-w-max items-center justify-center gap-2">
                      <HiDuplicate /> {duplicatesMutation.isPending ? 'Scanning drive...' : 'Scan all files'}
                    </button>
                  </div>
                </div>
                {duplicatesMutation.data && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/10"><p className="text-2xl font-bold text-red-600">{duplicatesMutation.data.data.exactDuplicates.length}</p><p className="text-xs text-red-500">Exact-size groups</p></div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10"><p className="text-2xl font-bold text-amber-600">{duplicatesMutation.data.data.similarNames.length}</p><p className="text-xs text-amber-600">Similar-name pairs</p></div>
                    </div>
                    {duplicatesMutation.data.data.exactDuplicates.map((group, index) => (
                      <div key={`exact-${index}`} className="overflow-hidden rounded-xl border border-slate-200 dark:border-dark-700">
                        <div className="flex items-center justify-between bg-red-50 px-3 py-2 dark:bg-red-900/10"><p className="text-xs font-semibold text-red-600">Exact match group {index + 1}</p><span className="text-xs text-dark-400">{group.length} files</span></div>
                        <div className="divide-y divide-slate-100 dark:divide-dark-700">{group.map(file => <div key={file._id} className="flex items-center gap-3 px-3 py-2.5"><HiDocument className="text-dark-400" /><span className="min-w-0 flex-1 truncate text-sm text-dark-700 dark:text-dark-200">{file.name}</span><span className="text-xs text-dark-400">{file.mimeType?.split('/').pop()}</span></div>)}</div>
                      </div>
                    ))}
                    {duplicatesMutation.data.data.similarNames.map((group, index) => (
                      <div key={`name-${index}`} className="rounded-xl bg-slate-50 dark:bg-dark-800 p-3 text-sm text-dark-700 dark:text-dark-200">
                        {group.map(file => file.name).join(' ↔ ')}
                      </div>
                    ))}
                    {duplicatesMutation.data.data.exactDuplicates.length === 0 && duplicatesMutation.data.data.similarNames.length === 0 && <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"><HiCheckCircle className="text-2xl" /><div><p className="font-semibold">Your drive looks clean</p><p className="text-xs opacity-80">No duplicate groups were detected.</p></div></div>}
                  </div>
                )}
              </div>
            )}
            {activeFeature === 'folders' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-900/40 dark:bg-primary-900/10 sm:p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-dark-800 dark:text-white"><HiFolder className="text-amber-500" /> Folder organization plan</h3>
                  <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">Analyze up to 20 visible files and group them into a cleaner structure. Suggestions do not move files automatically.</p>
                  <button
                    onClick={() => folderMutation.mutate(filesData?.files?.slice(0, 20).map(f => f._id) || [])}
                    disabled={folderMutation.isPending || !filesData?.files?.length}
                    className="btn-primary mt-4 flex items-center gap-2"
                  >
                    <HiFolder /> {folderMutation.isPending ? 'Building suggestions...' : `Analyze ${Math.min(filesData?.files?.length || 0, 20)} files`}
                  </button>
                  {!filesData?.files?.length && <p className="mt-2 text-xs text-amber-600">Upload at least one file to generate suggestions.</p>}
                </div>
                {folderSuggestions.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{folderSuggestions.map((suggestion, index) => (
                  <div key={`${suggestion.folder}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800">
                    <div className="flex items-start gap-3"><div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30"><HiFolder /></div><div className="min-w-0"><p className="font-semibold text-dark-800 dark:text-white">{suggestion.folder}</p><p className="mt-1 text-xs leading-5 text-dark-400">{suggestion.reason}</p></div></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{suggestion.files?.map(name => <span key={name} className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs text-dark-600 dark:bg-dark-700 dark:text-dark-300" title={name}>{name}</span>)}</div>
                  </div>
                ))}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AIAssistantPage
