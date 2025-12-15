'use client';

/**
 * Admin Referral Images Management Page
 *
 * Simple folder-based system:
 * - One "Tax Genius Default" folder with company-wide images
 * - One folder per tax preparer (auto-created when preparer is added)
 * - If preparer folder is empty, their referrals use the default images
 */

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Trash2, Download, Image as ImageIcon, Building2, User, Loader2, FolderOpen, AlertCircle, Check } from 'lucide-react';
import Image from 'next/image';

interface ReferralImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  altText: string;
  platform: string | null;
  downloadCount: number;
}

interface ImageFolder {
  id: string;
  name: string;
  description: string | null;
  category: 'default' | 'preparer';
  preparerId: string | null;
  preparerCode: string | null;
  isActive: boolean;
  imageCount: number;
  images: ReferralImage[];
  createdAt: string;
  updatedAt: string;
}

interface Preparer {
  id: string;
  firstName: string;
  lastName: string;
  customTrackingCode: string | null;
  email: string;
}

export default function AdminReferralImagesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('default');

  // Fetch all folders and preparers
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['admin-referral-folders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/referral-images');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  const { data: preparersData, isLoading: preparersLoading } = useQuery({
    queryKey: ['preparers-list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/preparers');
      if (!response.ok) throw new Error('Failed to fetch preparers');
      return response.json();
    },
  });

  // Initialize folders mutation (creates default + all preparer folders)
  const initFoldersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/referral-images/initialize', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to initialize folders');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-folders'] });
      toast.success(`Created ${data.created} folders`);
    },
    onError: () => {
      toast.error('Failed to initialize folders');
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(`/api/admin/referral-images/${imageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-folders'] });
      toast.success('Image deleted');
    },
    onError: () => {
      toast.error('Failed to delete image');
    },
  });

  const handleUploadClick = (folderId: string) => {
    setSelectedFolder(folderId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedFolder) return;

    // Limit to 4 images
    if (files.length > 4) {
      toast.error('Maximum 4 images allowed per folder');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('setId', selectedFolder);
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/admin/referral-images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload images');

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['admin-referral-folders'] });
      toast.success(`Uploaded ${result.images.length} images`);
    } catch {
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
      setSelectedFolder(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const folders: ImageFolder[] = foldersData?.imageSets || [];
  const preparers: Preparer[] = preparersData?.preparers || [];
  const isLoading = foldersLoading || preparersLoading;

  const defaultFolder = folders.find(f => f.category === 'default');
  const preparerFolders = folders.filter(f => f.category === 'preparer');

  // Find preparers without folders
  const preparersWithoutFolders = preparers.filter(
    p => !preparerFolders.some(f => f.preparerId === p.id)
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Referral Program Images</h1>
          <p className="text-muted-foreground">
            Manage promotional images for client referrals. Each preparer has their own folder.
          </p>
        </div>

        {preparersWithoutFolders.length > 0 && (
          <Button
            onClick={() => initFoldersMutation.mutate()}
            disabled={initFoldersMutation.isPending}
            className="bg-secondary hover:bg-secondary/90"
          >
            {initFoldersMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderOpen className="mr-2 h-4 w-4" />
                Initialize All Folders ({preparersWithoutFolders.length + (defaultFolder ? 0 : 1)})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> If a preparer&apos;s folder is empty, their referral emails will use the <strong>Tax Genius Default</strong> images.
          Upload custom images to a preparer&apos;s folder to personalize their referral materials.
        </AlertDescription>
      </Alert>

      {/* Tabs for Default vs Preparer Folders */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="default" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Tax Genius Default
            {defaultFolder && defaultFolder.imageCount > 0 && (
              <Badge variant="secondary" className="ml-1">{defaultFolder.imageCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preparers" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Tax Preparers
            <Badge variant="secondary" className="ml-1">{preparerFolders.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Default Folder Tab */}
        <TabsContent value="default" className="mt-6">
          {defaultFolder ? (
            <FolderCard
              folder={defaultFolder}
              isDefault={true}
              onUpload={handleUploadClick}
              onDeleteImage={(id) => deleteImageMutation.mutate(id)}
              isUploading={isUploading && selectedFolder === defaultFolder.id}
              isDeleting={deleteImageMutation.isPending}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Default folder not created yet</p>
                <Button
                  onClick={() => initFoldersMutation.mutate()}
                  disabled={initFoldersMutation.isPending}
                >
                  {initFoldersMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderOpen className="mr-2 h-4 w-4" />
                  )}
                  Create Default Folder
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preparer Folders Tab */}
        <TabsContent value="preparers" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {preparerFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isDefault={false}
                usesDefault={folder.imageCount === 0}
                onUpload={handleUploadClick}
                onDeleteImage={(id) => deleteImageMutation.mutate(id)}
                isUploading={isUploading && selectedFolder === folder.id}
                isDeleting={deleteImageMutation.isPending}
              />
            ))}

            {/* Show preparers without folders */}
            {preparersWithoutFolders.map((preparer) => (
              <Card key={preparer.id} className="border-dashed opacity-60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {preparer.firstName} {preparer.lastName}
                  </CardTitle>
                  <CardDescription>
                    {preparer.customTrackingCode && (
                      <Badge variant="outline" className="text-xs">
                        {preparer.customTrackingCode}
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Folder will be created when you click &quot;Initialize All Folders&quot;
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {preparerFolders.length === 0 && preparersWithoutFolders.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No tax preparers found. Add tax preparers first, then their folders will be created automatically.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Folder Card Component
interface FolderCardProps {
  folder: ImageFolder;
  isDefault: boolean;
  usesDefault?: boolean;
  onUpload: (folderId: string) => void;
  onDeleteImage: (imageId: string) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

function FolderCard({ folder, isDefault, usesDefault, onUpload, onDeleteImage, isUploading, isDeleting }: FolderCardProps) {
  return (
    <Card className={isDefault ? 'border-2 border-secondary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {isDefault ? (
                <Building2 className="h-4 w-4 text-secondary" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {folder.name}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              {folder.preparerCode && (
                <Badge variant="outline" className="text-xs">
                  {folder.preparerCode}
                </Badge>
              )}
              {usesDefault && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Using Default
                </Badge>
              )}
            </CardDescription>
          </div>
          <Badge className={isDefault ? 'bg-secondary' : 'bg-muted text-muted-foreground'}>
            {folder.imageCount}/4 images
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image Grid */}
        {folder.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {folder.images.map((image) => (
              <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <Image
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={image.altText}
                  fill
                  className="object-cover"
                />
                {/* Overlay with delete button */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteImage(image.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Download count */}
                {image.downloadCount > 0 && (
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {image.downloadCount}
                  </div>
                )}
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: 4 - folder.images.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onUpload(folder.id)}
              >
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onUpload(folder.id)}
          >
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDefault ? 'Add default promotional images' : 'Add custom images for this preparer'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Click to upload (max 4 images)</p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onUpload(folder.id)}
          disabled={isUploading || folder.imageCount >= 4}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : folder.imageCount >= 4 ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Folder Full
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Images ({4 - folder.imageCount} remaining)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
