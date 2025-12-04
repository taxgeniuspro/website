'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Zap, Users, BarChart3, Send } from 'lucide-react'

export default function MarketingOverviewPage() {
  const router = useRouter()

  const features = [
    {
      icon: Send,
      title: 'Email Campaigns',
      description: 'Create and send targeted email campaigns to your customers',
      href: '/admin/marketing/campaigns',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Mail,
      title: 'Email Builder',
      description: 'Design beautiful emails with our drag-and-drop builder',
      href: '/admin/marketing/email-builder',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Zap,
      title: 'Automation',
      description: 'Set up automated workflows and triggers',
      href: '/admin/marketing/automation',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: Users,
      title: 'Customer Segments',
      description: 'Target specific groups of customers',
      href: '/admin/marketing/segments',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Track campaign performance and engagement',
      href: '/admin/marketing/analytics',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing & Automation</h1>
        <p className="text-gray-600 mt-2">
          Engage your customers with targeted campaigns and automated workflows
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Card
              key={feature.href}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(feature.href)}
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Open
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Workflows</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Customer Segments</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Email Templates</CardDescription>
            <CardTitle className="text-3xl">1</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
