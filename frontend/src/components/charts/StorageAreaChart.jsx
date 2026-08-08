import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const StorageAreaChart = ({ data = [], label = 'Storage Used' }) => {
  const labels = data.map(d => d._id || d.date)
  const values = data.map(d => Math.round((d.totalSize || d.value || 0) / (1024 * 1024))) // MB

  const chartData = {
    labels,
    datasets: [
      {
        label: `${label} (MB)`,
        data: values,
        fill: true,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.parsed.y} MB`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 11 }, callback: v => `${v}MB` },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      x: {
        ticks: { font: { size: 10 }, maxRotation: 45 },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="h-36">
      <Line data={chartData} options={options} />
    </div>
  )
}

export default StorageAreaChart
