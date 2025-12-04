'use client';

import { useEffect, useState, useRef, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Camera,
  File,
  Check,
  X,
  Loader2,
  AlertCircle,
  Clock,
  FolderOpen,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function PublicUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, [resolvedParams.token]);

  const validateToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/upload/${resolvedParams.token}`);
      const data = await response.json();

      if (!data.valid) {
        setError(data.error || 'Invalid upload link');
        setLoading(false);
        return;
      }

      setLinkData(data);
      setLoading(false);
    } catch (err) {
      logger.error('Failed to validate token', err);
      setError('Failed to load upload page');
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      toast.success(`${files.length} file(s) selected`);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/upload/${resolvedParams.token}`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      logger.info('Files uploaded successfully', data);
      setUploadComplete(true);
      toast.success(`Successfully uploaded ${selectedFiles.length} file(s)!`);
    } catch (err: any) {
      logger.error('Upload failed', err);
      toast.error(err.message || 'Failed to upload files');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading upload page...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Upload Link Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4">
              <p className="text-sm text-red-900 dark:text-red-100">
                This link may have expired or been deactivated. Please contact your tax preparer for
                a new upload link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (uploadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-6 h-6" />
              <CardTitle>Upload Complete!</CardTitle>
            </div>
            <CardDescription>Your files have been uploaded successfully</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-6 text-center">
              <Check className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-medium mb-2">
                {selectedFiles.length} file(s) uploaded to "{linkData.folder.name}"
              </p>
              <p className="text-sm text-muted-foreground">
                {linkData.preparer.firstName} {linkData.preparer.lastName} has been notified and will
                review your documents shortly.
              </p>
            </div>

            <Button
              onClick={() => {
                setSelectedFiles([]);
                setUploadComplete(false);
              }}
              variant="outline"
              className="w-full"
            >
              Upload More Files
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main upload UI
  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 p-4">
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Upload Your Documents</h1>
          <p className="text-muted-foreground">
            Securely upload your tax documents to {linkData.preparer.firstName}{' '}
            {linkData.preparer.lastName}
            {linkData.preparer.companyName && ` - ${linkData.preparer.companyName}`}
          </p>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">{linkData.folder.name}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">
                    {linkData.client.firstName} {linkData.client.lastName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Link Expires</p>
                  <p className="font-medium">
                    {new Date(linkData.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {linkData.maxUploads && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  📊 Upload Limit: {linkData.uploadCount} of {linkData.maxUploads} files used
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Files to Upload</CardTitle>
            <CardDescription>
              Upload documents from your device or use your camera to take photos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="h-24 flex-col gap-2"
              >
                <Camera className="w-8 h-8" />
                <span>Take Photos</span>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 flex-col gap-2"
              >
                <File className="w-8 h-8" />
                <span>Choose Files</span>
              </Button>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <File className="w-5 h-5 flex-shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : 'Files'}
                </>
              )}
            </Button>

            {/* Help Text */}
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Accepted file types:</strong> Images (JPG, PNG), PDF, Word documents, Excel spreadsheets
                <br />
                <strong>Maximum file size:</strong> 10MB per file
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Powered by <strong>Tax Genius Pro</strong>
            <br />
            Your files are encrypted and secure
          </p>
        </div>
      </div>
    </div>
  );
}
