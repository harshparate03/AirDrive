import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HiSearch } from 'react-icons/hi'
import api from '../services/api'
import { useSelector } from 'react-redux'
import FileGrid from '../components/files/FileGrid'
import FileList from '../components/files/FileList'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import ViewModeToggle from '../components/ui/ViewModeToggle'

const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const { viewMode } = useSelector(state => state.ui)

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get('/files', { params: { search: q } }).then(r => r.data),
    enabled: !!q,
  })

  const files = data?.files || []

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark-900 dark:text-white">Search Results</h1>
          {q && <p className="text-dark-500 dark:text-dark-400 text-sm mt-0.5">Results for &ldquo;{q}&rdquo;</p>}
        </div>
        <ViewModeToggle />
      </div>

      {isLoading && <LoadingSkeleton count={8} />}

      {!isLoading && q && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiSearch className="text-5xl text-dark-300 mb-4" />
          <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-200">No results found</h3>
          <p className="text-dark-400 text-sm mt-1">Try a different search term or use AI Smart Search</p>
        </div>
      )}

      {!isLoading && files.length > 0 && (
        <div>
          <p className="text-sm text-dark-400 mb-3">{files.length} file(s) found</p>
          {viewMode === 'grid'
            ? <FileGrid files={files} onRefresh={() => {}} />
            : <FileList files={files} onRefresh={() => {}} />
          }
        </div>
      )}
    </div>
  )
}

export default SearchPage
