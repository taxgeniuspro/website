'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface EasyUploadProps {
  clientId?: string; // For tax preparers uploading on behalf of client
  onUploadComplete?: () => void;
  defaultTaxYear?: number;
  showFolderPicker?: boolean;
  compact?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface FolderOption {
  id: string;
  name: string;
  path: string;
  level: number;
}

const DOCUMENT_CATEGORIES = [
  { value: 'w2', label: 'W-2 Forms', icon: '📄' },
  { value: '1099', label: '1099 Forms', icon: '📋' },
  { value: 'receipts', label: 'Receipts', icon: '🧾' },
  { value: 'mortgage', label: 'Mortgage Documents', icon: '🏠' },
  { value: 'id', label: 'ID Documents', icon: '🪪' },
  { value: 'bank', label: 'Bank Statements', icon: '🏦' },
  { value: 'other', label: 'Other', icon: '📁' },
];

// Generate tax year options (current year and past 5 years)
const currentYear = new Date().getFullYear();
const TAX_YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// Get icon based on file type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

export function EasyUpload({
  clientId,
  onUploadComplete,
  defaultTaxYear,
  showFolderPicker = true,
  compact = false,
}: EasyUploadProps) {
  const queryClient = useQueryClient();

  // Default to previous year year-round (only changes on Jan 1st)
  const [taxYear, setTaxYear] = useState<number>(defaultTaxYear || currentYear - 1);
  const [category, setCategory] = useState<string>('other');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // Fetch available folders
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['easy-upload-folders', clientId],
    queryFn: async () => {
      const url = clientId ? `/api/folders?clientId=${clientId}` : '/api/folders';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
    enabled: showFolderPicker,
  });

  const folders: FolderOption[] = foldersData?.folders || [];

  // Get the currently selected folder for display
  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  // Build folder display name with path indicator
  const getFolderDisplayName = (folder: FolderOption) => {
    const indent = '  '.repeat(folder.level);
    return `${indent}${folder.level > 0 ? '└ ' : ''}${folder.name}`;
  };

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

        // If uploading to specific folder
        if (selectedFolderId) {
          formData.append('folderId', selectedFolderId);
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
        // Invalidate file queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['file-manager-files'] });
        queryClient.invalidateQueries({ queryKey: ['easy-upload-folders'] });
        onUploadComplete?.();
      }, 3000);
    },
    [category, taxYear, clientId, selectedFolderId, onUploadComplete, queryClient]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Compact Upload Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-muted-foreground/25'}
            hover:border-primary hover:bg-primary/5
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="font-medium text-primary">Drop files here!</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Drag & drop files or <span className="text-primary font-medium">click to browse</span>
            </p>
          )}
        </div>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((uf, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {uf.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                {uf.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {uf.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                <span className="truncate flex-1">{uf.file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Upload className="w-5 h-5 text-primary" />
          Upload Documents
        </CardTitle>
        <CardDescription>
          Drag and drop your files or click to browse. Select a folder and category to organize your documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Settings Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Folder Picker */}
          {showFolderPicker && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Upload to Folder
              </Label>
              <Select
                value={selectedFolderId || 'root'}
                onValueChange={(v) => setSelectedFolderId(v === 'root' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a folder">
                    {selectedFolderId ? (
                      <span className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-amber-500" />
                        {selectedFolder?.name || 'Selected Folder'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Root (My Documents)
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <span className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Root (My Documents)
                    </span>
                  </SelectItem>
                  {foldersLoading ? (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </SelectItem>
                  ) : (
                    folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <span className="flex items-center gap-1">
                          {'  '.repeat(folder.level)}
                          {folder.level > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                          <Folder className="w-4 h-4 text-amber-500" />
                          {folder.name}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tax Year */}
          <div className="space-y-2">
            <Label>Tax Year</Label>
            <Select value={taxYear.toString()} onValueChange={(v) => setTaxYear(parseInt(v))}>
              <SelectTrigger>
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

          {/* Document Category */}
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Folder Display */}
        {selectedFolder && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <Folder className="w-4 h-4 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-300">
              Uploading to: <strong>{selectedFolder.path}</strong>
            </span>
          </div>
        )}

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-300 ease-out
            ${isDragActive
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className={`transition-transform duration-200 ${isDragActive ? 'scale-110' : ''}`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
          {isDragActive ? (
            <p className="text-xl font-semibold text-primary animate-pulse">Drop your files here!</p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium">
                Drag & drop files here, or{' '}
                <span className="text-primary">click to browse</span>
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, Images, Word, Excel files up to 10MB
              </p>
            </div>
          )}
        </div>

        {/* Uploading Files */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Upload Progress</Label>
            {uploadingFiles.map((uf, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(uf.file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{uf.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uf.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      {uf.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </div>
                      )}
                      {uf.status === 'success' && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-600">Complete</span>
                        </div>
                      )}
                      {uf.status === 'error' && (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="text-sm text-red-600">Failed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {uf.status === 'uploading' && (
                    <Progress value={50} className="h-1.5" />
                  )}

                  {uf.status === 'success' && (
                    <Progress value={100} className="h-1.5 bg-green-100 [&>div]:bg-green-500" />
                  )}

                  {uf.status === 'error' && uf.error && (
                    <p className="text-xs text-red-600 mt-2">{uf.error}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <strong>Tips:</strong> For best results, scan documents clearly and upload PDFs when possible.
          Organize documents by tax year for easier access.
        </div>
      </CardContent>
    </Card>
  );
}
