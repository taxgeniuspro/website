'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, Eye, BarChart3, Calendar, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  category: string;
  taxYear: number;
  fileName: string;
  fileSize: number;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminTaxFormsPage() {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [forms, setForms] = useState<TaxForm[]>([]);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 🎛️ Check permissions
  const role = user?.role as UserRole | undefined;
  const permissions = role
    ? getUserPermissions(role, user?.permissions as any)
    : null;

  // Extract micro-permissions for tax forms features
  const canView = permissions?.taxforms_view ?? permissions?.clientFileCenter ?? false;
  const canDownload = permissions?.taxforms_download ?? permissions?.clientFileCenter ?? false;
  const canUpload = permissions?.taxforms_upload ?? false; // Admin only
  const canDelete = permissions?.taxforms_delete ?? false; // Admin only

  // Redirect if no access
  useEffect(() => {
    if (isLoaded && (!user || !permissions?.taxForms)) {
      redirect('/forbidden');
    }
  }, [isLoaded, user, permissions]);

  // Show loading skeleton while checking auth
  if (!isLoaded || !permissions) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-5 w-64 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <TableSkeleton rows={10} columns={7} />
      </div>
    );
  }

  useEffect(() => {
    fetchForms();
  }, [selectedYear]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const url = selectedYear ? `/api/tax-forms?taxYear=${selectedYear}` : '/api/tax-forms';
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setForms(data.forms);

        // Extract unique years from all forms (only on initial load)
        if (!selectedYear && data.forms.length > 0) {
          const years = Array.from(new Set(data.forms.map((f: TaxForm) => f.taxYear))).sort(
            (a, b) => (b as number) - (a as number)
          );
          setAvailableYears(years as number[]);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load tax forms',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error fetching tax forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax forms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredForms = forms.filter(
    (form) =>
      form.formNumber.toLowerCase().includes(search.toLowerCase()) ||
      form.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalDownloads = forms.reduce((sum, form) => sum + form.downloadCount, 0);
  const totalSize = forms.reduce((sum, form) => sum + form.fileSize, 0);

  const handleDownload = async (formId: string, formNumber: string) => {
    try {
      const response = await fetch(`/api/tax-forms/${formId}/download`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: `Form ${formNumber} downloaded successfully`,
      });

      // Refresh to update download count
      fetchForms();
    } catch (error) {
      logger.error('Error downloading form:', error);
      toast({
        title: 'Error',
        description: 'Failed to download form',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading tax forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tax Forms Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage tax forms library and view usage statistics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forms.length}</div>
            <p className="text-xs text-muted-foreground">
              Active: {forms.filter((f) => f.isActive).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {(totalDownloads / forms.length).toFixed(1)} per form
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalSize / 1024 / 1024).toFixed(1)} MB</div>
            <p className="text-xs text-muted-foreground">
              Avg: {(totalSize / forms.length / 1024).toFixed(0)} KB per form
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by form number or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {availableYears.length > 1 && (
          <Select
            value={selectedYear?.toString() || 'all'}
            onValueChange={(value) => setSelectedYear(value === 'all' ? null : parseInt(value))}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tax Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Forms Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Downloads</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredForms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.formNumber}</TableCell>
                  <TableCell>{form.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{form.category.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>{form.taxYear}</TableCell>
                  <TableCell>{(form.fileSize / 1024).toFixed(0)} KB</TableCell>
                  <TableCell>{form.downloadCount}</TableCell>
                  <TableCell>
                    {form.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(form.id, form.formNumber)}
                      disabled={!canDownload || !form.isActive}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
