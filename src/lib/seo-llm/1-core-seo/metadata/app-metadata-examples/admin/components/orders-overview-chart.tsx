'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string
  }[]
}

export function OrdersOverviewChart({ data }: { data?: ChartData }) {
  // Simple bar chart implementation using CSS
  const maxValue = Math.max(...(data?.datasets[0]?.data || [1]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-between gap-2 px-4">
          {data?.labels.map((label, index) => {
            const value = data.datasets[0]?.data[index] || 0
            const height = (value / maxValue) * 100

            return (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-200 rounded-t relative" style={{ height: '200px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`${label}: ${value}`}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-medium">
                      {value}
                    </span>
                  </div>
                </div>
                <span className="text-xs mt-2 text-center">{label}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
