'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
  }[]
}

export function RevenueChart({ data }: { data?: ChartData }) {
  if (!data) return null

  const maxValue = Math.max(...(data.datasets[0]?.data || [1]))
  const points = data.labels.length

  // Create SVG path for line chart
  const createPath = (dataset: number[]) => {
    return dataset
      .map((value, index) => {
        const x = (index / (points - 1)) * 100
        const y = 100 - (value / maxValue) * 100
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-64">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line key={y} stroke="#e5e7eb" strokeWidth="0.2" x1="0" x2="100" y1={y} y2={y} />
            ))}

            {/* Line chart */}
            {data.datasets.map((dataset, idx) => (
              <g key={idx}>
                <path
                  d={createPath(dataset.data)}
                  fill="none"
                  stroke={dataset.borderColor || '#3b82f6'}
                  strokeWidth="0.5"
                />
                {/* Data points */}
                {dataset.data.map((value, index) => {
                  const x = (index / (points - 1)) * 100
                  const y = 100 - (value / maxValue) * 100
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      fill={dataset.borderColor || '#3b82f6'}
                      r="1"
                    />
                  )
                })}
              </g>
            ))}
          </svg>

          {/* Labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
            {data.labels.map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 -ml-8">
            <span>${maxValue}</span>
            <span>${maxValue / 2}</span>
            <span>$0</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
