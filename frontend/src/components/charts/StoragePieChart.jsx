import React from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const COLORS = {
  image: '#6366f1',
  video: '#3b82f6',
  audio: '#8b5cf6',
  pdf: '#ef4444',
  document: '#f59e0b',
  spreadsheet: '#10b981',
  presentation: '#f97316',
  archive: '#6b7280',
  code: '#06b6d4',
  other: '#94a3b8',
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const StoragePieChart = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-dark-400 text-sm">
        No storage data yet
      </div>
    )
  }

  const chartData = {
    labels: data.map(d => d._id || 'other'),
    datasets: [{
      data: data.map(d => d.totalSize),
      backgroundColor: data.map(d => COLORS[d._id] || '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 12,
          font: { size: 11 },
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.label}: ${formatSize(ctx.raw)}`,
        },
      },
    },
  }

  return (
    <div className="h-48">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

export default StoragePieChart
