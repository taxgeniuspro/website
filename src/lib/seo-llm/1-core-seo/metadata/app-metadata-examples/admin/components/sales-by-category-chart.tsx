'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
  }[]
}

export function SalesByCategoryChart({ data }: { data?: ChartData }) {
  const defaultData = {
    labels: ['Business Cards', 'Flyers', 'Posters', 'Banners', 'T-Shirts', 'Brochures'],
    datasets: [
      {
        label: 'Sales by Category',
        data: [30, 25, 15, 10, 12, 8],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
      },
    ],
  }

  const chartData = data || defaultData
  const total = chartData.datasets[0].data.reduce((a, b) => a + b, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.labels.map((label, index) => {
            const value = chartData.datasets[0].data[index]
            const percentage = ((value / total) * 100).toFixed(1)
            const color = chartData.datasets[0].backgroundColor?.[index] || '#3b82f6'

            return (
              <div key={label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <span className="font-medium">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
