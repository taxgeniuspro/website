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
import { Search, Download, Eye, BarChart3, Calendar, Loader2, FileText, FolderOpen } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

  // Fetch forms when component mounts or year changes
  useEffect(() => {
    if (isLoaded && permissions) {
      fetchForms();
    }
  }, [selectedYear, isLoaded, permissions]);

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

  // Helper to get category badge styling
  const getCategoryBadgeClass = (category: string) => {
    const classes: Record<string, string> = {
      'individual': 'bg-blue-100 text-blue-800 border-blue-300',
      'business': 'bg-purple-100 text-purple-800 border-purple-300',
      'employment': 'bg-green-100 text-green-800 border-green-300',
      'information': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'state': 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return classes[category.toLowerCase()] || '';
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header - Mobile responsive */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Tax Forms Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage tax forms library and view usage statistics
        </p>
      </div>

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 sm:p-4 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Forms</CardTitle>
            <div className="hidden sm:flex p-2 bg-primary/10 rounded-full">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-4 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{forms.length}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Active: {forms.filter((f) => f.isActive).length}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 sm:p-4 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Downloads</CardTitle>
            <div className="hidden sm:flex p-2 bg-green-500/10 rounded-full">
              <Download className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-4 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Avg: {forms.length > 0 ? (totalDownloads / forms.length).toFixed(1) : 0} per form
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 sm:p-4 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Size</CardTitle>
            <div className="hidden sm:flex p-2 bg-purple-500/10 rounded-full">
              <FolderOpen className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-4 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">{(totalSize / 1024 / 1024).toFixed(1)} MB</div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Avg: {forms.length > 0 ? (totalSize / forms.length / 1024).toFixed(0) : 0} KB per form
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter - Mobile responsive */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            {availableYears.length > 1 && (
              <Select
                value={selectedYear?.toString() || 'all'}
                onValueChange={(value) => setSelectedYear(value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-[140px] h-10">
                  <Calendar className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Year" />
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
          {/* Results count on mobile */}
          <div className="mt-2 text-xs text-muted-foreground sm:hidden">
            {filteredForms.length} form{filteredForms.length !== 1 ? 's' : ''} found
          </div>
        </CardContent>
      </Card>

      {/* Forms List */}
      {filteredForms.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No forms found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ===== MOBILE VIEW (< 640px) - Stack Cards ===== */}
          <div className="sm:hidden space-y-3">
            {filteredForms.map((form) => (
              <Card key={form.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-3">
                  {/* Header with form number and status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">{form.formNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">{form.title}</p>
                      </div>
                    </div>
                    {form.isActive ? (
                      <Badge variant="default" className="shrink-0 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 text-xs">Inactive</Badge>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Badge variant="outline" className={cn('text-xs', getCategoryBadgeClass(form.category))}>
                      {form.category.replace('_', ' ')}
                    </Badge>
                    <span>·</span>
                    <span>{form.taxYear}</span>
                    <span>·</span>
                    <span>{(form.fileSize / 1024).toFixed(0)} KB</span>
                    <span>·</span>
                    <span>{form.downloadCount} downloads</span>
                  </div>

                  {/* Download Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9"
                    onClick={() => handleDownload(form.id, form.formNumber)}
                    disabled={!canDownload || !form.isActive}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ===== TABLET VIEW (640px - 1024px) - Grid Cards ===== */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:hidden gap-4">
            {filteredForms.map((form) => (
              <Card key={form.id} className="hover:shadow-md hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">{form.formNumber}</h3>
                        {form.isActive ? (
                          <Badge variant="default" className="shrink-0">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{form.title}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="outline" className={cn('ml-2 text-xs', getCategoryBadgeClass(form.category))}>
                        {form.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Year:</span>
                      <span className="ml-2 font-medium">{form.taxYear}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2 font-medium">{(form.fileSize / 1024).toFixed(0)} KB</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Downloads:</span>
                      <span className="ml-2 font-medium">{form.downloadCount}</span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownload(form.id, form.formNumber)}
                    disabled={!canDownload || !form.isActive}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ===== DESKTOP VIEW (>= 1024px) - Table ===== */}
          <Card className="hidden lg:block">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Forms Library</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {filteredForms.length} form{filteredForms.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Form Number</TableHead>
                      <TableHead className="font-semibold">Title</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Year</TableHead>
                      <TableHead className="font-semibold">Size</TableHead>
                      <TableHead className="font-semibold">Downloads</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredForms.map((form, index) => (
                      <TableRow
                        key={form.id}
                        className={cn(
                          "hover:bg-muted/30 transition-colors",
                          index % 2 === 0 && "bg-muted/5"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{form.formNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <span className="truncate block">{form.title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', getCategoryBadgeClass(form.category))}>
                            {form.category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{form.taxYear}</TableCell>
                        <TableCell>{(form.fileSize / 1024).toFixed(0)} KB</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3 text-muted-foreground" />
                            {form.downloadCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {form.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">Active</Badge>
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
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
