'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Upload,
  X,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LogoUploadCardProps {
  currentLogoUrl: string | null;
  onLogoUpdated: (newLogoUrl: string | null) => void;
  isFinalized?: boolean;
}

export function LogoUploadCard({ currentLogoUrl, onLogoUpdated, isFinalized }: LogoUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload the image
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/profile/qr-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      const result = await response.json();
      setPreviewUrl(result.qrCodeLogoUrl);
      onLogoUpdated(result.qrCodeLogoUrl);

      toast.success('Logo updated successfully! QR codes will use your new logo.', {
        duration: 5000,
      });

      // If tracking code is finalized, remind user about QR regeneration
      if (isFinalized) {
        toast.info('Your existing QR codes still have the old logo. New QR codes will use the updated logo.', {
          duration: 7000,
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove your custom logo? This will revert to the default Tax Genius logo.')) {
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/profile/qr-logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove logo');
      }

      setPreviewUrl(null);
      onLogoUpdated(null);
      toast.success('Logo removed. Using default Tax Genius logo.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          QR Code Logo
        </CardTitle>
        <CardDescription>
          Customize the logo that appears in your QR codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Upload your photo or business logo to personalize your QR codes. Recommended: square image, 200x200px minimum.
          </AlertDescription>
        </Alert>

        {/* Current Logo Preview */}
        {previewUrl ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Current Logo</Label>
            <div className="relative flex justify-center p-6 bg-white rounded-lg border">
              <img
                src={previewUrl}
                alt="Current QR logo"
                className="w-32 h-32 rounded-lg object-cover"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={handleRemoveLogo}
                disabled={isUploading}
                title="Remove logo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Custom logo active - this will appear in all new QR codes</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span>Using default Tax Genius logo in QR codes</span>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          } ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            {isUploading ? 'Uploading...' : 'Drop your logo here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or WEBP • Max 5MB • Square recommended
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
        </div>

        {/* Action Button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
          variant={previewUrl ? 'outline' : 'default'}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : previewUrl ? 'Upload New Logo' : 'Upload Logo'}
        </Button>

        {/* Finalized Warning */}
        {isFinalized && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Changing your logo will not affect existing printed QR codes.
              Only newly generated QR codes will use the new logo.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
