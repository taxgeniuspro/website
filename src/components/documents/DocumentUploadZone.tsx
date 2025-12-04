'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface DocumentUploadZoneProps {
  clientId?: string; // For tax preparers uploading on behalf of client
  onUploadComplete?: () => void;
  defaultTaxYear?: number;
  folderId?: string | null; // NEW: Folder to upload to
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'w2', label: 'W-2 Forms' },
  { value: '1099', label: '1099 Forms' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'mortgage', label: 'Mortgage Documents' },
  { value: 'other', label: 'Other' },
];

// Generate tax year options (current year and past 5 years)
const currentYear = new Date().getFullYear();
const TAX_YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export function DocumentUploadZone({
  clientId,
  onUploadComplete,
  defaultTaxYear,
  folderId,
}: DocumentUploadZoneProps) {
  // Default to previous year year-round (only changes on Jan 1st)
  const [taxYear, setTaxYear] = useState<number>(defaultTaxYear || currentYear - 1);
  const [category, setCategory] = useState<string>('other');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!category) {
        toast.error('Please select a document category');
        return;
      }

      // Add files to uploading state
      const newFiles = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Upload each file
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        formData.append('taxYear', taxYear.toString());

        // If uploading on behalf of client (tax preparer)
        if (clientId) {
          formData.append('clientId', clientId);
        }

        // NEW: If uploading to specific folder
        if (folderId) {
          formData.append('folderId', folderId);
        }

        try {
          const uploadUrl = clientId
            ? '/api/tax-preparer/documents/upload'
            : '/api/documents/upload';

          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
          }

          const data = await response.json();

          // Update file status to success
          setUploadingFiles((prev) =>
            prev.map((uf) => (uf.file === file ? { ...uf, progress: 100, status: 'success' } : uf))
          );

          toast.success(`${file.name} uploaded successfully`);
        } catch (error) {
          logger.error('Error uploading file:', error);

          // Update file status to error
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file
                ? {
                    ...uf,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : uf
            )
          );

          toast.error(`Failed to upload ${file.name}`);
        }
      }

      // Clear completed uploads after 3 seconds
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((uf) => uf.status === 'uploading'));
        onUploadComplete?.();
      }, 3000);
    },
    [category, taxYear, clientId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="taxYear">Tax Year</Label>
          <Select value={taxYear.toString()} onValueChange={(v) => setTaxYear(parseInt(v))}>
            <SelectTrigger id="taxYear">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAX_YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Document Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              hover:border-primary hover:bg-primary/5
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, images, Word docs, and Excel files (max 10MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Uploading Files</Label>
          {uploadingFiles.map((uf, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{uf.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(uf.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    {uf.status === 'uploading' && (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    )}
                    {uf.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {uf.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                </div>

                {uf.status === 'uploading' && <Progress value={uf.progress} className="h-1" />}

                {uf.status === 'error' && uf.error && (
                  <p className="text-sm text-red-600 mt-2">{uf.error}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
