'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { FileManagerFile } from './FileManager';
import { formatDistanceToNow } from 'date-fns';
import { addRecentItem } from '@/lib/recent-items';

interface FilePreviewProps {
  file: FileManagerFile;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  // Track recently accessed document
  useEffect(() => {
    addRecentItem({
      id: file.id,
      type: 'document',
      title: file.fileName,
      subtitle: `${file.type} • ${file.taxYear}`,
      href: '/dashboard/tax-preparer/documents',
      metadata: {
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        status: file.status,
      },
    });
  }, [file.id]);

  // Ensure fileUrl uses /api/uploads prefix
  const fileUrl = file.fileUrl.startsWith('/api/uploads')
    ? file.fileUrl
    : file.fileUrl.replace('/uploads', '/api/uploads');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    // Ensure fileUrl uses /api/uploads prefix
    const fileUrl = file.fileUrl.startsWith('/api/uploads')
      ? file.fileUrl
      : file.fileUrl.replace('/uploads', '/api/uploads');
    a.href = fileUrl;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{file.fileName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="border rounded-lg overflow-hidden bg-muted min-h-[400px] flex items-center justify-center">
            {file.mimeType.startsWith('image/') ? (
              <img
                src={fileUrl}
                alt={file.fileName}
                className="max-w-full max-h-[600px] object-contain"
              />
            ) : file.mimeType === 'application/pdf' ? (
              <iframe src={fileUrl} className="w-full h-[600px]" title={file.fileName} />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <p className="mb-4">Preview not available for this file type</p>
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Size</p>
              <p className="font-medium">{formatFileSize(file.fileSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{file.type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax Year</p>
              <p className="font-medium">{file.taxYear}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Uploaded</p>
              <p className="font-medium">
                {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{file.status}</p>
            </div>
            {file.tags && file.tags.length > 0 && (
              <div>
                <p className="text-muted-foreground">Tags</p>
                <p className="font-medium">{file.tags.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
