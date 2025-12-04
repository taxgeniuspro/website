'use client'

import { useEffect, useState } from 'react'
import { Activity, DollarSign, ShoppingCart, TrendingDown, TrendingUp, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatData {
  label: string
  value: string | number
  change: number
  icon: React.ElementType
  color: string
}

export function RealTimeStats() {
  const [stats, setStats] = useState<StatData[]>([
    {
      label: 'Active Users',
      value: 142,
      change: 0,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Live Orders',
      value: 23,
      change: 0,
      icon: ShoppingCart,
      color: 'green',
    },
    {
      label: "Today's Revenue",
      value: '$3,426.00',
      change: 0,
      icon: DollarSign,
      color: 'purple',
    },
    {
      label: 'Server Load',
      value: '42%',
      change: 0,
      icon: Activity,
      color: 'orange',
    },
  ])

  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      setStats((prevStats) =>
        prevStats.map((stat) => {
          let newValue = stat.value
          let change = 0

          if (stat.label === 'Active Users') {
            const delta = Math.floor(Math.random() * 11) - 5
            newValue = Math.max(50, Math.min(500, Number(stat.value) + delta))
            change = delta
          } else if (stat.label === 'Live Orders') {
            const delta = Math.floor(Math.random() * 5) - 2
            newValue = Math.max(0, Number(stat.value) + delta)
            change = delta
          } else if (stat.label === "Today's Revenue") {
            const currentValue = parseFloat(String(stat.value).replace(/[$,]/g, ''))
            const delta = (Math.random() * 100).toFixed(2)
            newValue = `$${(currentValue + parseFloat(delta)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            change = parseFloat(delta)
          } else if (stat.label === 'Server Load') {
            const currentValue = parseInt(String(stat.value))
            const delta = Math.floor(Math.random() * 11) - 5
            newValue = `${Math.max(10, Math.min(100, currentValue + delta))}%`
            change = delta
          }

          return {
            ...stat,
            value: newValue,
            change,
          }
        })
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [isLive])

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' },
      green: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        icon: 'text-green-600 dark:text-green-400',
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900/20',
        icon: 'text-purple-600 dark:text-purple-400',
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        icon: 'text-orange-600 dark:text-orange-400',
      },
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Real-Time Metrics</h2>
        <Badge
          className="cursor-pointer"
          variant={isLive ? 'default' : 'secondary'}
          onClick={() => setIsLive(!isLive)}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          />
          {isLive ? 'Live' : 'Paused'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colors = getColorClasses(stat.color)

          return (
            <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all">
              {stat.change !== 0 && (
                <div className="absolute top-2 right-2">
                  {stat.change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 animate-pulse" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                </div>
              )}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div
                  className={`h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-300">{stat.value}</div>
                {stat.change !== 0 && (
                  <p
                    className={`text-xs mt-1 ${stat.change > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {stat.change > 0 ? '+' : ''}
                    {stat.label === "Today's Revenue" ? `$${stat.change.toFixed(2)}` : stat.change}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
