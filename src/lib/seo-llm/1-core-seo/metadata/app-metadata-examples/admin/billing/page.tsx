'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, CreditCard, FileText, TrendingUp } from 'lucide-react'

export default function BillingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const stats = [
    {
      title: 'Current Balance',
      value: '$12,456.78',
      icon: DollarSign,
      description: 'Outstanding invoices',
    },
    {
      title: 'Monthly Revenue',
      value: '$34,567.89',
      icon: TrendingUp,
      description: 'Last 30 days',
    },
    {
      title: 'Pending Payments',
      value: '23',
      icon: CreditCard,
      description: 'Awaiting processing',
    },
    {
      title: 'Invoices',
      value: '145',
      icon: FileText,
      description: 'This month',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Payments</h1>
        <p className="text-gray-600 mt-2">Manage your billing, invoices, and payment methods</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest billing activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">Order #1234{i}</p>
                    <p className="text-sm text-gray-500">Customer Name</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$234.{i}0</p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your payment options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <CreditCard className="h-8 w-8" />
                  <div>
                    <p className="font-medium">Square</p>
                    <p className="text-sm text-gray-500">Connected</p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <CreditCard className="h-8 w-8" />
                  <div>
                    <p className="font-medium">Stripe</p>
                    <p className="text-sm text-gray-500">Not connected</p>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Settings</CardTitle>
          <CardDescription>Configure your billing preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Billing Period</label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setBillingPeriod('monthly')}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingPeriod === 'yearly' ? 'default' : 'outline'}
                  onClick={() => setBillingPeriod('yearly')}
                >
                  Yearly
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Invoice Prefix</label>
              <input
                className="mt-2 w-full px-3 py-2 border rounded-md"
                defaultValue="INV-"
                name="invoicePrefix"
                placeholder="INV-"
                type="text"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tax Rate (%)</label>
              <input
                className="mt-2 w-full px-3 py-2 border rounded-md"
                defaultValue="8.25"
                name="taxRate"
                placeholder="0"
                type="number"
              />
            </div>
            <Button className="w-full">Save Billing Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
