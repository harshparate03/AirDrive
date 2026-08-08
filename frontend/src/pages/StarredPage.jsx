import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HiStar } from 'react-icons/hi'
import api from '../services/api'
import { useSelector } from 'react-redux'
import FileGrid from '../components/files/FileGrid'
import FileList from '../components/files/FileList'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import ViewModeToggle from '../components/ui/ViewModeToggle'

const StarredPage = () => {
  const { viewMode } = useSelector(state => state.ui)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['starred'],
    queryFn: () => api.get('/files', { params: { starred: true } }).then(r => r.data),
  })

  const files = data?.files || []
  const handleRefresh = () => queryClient.invalidateQueries(['starred'])

return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark-900 dark:text-white">Starred</h1>
        <ViewModeToggle />
      </div>
      {isLoading && <LoadingSkeleton count={6} />}
      {!isLoading && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
            <HiStar className="text-4xl text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200">No starred files</h3>
          <p className="text-dark-400 text-sm mt-1">Star files to find them quickly here</p>
        </div>
      )}
      {!isLoading && files.length > 0 && (
        viewMode === 'grid'
          ? <FileGrid files={files} onRefresh={handleRefresh} />
          : <FileList files={files} onRefresh={handleRefresh} />
      )}
    </div>
  )
}

export default StarredPage
