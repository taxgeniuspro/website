'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Download,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Smartphone,
} from 'lucide-react';

interface Payment {
  id: string;
  type: 'advance' | 'repayment' | 'fee';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: 'card' | 'cash_app' | 'ach';
  date: string;
  description: string;
  receiptUrl?: string;
  last4?: string;
  cardBrand?: string;
}

interface PaymentHistoryProps {
  userId?: string;
  language?: 'en' | 'es';
}

export default function PaymentHistory({ userId, language = 'en' }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalAdvanced: 0,
    totalRepaid: 0,
    totalFees: 0,
    outstanding: 0,
  });

  const content = {
    en: {
      title: 'Payment History',
      description: 'Track all your advances and payments',
      totalAdvanced: 'Total Advanced',
      totalRepaid: 'Total Repaid',
      totalFees: 'Total Fees',
      outstanding: 'Outstanding Balance',
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
      status: 'Status',
      method: 'Method',
      actions: 'Actions',
      viewReceipt: 'Receipt',
      downloadStatement: 'Download Statement',
      noPayments: 'No payments yet',
      statusLabels: {
        pending: 'Pending',
        completed: 'Completed',
        failed: 'Failed',
        refunded: 'Refunded',
      },
      typeLabels: {
        advance: 'Cash Advance',
        repayment: 'Repayment',
        fee: 'Service Fee',
      },
      methodLabels: {
        card: 'Card',
        cash_app: 'Cash App',
        ach: 'Bank Transfer',
      },
    },
    es: {
      title: 'Historial de Pagos',
      description: 'Rastrea todos tus adelantos y pagos',
      totalAdvanced: 'Total Adelantado',
      totalRepaid: 'Total Reembolsado',
      totalFees: 'Total de Tarifas',
      outstanding: 'Saldo Pendiente',
      date: 'Fecha',
      description: 'Descripción',
      amount: 'Cantidad',
      status: 'Estado',
      method: 'Método',
      actions: 'Acciones',
      viewReceipt: 'Recibo',
      downloadStatement: 'Descargar Estado',
      noPayments: 'Sin pagos aún',
      statusLabels: {
        pending: 'Pendiente',
        completed: 'Completado',
        failed: 'Fallido',
        refunded: 'Reembolsado',
      },
      typeLabels: {
        advance: 'Adelanto en Efectivo',
        repayment: 'Reembolso',
        fee: 'Tarifa de Servicio',
      },
      methodLabels: {
        card: 'Tarjeta',
        cash_app: 'Cash App',
        ach: 'Transferencia Bancaria',
      },
    },
  };

  const t = content[language];

  useEffect(() => {
    fetchPayments();
  }, [userId]);

  const fetchPayments = async () => {
    setIsLoading(true);

    // Simulate API call (in production, fetch from database)
    setTimeout(() => {
      const mockPayments: Payment[] = [
        {
          id: '1',
          type: 'advance',
          amount: 2500.0,
          status: 'completed',
          method: 'cash_app',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Tax Advance - Instant Approval',
          receiptUrl: '/receipt/1',
        },
        {
          id: '2',
          type: 'fee',
          amount: 0,
          status: 'completed',
          method: 'card',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Processing Fee (Waived - Limited Time)',
          last4: '4242',
          cardBrand: 'VISA',
        },
        {
          id: '3',
          type: 'repayment',
          amount: 500.0,
          status: 'pending',
          method: 'ach',
          date: new Date().toISOString(),
          description: 'Scheduled Repayment',
        },
        {
          id: '4',
          type: 'advance',
          amount: 1500.0,
          status: 'completed',
          method: 'card',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Additional Advance',
          receiptUrl: '/receipt/4',
          last4: '5555',
          cardBrand: 'MASTERCARD',
        },
      ];

      setPayments(mockPayments);

      // Calculate totals
      const totalAdvanced = mockPayments
        .filter((p) => p.type === 'advance' && p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalRepaid = mockPayments
        .filter((p) => p.type === 'repayment' && p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalFees = mockPayments
        .filter((p) => p.type === 'fee' && p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      setTotals({
        totalAdvanced,
        totalRepaid,
        totalFees,
        outstanding: totalAdvanced - totalRepaid,
      });

      setIsLoading(false);
    }, 1000);
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'refunded':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'destructive';
      case 'refunded':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getMethodIcon = (method: Payment['method']) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'cash_app':
        return <Smartphone className="w-4 h-4" />;
      case 'ach':
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const formatAmount = (amount: number, type: Payment['type']) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    if (type === 'repayment' || type === 'fee') {
      return <span className="text-red-600">-{formatted}</span>;
    }
    return <span className="text-green-600">+{formatted}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.totalAdvanced}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ${totals.totalAdvanced.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.totalRepaid}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totals.totalRepaid.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.totalFees}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totals.totalFees.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.outstanding}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              ${totals.outstanding.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t.downloadStatement}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t.noPayments}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.description}</TableHead>
                  <TableHead>{t.amount}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.method}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{formatDate(payment.date)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.typeLabels[payment.type]}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatAmount(payment.amount, payment.type)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(payment.status) as any}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(payment.status)}
                          {t.statusLabels[payment.status]}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.method)}
                        <div>
                          <p className="text-sm">{t.methodLabels[payment.method]}</p>
                          {payment.last4 && (
                            <p className="text-xs text-muted-foreground">
                              {payment.cardBrand} ****{payment.last4}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.receiptUrl && (
                        <Button variant="ghost" size="sm">
                          <Receipt className="w-4 h-4 mr-1" />
                          {t.viewReceipt}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
