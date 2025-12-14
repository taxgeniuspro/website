'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, FolderPlus, Folder } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ClientFolderSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  onSuccess?: (folder: { id: string; path: string; yearFolderId: string; yearPath: string }) => void;
}

export function ClientFolderSetupDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFolderSetupDialogProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState<number>(currentYear);
  const [isLoading, setIsLoading] = useState(false);

  // Generate year options (current year and 5 previous years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const response = await fetch('/api/tax-preparer/client-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          taxYear,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const data = await response.json();

      toast.success(`Folder structure created for ${client.firstName} ${client.lastName}`);

      // Invalidate queries to refresh folder lists
      queryClient.invalidateQueries({ queryKey: ['file-manager-folders'] });
      queryClient.invalidateQueries({ queryKey: ['file-manager-files'] });
      queryClient.invalidateQueries({ queryKey: ['tax-preparer-clients'] });
      queryClient.invalidateQueries({ queryKey: ['tax-preparer-client-folders'] });

      onSuccess?.(data.folder);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error creating client folder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate folder name preview
  const sanitizeName = (name: string) =>
    name
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const folderName = `${sanitizeName(client.lastName || 'Client')}-${sanitizeName(client.firstName || 'Unknown')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Set Up Client Folders
            </DialogTitle>
            <DialogDescription>
              Create a folder structure for {client.firstName} {client.lastName} to organize their
              tax documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="taxYear">Tax Year</Label>
              <Select
                value={String(taxYear)}
                onValueChange={(value) => setTaxYear(parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger id="taxYear">
                  <SelectValue placeholder="Select tax year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Folder Structure Preview */}
            <div className="space-y-2">
              <Label>Folder Structure Preview</Label>
              <div className="rounded-md border bg-muted/50 p-3 font-mono text-sm">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-primary" />
                  <span>{folderName}/</span>
                </div>
                <div className="ml-6 flex items-center gap-2 mt-1">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{taxYear}/</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Files uploaded for this client will be organized in this folder structure.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Folders
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
