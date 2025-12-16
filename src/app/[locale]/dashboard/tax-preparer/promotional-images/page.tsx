'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  Snowflake,
  Users,
  FileText,
  Gift,
  Info,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';

type FolderType = 'preseason_loans' | 'tax_season_lead' | 'tax_season_intake' | 'client_referral';

interface ReferralImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  altText: string;
  platform: string | null;
  downloadCount: number;
  sortOrder: number;
}

interface ImageFolder {
  id: string;
  name: string;
  folderType: FolderType;
  isActive: boolean;
  imageCount: number;
  images: ReferralImage[];
  defaultImages: { id: string; imageUrl: string; thumbnailUrl: string | null; altText: string }[];
  usingDefault: boolean;
}

interface FolderTypeInfo {
  displayName: string;
  dateRange: string;
  description: string;
}

const FOLDER_TYPE_ICONS: Record<FolderType, typeof Snowflake> = {
  preseason_loans: Snowflake,
  tax_season_lead: Users,
  tax_season_intake: FileText,
  client_referral: Gift,
};

export default function PromotionalImagesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FolderType>('client_referral');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadPlatform, setUploadPlatform] = useState('');

  // Fetch folders
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    folderTypeInfo: Record<FolderType, FolderTypeInfo>;
    folders: ImageFolder[];
  }>({
    queryKey: ['preparer-referral-images'],
    queryFn: async () => {
      const response = await fetch('/api/tax-preparer/referral-images');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, folderType, altText, platform }: {
      file: File;
      folderType: FolderType;
      altText: string;
      platform: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderType', folderType);
      formData.append('altText', altText);
      formData.append('platform', platform);

      const response = await fetch('/api/tax-preparer/referral-images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparer-referral-images'] });
      toast.success('Image uploaded successfully');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadAltText('');
      setUploadPlatform('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(`/api/tax-preparer/referral-images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete image');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparer-referral-images'] });
      toast.success('Image deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate({
      file: selectedFile,
      folderType: activeTab,
      altText: uploadAltText,
      platform: uploadPlatform,
    });
  };

  const getCurrentFolder = (): ImageFolder | undefined => {
    return data?.folders.find(f => f.folderType === activeTab);
  };

  const getFolderInfo = (): FolderTypeInfo | undefined => {
    return data?.folderTypeInfo[activeTab];
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Images</CardTitle>
            <CardDescription>Failed to load your promotional images. Please try again.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentFolder = getCurrentFolder();
  const folderInfo = getFolderInfo();
  const Icon = FOLDER_TYPE_ICONS[activeTab];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="w-8 h-8" />
            Promotional Images
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your promotional images for different campaigns and seasons
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How Image Selection Works</p>
              <p>
                When you upload images to a folder, your clients and leads will see YOUR images in emails and social shares.
                If you don&apos;t upload images, the system will automatically use Tax Genius default images instead.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FolderType)}>
        <TabsList className="grid w-full grid-cols-4">
          {(['preseason_loans', 'tax_season_lead', 'tax_season_intake', 'client_referral'] as FolderType[]).map((type) => {
            const folder = data?.folders.find(f => f.folderType === type);
            const TypeIcon = FOLDER_TYPE_ICONS[type];
            const info = data?.folderTypeInfo[type];
            return (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2 relative">
                <TypeIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{info?.displayName || type}</span>
                <Badge
                  variant={folder?.imageCount && folder.imageCount > 0 ? 'default' : 'secondary'}
                  className="ml-1 h-5 px-1.5 text-xs"
                >
                  {folder?.imageCount || 0}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content */}
        {(['preseason_loans', 'tax_season_lead', 'tax_season_intake', 'client_referral'] as FolderType[]).map((type) => (
          <TabsContent key={type} value={type} className="mt-6">
            <FolderContent
              folder={data?.folders.find(f => f.folderType === type)}
              folderInfo={data?.folderTypeInfo[type]}
              onUploadClick={() => setUploadDialogOpen(true)}
              onDeleteClick={(imageId) => deleteMutation.mutate(imageId)}
              isDeleting={deleteMutation.isPending}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Upload to {folderInfo?.displayName}
            </DialogTitle>
            <DialogDescription>
              Upload a promotional image for {folderInfo?.dateRange}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="relative w-32 h-32 mx-auto">
                    <Image
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? 'Drop the image here' : 'Drag & drop or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP up to 5MB</p>
                </div>
              )}
            </div>

            {/* Alt Text */}
            <div className="space-y-2">
              <Label htmlFor="altText">Alt Text (optional)</Label>
              <Input
                id="altText"
                placeholder="Describe the image..."
                value={uploadAltText}
                onChange={(e) => setUploadAltText(e.target.value)}
              />
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label htmlFor="platform">Best For (optional)</Label>
              <Select value={uploadPlatform} onValueChange={setUploadPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="all">All Platforms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Folder Content Component
function FolderContent({
  folder,
  folderInfo,
  onUploadClick,
  onDeleteClick,
  isDeleting,
}: {
  folder?: ImageFolder;
  folderInfo?: FolderTypeInfo;
  onUploadClick: () => void;
  onDeleteClick: (imageId: string) => void;
  isDeleting: boolean;
}) {
  if (!folder || !folderInfo) return null;

  const Icon = FOLDER_TYPE_ICONS[folder.folderType];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {folderInfo.displayName}
              <Badge variant="outline" className="ml-2">
                {folderInfo.dateRange}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">{folderInfo.description}</CardDescription>
          </div>
          <Button onClick={onUploadClick} disabled={folder.imageCount >= 4}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {folder.usingDefault && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Using Tax Genius Default Images</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Upload your own images to personalize emails and social shares for your clients.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Your Images */}
          {folder.images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square relative rounded-lg overflow-hidden border bg-muted">
                <Image
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={image.altText}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <a
                  href={image.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                >
                  <Download className="h-4 w-4 text-gray-800" />
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 bg-red-500 rounded-full hover:bg-red-600">
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this image. If you have no images in this folder, the system will use Tax Genius default images.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteClick(image.id)}
                        className="bg-red-500 hover:bg-red-600"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {image.platform && (
                <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                  {image.platform}
                </Badge>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {folder.images.length < 4 && Array.from({ length: 4 - folder.images.length }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={onUploadClick}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs">Upload</span>
            </button>
          ))}
        </div>

        {/* Default Images Preview (when using defaults) */}
        {folder.usingDefault && folder.defaultImages.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Default Images Being Used:</h4>
            <div className="grid grid-cols-4 gap-2">
              {folder.defaultImages.map((img) => (
                <div key={img.id} className="aspect-square relative rounded-lg overflow-hidden border opacity-60">
                  <Image
                    src={img.thumbnailUrl || img.imageUrl}
                    alt={img.altText}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Count */}
        <p className="text-sm text-muted-foreground mt-4">
          {folder.imageCount} of 4 images uploaded
        </p>
      </CardContent>
    </Card>
  );
}
