'use client'

import { useState } from 'react'
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

interface OrderStatus {
  status: string
  timestamp: string
  description: string
  completed: boolean
}

interface Order {
  orderNumber: string
  status: string
  email: string
  createdAt: string
  estimatedDelivery: string
  items: {
    name: string
    quantity: number
    price: string
  }[]
  timeline: OrderStatus[]
  trackingNumber?: string
  carrier?: string
}

const statusIcons: Record<string, any> = {
  'Order Placed': FileText,
  'Payment Confirmed': CheckCircle,
  'In Production': Clock,
  'Quality Check': Search,
  Shipped: Truck,
  Delivered: Package,
}

const statusColors: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  printing: 'bg-orange-100 text-orange-800',
  quality_check: 'bg-indigo-100 text-indigo-800',
  packaging: 'bg-pink-100 text-pink-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
}

export default function TrackOrderPage() {
  const [searchValue, setSearchValue] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [hasIssue, setHasIssue] = useState(false) // Simulate order with issue

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

  const handleSubmitNewFile = () => {
    if (uploadedFile) {
      // Simulate file submission

      alert("New file submitted successfully! We'll review it and update your order.")
      setUploadedFile(null)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!searchValue.trim()) {
      setError('Please enter an order number or email')
      return
    }

    // Navigate to the detailed tracking page
    window.location.href = `/track/${searchValue.trim().toUpperCase()}`

    /* Original simulation code (kept for reference)
    setLoading(true)
    setHasIssue(false)
    setTimeout(() => {
      if (searchValue.toLowerCase().includes('grp')) {
        // Simulate that some orders have issues (e.g., if order number contains "123")
        const orderHasIssue = searchValue.includes('123')
        setHasIssue(orderHasIssue)
        setOrder({
          orderNumber: searchValue.toUpperCase(),
          status: orderHasIssue ? 'processing' : 'shipped',
          email: 'customer@example.com',
          createdAt: '2024-01-15',
          estimatedDelivery: '2024-01-20',
          items: [
            { name: 'Business Cards (500)', quantity: 1, price: '$299.00' },
            { name: 'Flyers (1000)', quantity: 1, price: '$450.00' }
          ],
          timeline: [
            {
              status: 'Order Placed',
              timestamp: '2024-01-15 10:30 AM',
              description: 'Your order has been received',
              completed: true
            },
            {
              status: 'Payment Confirmed',
              timestamp: '2024-01-15 10:31 AM',
              description: 'Payment processed successfully',
              completed: true
            },
            {
              status: 'In Production',
              timestamp: '2024-01-15 2:00 PM',
              description: 'Your items are being printed',
              completed: true
            },
            {
              status: 'Quality Check',
              timestamp: '2024-01-16 9:00 AM',
              description: 'Ensuring print quality meets standards',
              completed: true
            },
            {
              status: 'Shipped',
              timestamp: '2024-01-17 3:00 PM',
              description: 'Package handed to carrier',
              completed: true
            },
            {
              status: 'Delivered',
              timestamp: '',
              description: 'Estimated delivery',
              completed: false
            }
          ],
          trackingNumber: '1234567890',
          carrier: 'FedEx'
        })
      } else {
        setError('Order not found. Please check your order number or email.')
        setOrder(null)
      }
      setLoading(false)
    }, 1000) */
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
        <p className="text-muted-foreground mb-8">
          Enter your order number or email address to track your order status
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Lookup</CardTitle>
            <CardDescription>
              Enter your order number (e.g., GRP-12345) or the email used for the order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex gap-3" onSubmit={handleSearch}>
              <Input
                required
                className="flex-1"
                placeholder="Order number or email"
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <Button disabled={loading} type="submit">
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Searching...' : 'Track Order'}
              </Button>
            </form>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </CardContent>
        </Card>

        {order && (
          <>
            {/* Alert if order has issue */}
            {hasIssue && (
              <Alert className="mb-6 border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle>File Issue Detected</AlertTitle>
                <AlertDescription>
                  We've detected an issue with your print file. Please upload a corrected version
                  below to avoid delays.
                </AlertDescription>
              </Alert>
            )}

            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Order #{order.orderNumber}</CardTitle>
                    <CardDescription>Placed on {order.createdAt}</CardDescription>
                  </div>
                  <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Estimated Delivery
                    </p>
                    <p className="font-semibold">{order.estimatedDelivery}</p>
                  </div>

                  {order.trackingNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Tracking Information
                      </p>
                      <p className="font-semibold">
                        {order.carrier}: {order.trackingNumber}
                      </p>
                      <Button className="px-0 h-auto text-sm" variant="link">
                        Track on {order.carrier} website →
                      </Button>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Order Items</p>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between py-2 border-b last:border-0"
                        >
                          <span className="text-sm">
                            {item.name} x {item.quantity}
                          </span>
                          <span className="text-sm font-medium">{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
                <CardDescription>
                  Track your order&apos;s journey from placement to delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.timeline.map((step, index) => {
                    const Icon = statusIcons[step.status] || Package
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="relative flex flex-col items-center">
                          <div
                            className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${
                              step.completed ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                            }
                          `}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {index < order.timeline.length - 1 && (
                            <div
                              className={`
                              absolute top-10 w-0.5 h-16
                              ${step.completed ? 'bg-primary' : 'bg-gray-200'}
                            `}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <p className={`font-semibold ${!step.completed && 'text-gray-400'}`}>
                            {step.status}
                          </p>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          {step.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">{step.timestamp}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* File Upload Card (only shown when there's an issue) */}
            {hasIssue && (
              <Card>
                <CardHeader>
                  <CardTitle>Upload Corrected File</CardTitle>
                  <CardDescription>
                    Please upload a new version of your design file to resolve the issue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="corrected-file">Select File</Label>
                      <div className="mt-2 border-2 border-dashed rounded-lg p-4">
                        <Input
                          accept=".pdf,.ai,.psd,.jpg,.jpeg,.png"
                          className="hidden"
                          id="corrected-file"
                          type="file"
                          onChange={handleFileUpload}
                        />
                        <Label
                          className="cursor-pointer flex flex-col items-center justify-center"
                          htmlFor="corrected-file"
                        >
                          <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            PDF, AI, PSD, JPG, PNG (max. 100MB)
                          </span>
                        </Label>
                      </div>
                    </div>

                    {uploadedFile && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{uploadedFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setUploadedFile(null)}>
                          Remove
                        </Button>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      disabled={!uploadedFile}
                      onClick={handleSubmitNewFile}
                    >
                      Submit Corrected File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
