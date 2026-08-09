import React from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  LineElement, PointElement, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler)

const palette = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#64748b']
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8, color: '#94a3b8' } } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 0 } },
    y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.12)' }, ticks: { color: '#94a3b8', precision: 0 } },
  },
}

const AdminAnalytics = ({ dashboard }) => {
  const growth = dashboard?.userGrowth || []
  const storage = dashboard?.storageStats || []
  const ai = dashboard?.aiUsage || []
  const interactions = dashboard?.activityBreakdown || []
  const dailyInteractions = Object.values((dashboard?.activityTrends || []).reduce((days, item) => {
    const date = item._id?.date
    if (!date) return days
    days[date] = days[date] || { date, count: 0 }
    days[date].count += item.count
    return days
  }, {}))

  const growthData = {
    labels: growth.map(item => new Date(`${item._id}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [{ label: 'New users', data: growth.map(item => item.count), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.15)', fill: true, tension: 0.35, pointRadius: 3 }],
  }
  const storageData = {
    labels: storage.map(item => item._id || 'Other'),
    datasets: [{ data: storage.map(item => item.totalSize), backgroundColor: storage.map((_, index) => palette[index % palette.length]), borderWidth: 0, hoverOffset: 5 }],
  }
  const aiData = {
    labels: ai.map(item => item._id || 'Other'),
    datasets: [{ label: 'Requests', data: ai.map(item => item.count), backgroundColor: ai.map((_, index) => palette[index % palette.length]), borderRadius: 8, maxBarThickness: 42 }],
  }
  const interactionData = {
    labels: interactions.slice(0, 10).map(item => (item._id || 'other').replaceAll('_', ' ')),
    datasets: [{ label: 'Interactions', data: interactions.slice(0, 10).map(item => item.count), backgroundColor: interactions.slice(0, 10).map((_, index) => palette[index % palette.length]), borderRadius: 8, maxBarThickness: 38 }],
  }
  const dailyData = {
    labels: dailyInteractions.map(item => new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [{ label: 'User interactions', data: dailyInteractions.map(item => item.count), borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,.12)', fill: true, tension: 0.35, pointRadius: 2 }],
  }

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <section className="card p-5 xl:col-span-7">
        <div className="mb-4"><h3 className="font-semibold text-dark-800 dark:text-white">User growth</h3><p className="text-xs text-dark-400">New registrations during the last 30 days</p></div>
        <div className="h-72">{growth.length ? <Line data={growthData} options={commonOptions} /> : <EmptyChart />}</div>
      </section>
      <section className="card p-5 xl:col-span-5">
        <div className="mb-4"><h3 className="font-semibold text-dark-800 dark:text-white">Storage distribution</h3><p className="text-xs text-dark-400">Bytes stored by content category</p></div>
        <div className="h-72">{storage.length ? <Doughnut data={storageData} options={{ responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: commonOptions.plugins }} /> : <EmptyChart />}</div>
      </section>
      <section className="card p-5 xl:col-span-12">
        <div className="mb-4"><h3 className="font-semibold text-dark-800 dark:text-white">AI service usage</h3><p className="text-xs text-dark-400">Requests grouped by AI capability</p></div>
        <div className="h-64">{ai.length ? <Bar data={aiData} options={commonOptions} /> : <EmptyChart />}</div>
      </section>
      <section className="card p-5 xl:col-span-7">
        <div className="mb-4"><h3 className="font-semibold text-dark-800 dark:text-white">Platform interaction trend</h3><p className="text-xs text-dark-400">Uploads, downloads, shares, views, AI actions, and account activity over 30 days</p></div>
        <div className="h-64">{dailyInteractions.length ? <Line data={dailyData} options={commonOptions} /> : <EmptyChart />}</div>
      </section>
      <section className="card p-5 xl:col-span-5">
        <div className="mb-4"><h3 className="font-semibold text-dark-800 dark:text-white">Top user actions</h3><p className="text-xs text-dark-400">Most frequent interactions across AirDrive</p></div>
        <div className="h-64">{interactions.length ? <Bar data={interactionData} options={{ ...commonOptions, indexAxis: 'y' }} /> : <EmptyChart />}</div>
      </section>
    </div>
  )
}

const EmptyChart = () => <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400 dark:bg-white/[0.03]">No analytics data yet</div>

export default AdminAnalytics
