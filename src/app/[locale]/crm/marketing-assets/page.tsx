'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Download,
  Star,
  Loader2,
  Camera,
  Building2,
  Palette,
  X,
  QrCode,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { logger } from '@/lib/logger';

interface MarketingAsset {
  id: string;
  category: 'profile_photo' | 'logo' | 'office' | 'custom';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  isPrimary: boolean;
  createdAt: string;
}

export default function MarketingAssetsPage() {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasRedirected = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState<'profile_photo' | 'logo' | 'office' | 'custom'>('profile_photo');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrLogoInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qrLogoFile, setQrLogoFile] = useState<File | null>(null);
  const [qrLogoPreview, setQrLogoPreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [currentQrLogo, setCurrentQrLogo] = useState<string | null>(null);

  // 🎛️ Check permissions (memoized to prevent infinite loops)
  const role = user?.role as UserRole | undefined;
  const permissions = useMemo(() => {
    return role ? getUserPermissions(role, user?.permissions as any) : null;
  }, [role, user?.permissions]);

  // Extract micro-permissions for marketing assets features
  const canView = permissions?.marketing_view ?? permissions?.marketingAssets ?? false;
  const canDownload = permissions?.marketing_download ?? permissions?.marketingAssets ?? false;
  const canUpload = permissions?.marketing_upload ?? false;
  const canDelete = permissions?.marketing_delete ?? false;

  // Check if user has marketing assets permission
  const hasMarketingAssetsPermission = permissions?.marketingAssets ?? false;

  // Redirect if no access (client-side redirect, only once)
  useEffect(() => {
    if (isLoaded && !hasRedirected.current) {
      if (!user || !hasMarketingAssetsPermission) {
        hasRedirected.current = true;
        router.push('/forbidden');
      }
    }
  }, [isLoaded, user, hasMarketingAssetsPermission, router]);

  // Show loading while checking auth
  if (!isLoaded || !permissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Fetch marketing assets
  const { data: assets, isLoading } = useQuery({
    queryKey: ['marketing-assets'],
    queryFn: async () => {
      const response = await fetch('/api/crm/marketing-assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      return data.assets as MarketingAsset[];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadProgress(0);
      const response = await fetch('/api/crm/marketing-assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setUploadProgress(100);
      return response.json();
    },
    onSuccess: () => {
      toast.success('Asset uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['marketing-assets'] });
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setSelectedCategory('profile_photo');
    },
    onError: (error: any) => {
      logger.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload asset');
      setUploadProgress(0);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await fetch(`/api/crm/marketing-assets/${assetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete asset');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Asset deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['marketing-assets'] });
    },
    onError: (error: any) => {
      logger.error('Delete failed:', error);
      toast.error('Failed to delete asset');
    },
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await fetch(`/api/crm/marketing-assets/${assetId}/set-primary`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to set primary');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Primary photo updated');
      queryClient.invalidateQueries({ queryKey: ['marketing-assets'] });
    },
    onError: (error: any) => {
      logger.error('Set primary failed:', error);
      toast.error('Failed to set primary');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', selectedCategory);

    await uploadMutation.mutateAsync(formData);
    setUploading(false);
  };

  const handleDelete = (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    deleteMutation.mutate(assetId);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'profile_photo':
        return <Camera className="w-4 h-4" />;
      case 'logo':
        return <Palette className="w-4 h-4" />;
      case 'office':
        return <Building2 className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'profile_photo':
        return 'Profile Photo';
      case 'logo':
        return 'Logo';
      case 'office':
        return 'Office';
      default:
        return 'Custom';
    }
  };

  const groupedAssets = assets?.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {} as Record<string, MarketingAsset[]>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Assets</h1>
        <p className="text-muted-foreground">
          Upload and manage photos for your marketing materials
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Marketing Asset
          </CardTitle>
          <CardDescription>
            Choose a category and select an image to upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Asset Category</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'profile_photo', label: 'Profile Photo', icon: <Camera className="w-4 h-4" /> },
                { value: 'logo', label: 'Logo', icon: <Palette className="w-4 h-4" /> },
                { value: 'office', label: 'Office', icon: <Building2 className="w-4 h-4" /> },
                { value: 'custom', label: 'Custom', icon: <ImageIcon className="w-4 h-4" /> },
              ].map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.value as any)}
                  className="justify-center flex-col h-auto py-3"
                >
                  {cat.icon}
                  <span className="mt-1 text-xs">{cat.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <Label>Image File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {selectedFile ? selectedFile.name : 'Choose Image'}
            </Button>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative aspect-video max-w-md rounded-lg border overflow-hidden bg-muted">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
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
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2 justify-end">
            {selectedFile && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                Clear
              </Button>
            )}
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Code Integration Info */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Marketing Assets + Tracking Codes
          </CardTitle>
          <CardDescription>
            Your marketing materials work with your tracking code to track referrals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Create Your Flyers & Materials</p>
                <p className="text-muted-foreground">
                  Upload your photos here (profile, logo, office) to use in marketing materials
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Add Your Tracking Code / QR Code</p>
                <p className="text-muted-foreground">
                  Include your tracking QR code on flyers, business cards, and marketing materials
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Track Your Results</p>
                <p className="text-muted-foreground">
                  Monitor clicks and conversions from your marketing materials
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button asChild variant="outline" className="w-full">
              <a href="/dashboard/tax-preparer/tracking">
                View Tracking Dashboard & Download QR Codes
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            How to Use Your Marketing Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Camera className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Profile Photo</p>
                  <p className="text-muted-foreground">
                    Your professional headshot for business cards and flyers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Palette className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Logo</p>
                  <p className="text-muted-foreground">Your business logo for branding materials</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Office Photos</p>
                  <p className="text-muted-foreground">
                    Showcase your office space on marketing materials
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ImageIcon className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Custom Graphics</p>
                  <p className="text-muted-foreground">
                    Any other images for your marketing campaigns
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !groupedAssets || Object.keys(groupedAssets).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Assets Yet</h3>
            <p className="text-muted-foreground">
              Upload your first marketing asset using the form above
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAssets).map(([category, categoryAssets]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {getCategoryLabel(category)}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({categoryAssets.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categoryAssets.map((asset) => (
                    <div key={asset.id} className="relative group">
                      <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                        <Image
                          src={asset.fileUrl}
                          alt={asset.fileName}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Asset Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {category === 'profile_photo' && !asset.isPrimary && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPrimaryMutation.mutate(asset.id)}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" asChild>
                          <a href={asset.fileUrl} download={asset.fileName}>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Primary Badge */}
                      {asset.isPrimary && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-yellow-500 text-white rounded-full p-1">
                            <Star className="w-3 h-3 fill-current" />
                          </div>
                        </div>
                      )}

                      {/* File Info */}
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        {asset.fileName}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
