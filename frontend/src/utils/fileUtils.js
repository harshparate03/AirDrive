import {
  HiDocument, HiPhotograph, HiFilm, HiMusicNote,
  HiCode, HiArchive, HiTable, HiPresentationChartBar,
  HiDocumentText, HiFolder,
} from 'react-icons/hi'

export const getFileIcon = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return HiPhotograph
  if (mimeType.startsWith('video/')) return HiFilm
  if (mimeType.startsWith('audio/')) return HiMusicNote
  if (mimeType === 'application/pdf') return HiDocumentText
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return HiTable
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return HiPresentationChartBar
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z')) return HiArchive
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python') || mimeType.includes('json')) return HiCode
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.startsWith('text/')) return HiDocumentText
  return HiDocument
}

export const getFileColor = (category = '') => {
  const colors = {
    image: 'bg-purple-100 dark:bg-purple-900/30',
    video: 'bg-blue-100 dark:bg-blue-900/30',
    audio: 'bg-pink-100 dark:bg-pink-900/30',
    pdf: 'bg-red-100 dark:bg-red-900/30',
    document: 'bg-indigo-100 dark:bg-indigo-900/30',
    spreadsheet: 'bg-green-100 dark:bg-green-900/30',
    presentation: 'bg-orange-100 dark:bg-orange-900/30',
    archive: 'bg-yellow-100 dark:bg-yellow-900/30',
    code: 'bg-cyan-100 dark:bg-cyan-900/30',
    other: 'bg-slate-100 dark:bg-slate-800',
  }
  return colors[category] || colors.other
}

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const getFileExtension = (filename = '') => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export const isPreviewable = (mimeType = '') => {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/')
  )
}
