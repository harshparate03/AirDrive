import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { HiDatabase, HiChartPie, HiTrendingUp } from 'react-icons/hi'
import api from '../services/api'
import StoragePieChart from '../components/charts/StoragePieChart'
import StorageAreaChart from '../components/charts/StorageAreaChart'
import { formatFileSize } from '../utils/fileUtils'

const CATEGORY_LABELS = {
  image: 'Images', video: 'Videos', audio: 'Audio', pdf: 'PDFs',
  document: 'Documents', spreadsheet: 'Spreadsheets', presentation: 'Presentations',
  archive: 'Archives', code: 'Code', other: 'Other',
}

const CATEGORY_COLORS = {
  image: 'bg-purple-500', video: 'bg-blue-500', audio: 'bg-pink-500',
  pdf: 'bg-red-500', document: 'bg-indigo-500', spreadsheet: 'bg-green-500',
  presentation: 'bg-orange-500', archive: 'bg-yellow-500', code: 'bg-cyan-500', other: 'bg-slate-400',
}

const StoragePage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get('/files/storage').then(r => r.data),
    refetchInterval: 30000,
  })

  const used = data?.storageUsed || 0
  const total = data?.storageLimit || 15 * 1024 * 1024 * 1024
  const pct = Math.min(Math.round((used / total) * 100), 100)
  const byCategory = data?.byCategory || []
  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary-500'

  if (isLoading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-40 rounded" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <h1 className="text-xl font-bold text-dark-900 dark:text-white">Storage</h1>

      {/* Main storage card */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <HiDatabase className="text-2xl text-primary-500" />
          </div>
          <div>
            <p className="font-semibold text-dark-800 dark:text-dark-100">Air Drive Storage</p>
            <p className="text-sm text-dark-400">Your files stored securely in the cloud</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-dark-700 dark:text-dark-200">{formatFileSize(used)} used</span>
            <span className="text-dark-400">{formatFileSize(total)} total</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
          <div className="flex justify-between text-xs text-dark-400">
            <span>{pct}% used</span>
            <span>{formatFileSize(total - used)} free</span>
          </div>
        </div>

        {pct > 80 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-sm text-amber-700 dark:text-amber-300">
            ⚠️ Storage is {pct > 90 ? 'almost full' : 'getting full'}. Consider cleaning up old files.
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HiChartPie className="text-primary-500" />
            <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">By Type</h2>
          </div>
          <StoragePieChart data={byCategory} />
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HiTrendingUp className="text-primary-500" />
            <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">Breakdown</h2>
          </div>
          <div className="space-y-3">
            {byCategory.sort((a, b) => b.totalSize - a.totalSize).map(cat => {
              const catPct = used > 0 ? Math.round((cat.totalSize / used) * 100) : 0
              return (
                <div key={cat._id}>
                  <div className="flex justify-between text-xs text-dark-600 dark:text-dark-300 mb-1">
                    <span>{CATEGORY_LABELS[cat._id] || cat._id}</span>
                    <span className="text-dark-400">{formatFileSize(cat.totalSize)} ({catPct}%) · {cat.count} files</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${catPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${CATEGORY_COLORS[cat._id] || 'bg-slate-400'}`}
                    />
                  </div>
                </div>
              )
            })}
            {!byCategory.length && (
              <p className="text-sm text-dark-400 py-4 text-center">No file data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Category-level storage area chart */}
      {byCategory.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HiTrendingUp className="text-primary-500" />
            <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">Storage by Category</h2>
          </div>
          <StorageAreaChart data={byCategory} label="Storage" />
        </div>
      )}
    </div>
  )
}

export default StoragePage
