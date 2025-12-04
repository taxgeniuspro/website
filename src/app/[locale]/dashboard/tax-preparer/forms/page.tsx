'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShareFormDialog } from '@/components/tax-forms/ShareFormDialog';
import { Search, FileText, Share2, Eye, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description?: string;
  category: string;
  taxYear: number;
  downloadCount: number;
}

interface ClientForm {
  id: string;
  status: string;
  taxYear: number;
  progress: number;
  createdAt: string;
  lastEditedAt: string;
  taxForm: {
    id: string;
    formNumber: string;
    title: string;
    category: string;
  };
  client: {
    id: string;
    name: string;
  };
  share: {
    shareToken: string;
    shareUrl: string;
    accessCount: number;
    lastAccessAt?: string;
  } | null;
}

export default function TaxPreparerFormsPage() {
  const [taxForms, setTaxForms] = useState<TaxForm[]>([]);
  const [clientForms, setClientForms] = useState<ClientForm[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    fetchTaxForms();
    fetchClientForms();
  }, []);

  const fetchTaxForms = async () => {
    try {
      const response = await fetch('/api/tax-forms');
      if (!response.ok) throw new Error('Failed to fetch forms');
      
      const data = await response.json();
      setTaxForms(data.forms || []);
    } catch (error: any) {
      toast.error('Failed to load tax forms', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientForms = async () => {
    try {
      const response = await fetch('/api/client-forms');
      if (!response.ok) throw new Error('Failed to fetch client forms');
      
      const data = await response.json();
      setClientForms(data.forms || []);
    } catch (error: any) {
      toast.error('Failed to load client forms', {
        description: error.message,
      });
    }
  };

  const filteredTaxForms = taxForms.filter(
    (form) =>
      form.formNumber.toLowerCase().includes(search.toLowerCase()) ||
      form.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClientForms = clientForms.filter(
    (form) =>
      form.taxForm.formNumber.toLowerCase().includes(search.toLowerCase()) ||
      form.taxForm.title.toLowerCase().includes(search.toLowerCase()) ||
      form.client.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'secondary';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'outline';
      case 'REVIEWED':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <Clock className="h-3 w-3" />;
      case 'IN_PROGRESS':
        return <AlertCircle className="h-3 w-3" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'REVIEWED':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tax Forms</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Share forms with clients and track progress
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available" className="gap-2">
            <FileText className="h-4 w-4" />
            Available Forms
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Share2 className="h-4 w-4" />
            Shared Forms ({clientForms.length})
          </TabsTrigger>
        </TabsList>

        {/* Available Forms Tab */}
        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>IRS Tax Forms</CardTitle>
              <CardDescription>
                Select a form to share with your clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Form Number</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTaxForms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No forms found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTaxForms.map((form) => (
                          <TableRow key={form.id}>
                            <TableCell className="font-medium">{form.formNumber}</TableCell>
                            <TableCell>{form.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{form.category}</Badge>
                            </TableCell>
                            <TableCell>{form.taxYear}</TableCell>
                            <TableCell className="text-right">
                              <ShareFormDialog
                                formId={form.id}
                                formNumber={form.formNumber}
                                formTitle={form.title}
                              >
                                <Button size="sm" variant="default" className="gap-2">
                                  <Share2 className="h-3 w-3" />
                                  Share
                                </Button>
                              </ShareFormDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shared Forms Tab */}
        <TabsContent value="shared" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Forms Shared with Clients</CardTitle>
              <CardDescription>
                Track form progress and manage client submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Form</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientForms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No forms shared yet. Share a form with a client to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredClientForms.map((form) => (
                          <TableRow key={form.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{form.taxForm.formNumber}</div>
                                <div className="text-xs text-muted-foreground">{form.taxForm.title}</div>
                              </div>
                            </TableCell>
                            <TableCell>{form.client.name}</TableCell>
                            <TableCell>{form.taxYear}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(form.status)} className="gap-1">
                                {getStatusIcon(form.status)}
                                {form.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${form.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{form.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {form.share?.lastAccessAt
                                ? new Date(form.share.lastAccessAt).toLocaleDateString()
                                : 'Not accessed'}
                            </TableCell>
                            <TableCell className="text-right">
                              {form.share && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  asChild
                                >
                                  <a href={`/shared-forms/${form.share.shareToken}`} target="_blank">
                                    <Eye className="h-3 w-3" />
                                    View
                                  </a>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
