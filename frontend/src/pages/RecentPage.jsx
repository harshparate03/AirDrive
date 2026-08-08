import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useSelector } from 'react-redux'
import FileGrid from '../components/files/FileGrid'
import FileList from '../components/files/FileList'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import ViewModeToggle from '../components/ui/ViewModeToggle'

const RecentPage = () => {
  const { viewMode } = useSelector(state => state.ui)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['recent'],
    queryFn: () => api.get('/files/recent').then(r => r.data),
  })

  const files = data?.files || []

return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark-900 dark:text-white">Recent</h1>
        <ViewModeToggle />
      </div>
      {isLoading && <LoadingSkeleton count={8} />}
      {!isLoading && files.length > 0 && (
        viewMode === 'grid'
          ? <FileGrid files={files} onRefresh={() => queryClient.invalidateQueries(['recent'])} />
          : <FileList files={files} onRefresh={() => queryClient.invalidateQueries(['recent'])} />
      )}
    </div>
  )
}

export default RecentPage
