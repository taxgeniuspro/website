'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X, FileText, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string;
  category: string;
}

const documentCategories = [
  { id: 'w2', label: 'W-2 Forms', description: 'Income from employers' },
  { id: '1099', label: '1099 Forms', description: 'Self-employment, interest, etc.' },
  { id: 'receipts', label: 'Receipts', description: 'Deductible expenses' },
  { id: 'mortgage', label: 'Mortgage Documents', description: '1098 forms' },
  { id: 'other', label: 'Other Documents', description: 'Additional tax documents' },
];

export default function DocumentUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentCategory, setCurrentCategory] = useState('w2');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null, fromCamera: boolean = false) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      // Upload each file to the server
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', currentCategory);

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();

        // Create file object for UI
        const fileObj: UploadedFile = {
          id: result.document.id,
          name: result.document.fileName,
          type: file.type,
          size: result.document.fileSize,
          category: currentCategory,
        };

        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const preview = e.target?.result as string;
            setUploadedFiles((prev) =>
              prev.map((f) => (f.id === fileObj.id ? { ...f, preview } : f))
            );
          };
          reader.readAsDataURL(file);
        }

        setUploadedFiles((prev) => [...prev, fileObj]);
      }
    } catch (error) {
      logger.error('Error uploading files:', error);
      alert('Failed to upload one or more files. Please try again.');
    } finally {
      setIsUploading(false);

      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryFiles = (categoryId: string) => {
    return uploadedFiles.filter((f) => f.category === categoryId);
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Tax Documents</CardTitle>
          <CardDescription>
            Use your phone camera to take pictures or upload files from your computer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documentCategories.map((category) => {
              const filesInCategory = getCategoryFiles(category.id);
              const isActive = currentCategory === category.id;

              return (
                <div
                  key={category.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setCurrentCategory(category.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{category.label}</h3>
                        {filesInCategory.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          >
                            {filesInCategory.length} uploaded
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    {isActive && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                  </div>

                  {/* Upload Buttons for Active Category */}
                  {isActive && (
                    <div className="flex gap-3 mt-4">
                      {/* Camera Button (Mobile) */}
                      <Button
                        type="button"
                        variant="default"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          cameraInputRef.current?.click();
                        }}
                        disabled={isUploading}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </Button>

                      {/* File Upload Button */}
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  )}

                  {/* Uploaded Files Preview */}
                  {filesInCategory.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {filesInCategory.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 bg-background border rounded-lg"
                        >
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(file.id);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Camera Input (Mobile Only) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files, true)}
      />

      {/* Summary */}
      {uploadedFiles.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Upload Summary</h3>
                <p className="text-sm text-muted-foreground">
                  Total documents: {uploadedFiles.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2 mb-4">
              {documentCategories.map((category) => {
                const count = getCategoryFiles(category.id).length;
                if (count === 0) return null;

                return (
                  <div key={category.id} className="flex items-center justify-between text-sm">
                    <span>{category.label}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </div>

            <Button size="lg" className="w-full">
              Continue to Review
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>💡 Tip: Make sure documents are clear and fully visible</p>
        <p>📱 Mobile users: Use "Take Photo" for best results</p>
        <p>💻 Desktop users: Upload scanned documents or photos</p>
      </div>
    </div>
  );
}
