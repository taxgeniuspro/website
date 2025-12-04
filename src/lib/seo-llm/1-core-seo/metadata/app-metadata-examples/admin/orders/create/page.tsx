'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Send,
  CreditCard,
  Package,
  MapPin,
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react'
import Link from 'next/link'
import {
  CustomerSelector,
  type Customer,
  type NewCustomerData,
} from '@/components/admin/orders/customer-selector'
import { AddressForm, type AddressFormData } from '@/components/admin/orders/address-form'
import { toast } from 'sonner'

export default function CreateOrderPage() {
  const router = useRouter()

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState<NewCustomerData | null>(null)

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<AddressFormData>({
    name: '',
    company: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    phone: '',
  })

  // Billing address state
  const [useSameAddress, setUseSameAddress] = useState(true)
  const [billingAddress, setBillingAddress] = useState<AddressFormData>({
    name: '',
    company: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    phone: '',
  })

  // Order items state (simplified for now)
  const [orderItems, setOrderItems] = useState<
    Array<{
      id: string
      productName: string
      productSku: string
      quantity: number
      price: number
    }>
  >([])

  // Order notes
  const [adminNotes, setAdminNotes] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  // Payment terms
  const [paymentDueDays, setPaymentDueDays] = useState(30)
  const [customMessage, setCustomMessage] = useState('')

  // Loading states
  const [isSendingInvoice, setIsSendingInvoice] = useState(false)
  const [isTakingPayment, setIsTakingPayment] = useState(false)

  // Calculate order totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 0 // Will be calculated based on address
  const tax = Math.round(subtotal * 0.0875) // 8.75% tax (example)
  const total = subtotal + shipping + tax

  // Validation
  const isValid = () => {
    if (!selectedCustomer && !newCustomer) {
      toast.error('Please select or create a customer')
      return false
    }
    if (
      !shippingAddress.name ||
      !shippingAddress.street ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.zipCode
    ) {
      toast.error('Please complete the shipping address')
      return false
    }
    if (orderItems.length === 0) {
      toast.error('Please add at least one product')
      return false
    }
    return true
  }

  const handleSendInvoice = async () => {
    if (!isValid()) return

    setIsSendingInvoice(true)
    try {
      const response = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: selectedCustomer || newCustomer,
          shippingAddress,
          billingAddress: useSameAddress ? shippingAddress : billingAddress,
          items: orderItems,
          adminNotes,
          customerNotes,
          paymentDueDays,
          customMessage,
          sendInvoice: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const { order } = await response.json()
      toast.success(`Invoice ${order.invoiceNumber} sent successfully`)
      router.push(`/admin/orders/${order.id}`)
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice')
    } finally {
      setIsSendingInvoice(false)
    }
  }

  const handleTakePayment = async () => {
    if (!isValid()) return

    setIsTakingPayment(true)
    try {
      const response = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: selectedCustomer || newCustomer,
          shippingAddress,
          billingAddress: useSameAddress ? shippingAddress : billingAddress,
          items: orderItems,
          adminNotes,
          customerNotes,
          takePayment: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const { order } = await response.json()
      toast.success('Order created successfully')
      router.push(`/admin/orders/${order.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create order')
    } finally {
      setIsTakingPayment(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Order</h1>
          <p className="text-muted-foreground">
            Create an order on behalf of a customer and send invoice or take payment
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Send Invoice:</strong> Creates order and emails invoice to customer for online
          payment. <strong>Take Payment:</strong> Record immediate payment (phone order, in-person,
          manual methods).
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <CustomerSelector
            newCustomer={newCustomer}
            selectedCustomer={selectedCustomer}
            onCreateNew={setNewCustomer}
            onSelectExisting={setSelectedCustomer}
          />

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
              <CardDescription>Where should we ship this order?</CardDescription>
            </CardHeader>
            <CardContent>
              <AddressForm data={shippingAddress} title="shipping" onChange={setShippingAddress} />
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Address
              </CardTitle>
              <CardDescription>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    checked={useSameAddress}
                    className="h-4 w-4"
                    type="checkbox"
                    onChange={(e) => setUseSameAddress(e.target.checked)}
                  />
                  Same as shipping address
                </label>
              </CardDescription>
            </CardHeader>
            {!useSameAddress && (
              <CardContent>
                <AddressForm data={billingAddress} title="billing" onChange={setBillingAddress} />
              </CardContent>
            )}
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
              <CardDescription>Add products to this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No products added yet</p>
                    <p className="text-sm mt-1">Product selection interface coming soon</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">Qty: {item.quantity}</p>
                            <p className="font-medium">${(item.price / 100).toFixed(2)}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setOrderItems(orderItems.filter((i) => i.id !== item.id))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button disabled className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="adminNotes">Admin Notes (Internal Only)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Internal notes about this order..."
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="customerNotes">Customer Notes (Visible to Customer)</Label>
                <Textarea
                  id="customerNotes"
                  placeholder="Special instructions or notes for the customer..."
                  rows={3}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? 'Calculated at checkout' : `$${(shipping / 100).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${(tax / 100).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>

              {orderItems.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Add products to see accurate totals
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>Configure payment terms and message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paymentDueDays">Payment Due (Days)</Label>
                <Input
                  id="paymentDueDays"
                  max={90}
                  min={1}
                  type="number"
                  value={paymentDueDays}
                  onChange={(e) => setPaymentDueDays(parseInt(e.target.value) || 30)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Payment will be due {paymentDueDays} days from order date
                </p>
              </div>
              <div>
                <Label htmlFor="customMessage">Custom Message (Optional)</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Add a custom message to the invoice email..."
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3 sticky top-6">
            <Button
              className="w-full"
              disabled={isSendingInvoice || isTakingPayment || orderItems.length === 0}
              size="lg"
              onClick={handleSendInvoice}
            >
              {isSendingInvoice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invoice...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invoice
                </>
              )}
            </Button>
            <Button
              className="w-full"
              disabled={isSendingInvoice || isTakingPayment || orderItems.length === 0}
              size="lg"
              variant="outline"
              onClick={handleTakePayment}
            >
              {isTakingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Take Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
