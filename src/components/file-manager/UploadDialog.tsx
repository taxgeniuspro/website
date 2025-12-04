'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentUploadZone } from '@/components/documents/DocumentUploadZone';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  clientId?: string;
}

export function UploadDialog({ open, onOpenChange, folderId, clientId }: UploadDialogProps) {
  const queryClient = useQueryClient();

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['file-manager-files'] });
    queryClient.invalidateQueries({ queryKey: ['file-manager-folders'] });
    setTimeout(() => {
      onOpenChange(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <DocumentUploadZone
            clientId={clientId}
            folderId={folderId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
