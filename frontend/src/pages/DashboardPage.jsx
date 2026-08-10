import React from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  HiFolder, HiDocument,
  HiShare, HiStar, HiTrendingUp, HiClock,
} from 'react-icons/hi'
import api from '../services/api'
import StoragePieChart from '../components/charts/StoragePieChart'
import ActivityTimeline from '../components/charts/ActivityTimeline'
import ActivityHeatmap from '../components/charts/ActivityHeatmap'
import FileGrid from '../components/files/FileGrid'
import FileList from '../components/files/FileList'
import ViewModeToggle from '../components/ui/ViewModeToggle'
import QuickUpload from '../components/upload/QuickUpload'
import StatCard from '../components/ui/StatCard'
import NotificationsList from '../components/notifications/NotificationsList'
import RecentShared from '../components/shared/RecentShared'

const DashboardPage = () => {
  const { user } = useSelector(state => state.auth)
  const { viewMode } = useSelector(state => state.ui)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => api.get('/users/stats').then(r => r.data),
  })

  const { data: storageData } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get('/files/storage').then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

  const { data: activityData } = useQuery({
    queryKey: ['activities-heatmap'],
    queryFn: () => api.get('/activities').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })

  const { data: recentFilesData } = useQuery({
    queryKey: ['recent'],
    queryFn: () => api.get('/files/recent').then(r => r.data),
  })

  const storagePercent = storageData
    ? Math.round((storageData.storageUsed / storageData.storageLimit) * 100)
    : 0

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const statCards = [
    {
      label: 'Total Files',
      value: statsLoading ? '-' : stats?.fileCount?.toLocaleString() || '0',
      icon: HiDocument,
      color: 'blue',
      trend: `+${stats?.recentUploads || 0} this week`,
    },
    {
      label: 'Folders',
      value: statsLoading ? '-' : stats?.folderCount?.toLocaleString() || '0',
      icon: HiFolder,
      color: 'yellow',
    },
    {
      label: 'Starred',
      value: statsLoading ? '-' : stats?.starredCount?.toLocaleString() || '0',
      icon: HiStar,
      color: 'amber',
    },
    {
      label: 'Storage Used',
      value: formatSize(storageData?.storageUsed || 0),
      icon: HiTrendingUp,
      color: storagePercent > 80 ? 'red' : 'green',
      subValue: `${storagePercent}% of ${formatSize(storageData?.storageLimit || 0)}`,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-0.5 text-sm">
            Here&apos;s what&apos;s happening with your files today.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <ViewModeToggle />
          <QuickUpload />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatCard {...card} loading={statsLoading} />
          </motion.div>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Storage Pie */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Storage Breakdown</h2>
          <StoragePieChart data={storageData?.byCategory || []} />
        </div>

        {/* Activity Timeline */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Activity (Last 7 Days)</h2>
          <ActivityTimeline activities={stats?.recentActivity || []} />
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent files */}
<div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">Recent Files</h2>
            <HiClock className="text-dark-400" />
          </div>
          {viewMode === 'grid'
            ? <FileGrid files={recentFilesData?.files || []} />
            : <FileList files={recentFilesData?.files || []} />
          }
        </div>

        {/* Notifications */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Notifications</h2>
          <NotificationsList compact />
        </div>
      </div>

      {/* Recent Shared */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <HiShare className="text-primary-500" />
          <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200">Recently Shared</h2>
        </div>
        <RecentShared />
      </div>

      {/* Activity Heatmap */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">
          Activity Heatmap
        </h2>
        <ActivityHeatmap heatmap={activityData?.heatmap || []} />
      </div>
    </div>
  )
}

export default DashboardPage
