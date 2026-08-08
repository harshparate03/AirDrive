import React from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const ACTION_COLORS = {
  upload: '#6366f1',
  download: '#3b82f6',
  delete: '#ef4444',
  share: '#10b981',
  view: '#f59e0b',
  default: '#94a3b8',
}

const getLast7Days = () => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
  }
  return days
}

const ActivityTimeline = ({ activities = [] }) => {
  const labels = getLast7Days()

  // Count uploads per day for simplicity
  const uploadCounts = labels.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return activities.filter(a => {
      const actDate = new Date(a.createdAt)
      return actDate.toDateString() === d.toDateString() && a.action === 'upload'
    }).length
  })

  const viewCounts = labels.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return activities.filter(a => {
      const actDate = new Date(a.createdAt)
      return actDate.toDateString() === d.toDateString() && a.action === 'view'
    }).length
  })

  const data = {
    labels,
    datasets: [
      {
        label: 'Uploads',
        data: uploadCounts,
        backgroundColor: '#6366f1',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Views',
        data: viewCounts,
        backgroundColor: '#a5b4fc',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true, font: { size: 11 }, padding: 16 },
      },
    },
  }

  return (
    <div className="h-40">
      <Bar data={data} options={options} />
    </div>
  )
}

export default ActivityTimeline
