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
  Filter,
  Package,
  Calendar,
  UserPlus,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssignFormDialog } from '@/components/tax-forms/AssignFormDialog';
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

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [formToAssign, setFormToAssign] = useState<{
    id: string;
    formNumber: string;
    title: string;
  } | null>(null);

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

  const handleOpenAssignDialog = (form: TaxForm) => {
    setFormToAssign({
      id: form.id,
      formNumber: form.formNumber,
      title: form.title,
    });
    setAssignDialogOpen(true);
  };

  const handleAssignmentSuccess = () => {
    toast({
      title: 'Form Assigned',
      description: 'The tax form has been assigned to your client successfully',
    });
  };

  const filteredForms = forms.filter(
    (form) =>
      form.formNumber.toLowerCase().includes(search.toLowerCase()) ||
      form.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderFormCard = (form: TaxForm) => (
    <Card
      key={form.id}
      className={`hover:shadow-lg transition-shadow cursor-pointer ${
        selectedForms.has(form.id) ? 'border-primary border-2' : ''
      }`}
      onClick={() => toggleFormSelection(form.id)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {form.formNumber}
            </CardTitle>
            <CardDescription className="mt-1">{form.title}</CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {form.taxYear}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {form.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{form.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
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
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAssignDialog(form);
            }}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Assign
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              toggleFormSelection(form.id);
            }}
          >
            {selectedForms.has(form.id) ? 'Deselect' : 'Select'}
          </Button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Downloads: {form.downloadCount} • {(form.fileSize / 1024).toFixed(0)} KB
        </div>
      </CardContent>
    </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(search ? filteredForms : forms).map(renderFormCard)}
          </div>
        </TabsContent>

        {/* Category-specific tabs */}
        {Object.entries(groupedForms).map(([category, categoryForms]) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(search
                ? categoryForms?.filter(
                    (form) =>
                      form.formNumber.toLowerCase().includes(search.toLowerCase()) ||
                      form.title.toLowerCase().includes(search.toLowerCase())
                  )
                : categoryForms
              )?.map(renderFormCard)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Assignment Dialog */}
      {formToAssign && (
        <AssignFormDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          formId={formToAssign.id}
          formNumber={formToAssign.formNumber}
          formTitle={formToAssign.title}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
}
