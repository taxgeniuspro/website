'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/logger';
import { Package, Eye, Truck, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  customerImageUrl?: string | null;
}

interface Order {
  id: string;
  userId: string;
  paymentSessionId: string;
  paymentMethod: string;
  squareOrderId: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  email: string;
  shippingAddress: any;
  shippingMethod: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: {
    firstName: string | null;
    lastName: string | null;
  };
}

export default function AdminOrdersPage() {
  const { data: session } = useSession(); const user = session?.user;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      logger.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setShowDetailsDialog(true);
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber }),
      });

      if (response.ok) {
        await fetchOrders();
        setShowDetailsDialog(false);
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      logger.error('Failed to update order', error);
      alert('An error occurred');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      COMPLETED: { variant: 'default', label: 'Completed' },
      PROCESSING: { variant: 'default', label: 'Processing' },
      SHIPPED: { variant: 'default', label: 'Shipped' },
      DELIVERED: { variant: 'default', label: 'Delivered' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      REFUNDED: { variant: 'outline', label: 'Refunded' },
    };

    const config = variants[status] || variants.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      SQUARE: 'bg-blue-500',
      STRIPE: 'bg-purple-500',
      CASHAPP: 'bg-green-500',
    };

    return (
      <Badge className={colors[method] || 'bg-gray-500'} variant="secondary">
        {method}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground mt-2">View and manage customer orders</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Total Orders: <span className="font-bold text-foreground">{orders.length}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>Manage order fulfillment and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                Orders will appear here once customers make purchases
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {order.profile?.firstName} {order.profile?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{order.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{itemCount} item(s)</TableCell>
                      <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                      <TableCell>{getPaymentMethodBadge(order.paymentMethod)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetails(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order ID: {selectedOrder?.id}</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    {selectedOrder.profile?.firstName} {selectedOrder.profile?.lastName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    {selectedOrder.email}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {Array.isArray(selectedOrder.items) &&
                    selectedOrder.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-start p-3 bg-muted rounded-md"
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × ${item.price.toFixed(2)}
                          </div>
                          {item.customerImageUrl && (
                            <div className="text-xs text-blue-600 mt-1">
                              ⚠️ Customer uploaded custom image
                            </div>
                          )}
                        </div>
                        <div className="font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="font-semibold mb-2">Payment Information</h3>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Method: </span>
                    {selectedOrder.paymentMethod}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment ID: </span>
                    <span className="font-mono text-xs">{selectedOrder.paymentSessionId}</span>
                  </div>
                  {selectedOrder.squareOrderId && (
                    <div>
                      <span className="text-muted-foreground">Square Order ID: </span>
                      <span className="font-mono text-xs">{selectedOrder.squareOrderId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Info */}
              <div>
                <h3 className="font-semibold mb-2">Shipping Information</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="tracking">Tracking Number</Label>
                    <Input
                      id="tracking"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Method: {selectedOrder.shippingMethod || 'Not specified'}
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div>
                <h3 className="font-semibold mb-3">Update Order Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PROCESSING')}
                    disabled={updatingStatus}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Processing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')}
                    disabled={updatingStatus}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Shipped
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                    disabled={updatingStatus}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Delivered
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    disabled={updatingStatus}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
