'use client';

/**
 * Admin Referral Images Management Page
 *
 * 5 tabs:
 * - Tax Genius Defaults (4 folder types for company-wide images)
 * - Pre-Season Loans (Dec 1 - Jan 14) - Preparer folders
 * - Tax Season Lead (Jan 15 - Apr 15) - Preparer folders
 * - Tax Season Intake (Jan 15 - Apr 15) - Preparer folders
 * - Client Referral (Year-round) - Preparer folders
 *
 * If preparer folder is empty, system falls back to Tax Genius Default
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
import { Input } from '@/components/ui/input';
import {
  Upload,
  Trash2,
  Download,
  Image as ImageIcon,
  Building2,
  User,
  Loader2,
  FolderOpen,
  AlertCircle,
  Check,
  Search,
  Calendar,
  Snowflake,
  Users,
  FileText,
} from 'lucide-react';
import Image from 'next/image';

type FolderType = 'preseason_loans' | 'tax_season_lead' | 'tax_season_intake' | 'client_referral';

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
  folderType: FolderType;
  preparerId: string | null;
  preparerName: string | null;
  preparerCode: string | null;
  isActive: boolean;
  imageCount: number;
  images: ReferralImage[];
  createdAt: string;
  updatedAt: string;
}

interface FolderTypeInfo {
  displayName: string;
  dateRange: string;
  usedBy: string;
}

const FOLDER_TYPE_CONFIG: Record<FolderType, { displayName: string; dateRange: string; icon: typeof Snowflake; description: string }> = {
  preseason_loans: {
    displayName: 'Pre-Season Loans',
    dateRange: 'Dec 1 - Jan 14',
    icon: Snowflake,
    description: 'Promote pre-season loan products before tax season.',
  },
  tax_season_lead: {
    displayName: 'Tax Season Lead',
    dateRange: 'Jan 15 - Apr 15',
    icon: Users,
    description: 'Get new leads during tax season.',
  },
  tax_season_intake: {
    displayName: 'Tax Season Intake',
    dateRange: 'Jan 15 - Apr 15',
    icon: FileText,
    description: 'Get intake form completions during tax season.',
  },
  client_referral: {
    displayName: 'Client Referral',
    dateRange: 'Year-round',
    icon: Calendar,
    description: 'Clients share to earn $50-$100 referral bonuses.',
  },
};

const ALL_FOLDER_TYPES: FolderType[] = ['preseason_loans', 'tax_season_lead', 'tax_season_intake', 'client_referral'];

export default function AdminReferralImagesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('defaults');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all folders
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['admin-referral-folders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/referral-images');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  // Initialize folders mutation (creates all folder types for default + all preparers)
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
      toast.success(data.message || `Created ${data.created} folders`);
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
  const folderTypeInfo: Record<FolderType, FolderTypeInfo> = foldersData?.folderTypeInfo || {};
  const isLoading = foldersLoading;

  // Group folders by category and type
  const defaultFolders = folders.filter((f) => f.category === 'default');
  const preparerFolders = folders.filter((f) => f.category === 'preparer');

  // Group preparer folders by folderType
  const preparerFoldersByType: Record<FolderType, ImageFolder[]> = {
    preseason_loans: preparerFolders.filter((f) => f.folderType === 'preseason_loans'),
    tax_season_lead: preparerFolders.filter((f) => f.folderType === 'tax_season_lead'),
    tax_season_intake: preparerFolders.filter((f) => f.folderType === 'tax_season_intake'),
    client_referral: preparerFolders.filter((f) => f.folderType === 'client_referral'),
  };

  // Filter folders by search query
  const filterBySearch = (folderList: ImageFolder[]) => {
    if (!searchQuery.trim()) return folderList;
    const query = searchQuery.toLowerCase();
    return folderList.filter(
      (folder) =>
        folder.name.toLowerCase().includes(query) ||
        (folder.preparerCode && folder.preparerCode.toLowerCase().includes(query)) ||
        (folder.preparerName && folder.preparerName.toLowerCase().includes(query))
    );
  };

  // Check if initialization is needed
  const needsInitialization = defaultFolders.length < 4;

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
          <h1 className="text-2xl font-bold">Promotional Image Folders</h1>
          <p className="text-muted-foreground">
            Manage promotional images by season and purpose. Each preparer has 4 folders.
          </p>
        </div>

        {needsInitialization && (
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
                Initialize All Folders
              </>
            )}
          </Button>
        )}
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Fallback Logic:</strong> If a preparer&apos;s folder is empty for any type, the system uses the <strong>Tax Genius Default</strong> images of that same type.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Tax Genius Defaults
            <Badge variant="secondary" className="ml-1">{defaultFolders.length}/4</Badge>
          </TabsTrigger>
          {ALL_FOLDER_TYPES.map((folderType) => {
            const config = FOLDER_TYPE_CONFIG[folderType];
            const Icon = config.icon;
            const count = preparerFoldersByType[folderType].length;
            return (
              <TabsTrigger key={folderType} value={folderType} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {config.displayName}
                <Badge variant="secondary" className="ml-1">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Defaults Tab */}
        <TabsContent value="defaults" className="mt-6 space-y-4">
          <p className="text-muted-foreground">
            Company-wide default images used when a preparer&apos;s folder is empty.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ALL_FOLDER_TYPES.map((folderType) => {
              const config = FOLDER_TYPE_CONFIG[folderType];
              const folder = defaultFolders.find((f) => f.folderType === folderType);
              const Icon = config.icon;

              if (!folder) {
                return (
                  <Card key={folderType} className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {config.displayName}
                      </CardTitle>
                      <CardDescription>{config.dateRange}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">Not created yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => initFoldersMutation.mutate()}
                        disabled={initFoldersMutation.isPending}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Initialize
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  isDefault={true}
                  folderTypeConfig={config}
                  onUpload={handleUploadClick}
                  onDeleteImage={(id) => deleteImageMutation.mutate(id)}
                  isUploading={isUploading && selectedFolder === folder.id}
                  isDeleting={deleteImageMutation.isPending}
                />
              );
            })}
          </div>
        </TabsContent>

        {/* Preparer Folder Tabs (one per folder type) */}
        {ALL_FOLDER_TYPES.map((folderType) => {
          const config = FOLDER_TYPE_CONFIG[folderType];
          const typeFolders = filterBySearch(preparerFoldersByType[folderType]);
          const defaultFolderForType = defaultFolders.find((f) => f.folderType === folderType);

          return (
            <TabsContent key={folderType} value={folderType} className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground">{config.description}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Active Period:</strong> {config.dateRange}
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or tracking code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Results count */}
              {searchQuery && (
                <p className="text-sm text-muted-foreground">
                  Found {typeFolders.length} folder{typeFolders.length !== 1 ? 's' : ''}
                </p>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {typeFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    isDefault={false}
                    usesDefault={folder.imageCount === 0 && defaultFolderForType && defaultFolderForType.imageCount > 0}
                    folderTypeConfig={config}
                    onUpload={handleUploadClick}
                    onDeleteImage={(id) => deleteImageMutation.mutate(id)}
                    isUploading={isUploading && selectedFolder === folder.id}
                    isDeleting={deleteImageMutation.isPending}
                  />
                ))}
              </div>

              {typeFolders.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {searchQuery ? (
                      <>No preparers found matching &quot;{searchQuery}&quot;. Try a different search term.</>
                    ) : (
                      <>No preparer folders for this type. Click &quot;Initialize All Folders&quot; to create them.</>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// Folder Card Component
interface FolderCardProps {
  folder: ImageFolder;
  isDefault: boolean;
  usesDefault?: boolean;
  folderTypeConfig: { displayName: string; dateRange: string; icon: typeof Snowflake };
  onUpload: (folderId: string) => void;
  onDeleteImage: (imageId: string) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

function FolderCard({
  folder,
  isDefault,
  usesDefault,
  folderTypeConfig,
  onUpload,
  onDeleteImage,
  isUploading,
  isDeleting,
}: FolderCardProps) {
  const Icon = folderTypeConfig.icon;

  return (
    <Card className={isDefault ? 'border-2 border-secondary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {isDefault ? (
                <Icon className="h-4 w-4 text-secondary" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {isDefault ? folderTypeConfig.displayName : folder.name}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
              {isDefault && (
                <span className="text-xs">{folderTypeConfig.dateRange}</span>
              )}
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
            {folder.imageCount}/4
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image Grid */}
        {folder.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {folder.images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
              >
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
              {isDefault ? 'Add default images' : 'Add custom images'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Click to upload (max 4)</p>
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
              Upload ({4 - folder.imageCount} remaining)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
