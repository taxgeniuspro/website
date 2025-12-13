'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Search,
  Share2,
  FileText,
  Package,
  Calendar,
  CheckSquare,
  Square,
  Mail,
  Link2,
  Copy,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description?: string;
  category: string;
  taxYear: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  downloadCount: number;
}

interface GroupedForms {
  MAIN_FORMS: TaxForm[];
  SCHEDULES_1040: TaxForm[];
  FORMS_1099: TaxForm[];
  TAX_CREDITS: TaxForm[];
  BUSINESS_FORMS: TaxForm[];
  OTHER_FORMS: TaxForm[];
  INSTRUCTIONS: TaxForm[];
}

const categoryLabels: Record<string, string> = {
  MAIN_FORMS: 'Main Forms',
  SCHEDULES_1040: '1040 Schedules',
  FORMS_1099: '1099 Forms',
  TAX_CREDITS: 'Tax Credits',
  BUSINESS_FORMS: 'Business Forms',
  OTHER_FORMS: 'Other Forms',
  INSTRUCTIONS: 'Instructions',
};

export default function TaxPreparerFormsPage() {
  const [forms, setForms] = useState<TaxForm[]>([]);
  const [groupedForms, setGroupedForms] = useState<Partial<GroupedForms>>({});
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());

  const { toast } = useToast();

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
        setGroupedForms(data.groupedForms);

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

  const handleDownload = async (formId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/tax-forms/${formId}/download`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: `${fileName} downloaded successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to download form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error downloading form:', error);
      toast({
        title: 'Error',
        description: 'Failed to download form',
        variant: 'destructive',
      });
    }
  };

  const toggleFormSelection = (formId: string) => {
    const newSelection = new Set(selectedForms);
    if (newSelection.has(formId)) {
      newSelection.delete(formId);
    } else {
      newSelection.add(formId);
    }
    setSelectedForms(newSelection);
  };

  const handleShareSelected = async () => {
    if (selectedForms.size === 0) {
      toast({
        title: 'No forms selected',
        description: 'Please select at least one form to share',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/tax-forms/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds: Array.from(selectedForms) }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show shareable links
        const links = data.shares.map((s: any) => s.shareUrl).join('\n');
        navigator.clipboard.writeText(links);

        toast({
          title: 'Success',
          description: `${selectedForms.size} form(s) shared. Links copied to clipboard!`,
        });

        setSelectedForms(new Set());
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to share forms',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error sharing forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to share forms',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDownload = async () => {
    if (selectedForms.size === 0) {
      toast({
        title: 'No forms selected',
        description: 'Please select at least one form to download',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Preparing download...',
        description: 'Creating ZIP file with selected forms',
      });

      const response = await fetch('/api/tax-forms/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds: Array.from(selectedForms) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TaxForms_${selectedForms.size}_Forms.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: `Downloaded ${selectedForms.size} form(s) as ZIP`,
        });

        setSelectedForms(new Set());
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create bulk download',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error bulk downloading forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to create bulk download',
        variant: 'destructive',
      });
    }
  };

  const handleShareForm = async (form: TaxForm) => {
    try {
      const response = await fetch('/api/tax-forms/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds: [form.id] }),
      });

      const data = await response.json();

      if (response.ok && data.shares?.[0]) {
        const shareUrl = data.shares[0].shareUrl;
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link Copied!',
          description: `Share link for ${form.formNumber} copied to clipboard`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create share link',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error sharing form:', error);
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive',
      });
    }
  };

  const handleEmailForm = (form: TaxForm) => {
    const subject = encodeURIComponent(`Tax Form: ${form.formNumber} - ${form.title}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find the ${form.formNumber} (${form.title}) tax form attached or download it from the link below.\n\nBest regards`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const filteredForms = forms.filter(
    (form) =>
      form.formNumber.toLowerCase().includes(search.toLowerCase()) ||
      form.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderFormRow = (form: TaxForm) => (
    <div
      key={form.id}
      className={`flex items-center gap-4 p-4 border-b hover:bg-muted/50 transition-colors cursor-pointer ${
        selectedForms.has(form.id) ? 'bg-primary/10' : ''
      }`}
      onClick={() => toggleFormSelection(form.id)}
    >
      {/* Checkbox */}
      <div className="shrink-0">
        {selectedForms.has(form.id) ? (
          <CheckSquare className="h-5 w-5 text-primary" />
        ) : (
          <Square className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Form Icon */}
      <div className="shrink-0">
        <FileText className="h-8 w-8 text-primary" />
      </div>

      {/* Form Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base">{form.formNumber}</span>
          <Badge variant="outline" className="text-xs">
            {form.taxYear}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{form.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {form.downloadCount} downloads • {(form.fileSize / 1024).toFixed(0)} KB
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(form.id, form.fileName);
          }}
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleShareForm(form);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleEmailForm(form);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email to Client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

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
        <h1 className="text-3xl font-bold">Tax Forms Library</h1>
        <p className="text-muted-foreground mt-2">
          Browse, download, and share IRS tax forms with your clients
        </p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex-1 relative">
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
        {selectedForms.size > 0 && (
          <div className="flex gap-2">
            <Button onClick={handleBulkDownload} variant="outline" className="whitespace-nowrap">
              <Package className="h-4 w-4 mr-2" />
              Download ZIP ({selectedForms.size})
            </Button>
            <Button onClick={handleShareSelected} className="whitespace-nowrap">
              <Share2 className="h-4 w-4 mr-2" />
              Share Selected ({selectedForms.size})
            </Button>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-2">
          <TabsTrigger value="all">
            All Forms{' '}
            <Badge variant="secondary" className="ml-2">
              {forms.length}
            </Badge>
          </TabsTrigger>
          {Object.entries(groupedForms).map(([category, categoryForms]) => (
            <TabsTrigger key={category} value={category}>
              {categoryLabels[category]}
              <Badge variant="secondary" className="ml-2">
                {categoryForms?.length || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Forms */}
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {(search ? filteredForms : forms).map(renderFormRow)}
              </div>
              {(search ? filteredForms : forms).length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No forms found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category-specific tabs */}
        {Object.entries(groupedForms).map(([category, categoryForms]) => (
          <TabsContent key={category} value={category} className="mt-6">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {(search
                    ? categoryForms?.filter(
                        (form) =>
                          form.formNumber.toLowerCase().includes(search.toLowerCase()) ||
                          form.title.toLowerCase().includes(search.toLowerCase())
                      )
                    : categoryForms
                  )?.map(renderFormRow)}
                </div>
                {(search
                  ? categoryForms?.filter(
                      (form) =>
                        form.formNumber.toLowerCase().includes(search.toLowerCase()) ||
                        form.title.toLowerCase().includes(search.toLowerCase())
                    )
                  : categoryForms
                )?.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No forms found in this category</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
