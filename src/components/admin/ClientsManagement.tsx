'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Filter, Download, Upload } from 'lucide-react';

interface ClientsManagementProps {
  preparers: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  }>;
}

export function ClientsManagement({ preparers }: ClientsManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [preparerId, setPreparerId] = useState(searchParams.get('preparer') || 'all');
  const [importing, setImporting] = useState(false);
  const [importPreparerId, setImportPreparerId] = useState<string>('none');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);
    if (preparerId && preparerId !== 'all') params.set('preparer', preparerId);

    router.push(`/admin/clients-status?${params.toString()}`);
  }, [search, status, preparerId, router]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (preparerId && preparerId !== 'all') params.set('preparerId', preparerId);

    const url = `/api/admin/clients/export?${params.toString()}`;
    window.location.href = url;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (importPreparerId && importPreparerId !== 'none') {
        params.set('preparerId', importPreparerId);
      }

      const response = await fetch(`/api/admin/clients/import?${params.toString()}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `Successfully imported ${result.imported} new clients.\n` +
            `Updated ${result.updated} existing clients.\n` +
            `${result.skipped} skipped.` +
            (result.errors ? `\n\nErrors:\n${result.errors.slice(0, 5).join('\n')}` : '')
        );
        setImportDialogOpen(false);
        router.refresh();
      } else {
        alert(`Error: ${result.error}${result.details ? '\n' + result.details : ''}`);
      }
    } catch (error) {
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyFilters();
                }
              }}
            />
          </div>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="filed">Filed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={preparerId} onValueChange={setPreparerId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Preparer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Preparers</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {preparers.map((preparer) => (
              <SelectItem key={preparer.id} value={preparer.id}>
                {preparer.firstName && preparer.lastName
                  ? `${preparer.firstName} ${preparer.lastName}`
                  : preparer.email || preparer.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={applyFilters}>
          <Filter className="w-4 h-4 mr-2" />
          Apply Filters
        </Button>
      </div>

      {/* Export/Import Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Clients</DialogTitle>
              <DialogDescription>
                Upload a CSV file to import clients. Optionally assign them to a specific tax
                preparer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="import-preparer">Assign to Tax Preparer (Optional)</Label>
                <Select value={importPreparerId} onValueChange={setImportPreparerId}>
                  <SelectTrigger id="import-preparer">
                    <SelectValue placeholder="Select preparer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Do not assign</SelectItem>
                    {preparers.map((preparer) => (
                      <SelectItem key={preparer.id} value={preparer.id}>
                        {preparer.firstName && preparer.lastName
                          ? `${preparer.firstName} ${preparer.lastName}`
                          : preparer.email || preparer.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-file-admin">CSV File</Label>
                <input
                  type="file"
                  accept=".csv"
                  id="import-file-admin"
                  onChange={handleImport}
                  disabled={importing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
