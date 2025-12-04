'use client';

import { FileManager } from '@/components/file-manager/FileManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ClientDocumentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Documents</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Upload and manage your tax documents
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload your tax documents securely. Documents are organized by folders and can be
            downloaded anytime. Note: You cannot delete documents once uploaded - please contact
            your tax preparer if you need to remove a document.
          </AlertDescription>
        </Alert>

        {/* File Manager */}
        <FileManager
          viewMode="list"
          showTree={false} // Hide tree on mobile - cleaner experience
          allowUpload={true}
          allowFolderCreate={true}
          allowDelete={false} // Clients cannot delete
          allowMove={false} // Clients cannot move files
          allowShare={false} // Clients cannot share
        />
      </div>
    </div>
  );
}
