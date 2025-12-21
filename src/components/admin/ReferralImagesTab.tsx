'use client';

/**
 * Referral Images Management Tab
 * Embedded version of the Referral Images page for Marketing Hub
 */

import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Snowflake,
  Users,
  FileText,
  Gift,
  ExternalLink,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
}

interface PreparerGroup {
  preparerId: string;
  preparerName: string;
  preparerCode: string | null;
  folders: ImageFolder[];
  totalImages: number;
}

const FOLDER_TYPE_CONFIG: Record<FolderType, {
  displayName: string;
  shortName: string;
  dateRange: string;
  description: string;
  icon: typeof Snowflake;
  color: string;
}> = {
  preseason_loans: {
    displayName: 'Pre-Season Loans',
    shortName: 'Pre-Season',
    dateRange: 'Dec 1 - Jan 14',
    description: 'Promote pre-season loan products to attract early filers.',
    icon: Snowflake,
    color: 'bg-blue-500',
  },
  tax_season_lead: {
    displayName: 'Tax Season Lead',
    shortName: 'Lead',
    dateRange: 'Jan 15 - Apr 15',
    description: 'Get new leads during the main tax season.',
    icon: Users,
    color: 'bg-green-500',
  },
  tax_season_intake: {
    displayName: 'Tax Season Intake',
    shortName: 'Intake',
    dateRange: 'Jan 15 - Apr 15',
    description: 'Drive intake form completions from leads.',
    icon: FileText,
    color: 'bg-orange-500',
  },
  client_referral: {
    displayName: 'Client Referral',
    shortName: 'Referral',
    dateRange: 'Year-round',
    description: 'Images clients use when sharing referral links.',
    icon: Gift,
    color: 'bg-purple-500',
  },
};

const ALL_FOLDER_TYPES: FolderType[] = ['preseason_loans', 'tax_season_lead', 'tax_season_intake', 'client_referral'];

export function ReferralImagesTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreparerId, setSelectedPreparerId] = useState<string | null>(null);
  const [showDefaults, setShowDefaults] = useState(false);

  const { data: foldersData, isLoading } = useQuery({
    queryKey: ['admin-referral-folders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/referral-images');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  const initFoldersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/referral-images/initialize', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to initialize folders');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-folders'] });
      toast.success(data.message || `Created ${data.created} folders`);
    },
    onError: () => toast.error('Failed to initialize folders'),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(`/api/admin/referral-images/${imageId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-folders'] });
      toast.success('Image deleted');
    },
    onError: () => toast.error('Failed to delete image'),
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
    Array.from(files).forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('/api/admin/referral-images/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to upload images');
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['admin-referral-folders'] });
      toast.success(`Uploaded ${result.images.length} images`);
    } catch {
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
      setSelectedFolder(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const folders: ImageFolder[] = foldersData?.imageSets || [];
  const defaultFolders = folders.filter((f) => f.category === 'default');
  const preparerFolders = folders.filter((f) => f.category === 'preparer');

  // Group preparer folders by preparerId
  const preparerGroups = useMemo(() => {
    const groups: PreparerGroup[] = [];
    const preparerMap = new Map<string, PreparerGroup>();

    for (const folder of preparerFolders) {
      if (!folder.preparerId) continue;

      let group = preparerMap.get(folder.preparerId);
      if (!group) {
        group = {
          preparerId: folder.preparerId,
          preparerName: folder.preparerName || folder.name,
          preparerCode: folder.preparerCode,
          folders: [],
          totalImages: 0,
        };
        preparerMap.set(folder.preparerId, group);
        groups.push(group);
      }
      group.folders.push(folder);
      group.totalImages += folder.imageCount;
    }

    groups.sort((a, b) => a.preparerName.localeCompare(b.preparerName));
    return groups;
  }, [preparerFolders]);

  // Filter by search
  const filteredPreparers = useMemo(() => {
    if (!searchQuery.trim()) return preparerGroups;
    const query = searchQuery.toLowerCase();
    return preparerGroups.filter(
      (p) =>
        p.preparerName.toLowerCase().includes(query) ||
        (p.preparerCode && p.preparerCode.toLowerCase().includes(query))
    );
  }, [preparerGroups, searchQuery]);

  // Get selected preparer data
  const selectedPreparer = selectedPreparerId
    ? preparerGroups.find(p => p.preparerId === selectedPreparerId)
    : null;

  const needsInitialization = defaultFolders.length < 4;

  if (isLoading) {
    return (
      <div className="flex h-[600px] rounded-lg border overflow-hidden">
        <div className="w-72 border-r p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] rounded-lg border overflow-hidden">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />

      {/* Left Sidebar - Preparer List */}
      <div className="w-72 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b bg-background">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Preparers & Folders
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search preparers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Tax Genius Defaults */}
            <button
              onClick={() => {
                setShowDefaults(true);
                setSelectedPreparerId(null);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-1',
                showDefaults && !selectedPreparerId
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Building2 className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Tax Genius Defaults</div>
                <div className="text-xs opacity-70">
                  {defaultFolders.reduce((sum, f) => sum + f.imageCount, 0)} images
                </div>
              </div>
            </button>

            <Separator className="my-2" />

            {/* Preparers List */}
            <div className="space-y-0.5">
              {filteredPreparers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery ? `No preparers matching "${searchQuery}"` : 'No preparers found'}
                </div>
              ) : (
                filteredPreparers.map((preparer) => (
                  <button
                    key={preparer.preparerId}
                    onClick={() => {
                      setSelectedPreparerId(preparer.preparerId);
                      setShowDefaults(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      selectedPreparerId === preparer.preparerId
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{preparer.preparerName}</div>
                      <div className="text-xs opacity-70 flex items-center gap-2">
                        {preparer.preparerCode && <span>{preparer.preparerCode}</span>}
                        <span>•</span>
                        <span>{preparer.totalImages} images</span>
                      </div>
                    </div>
                    {preparer.totalImages > 0 && (
                      <div className="flex gap-0.5">
                        {ALL_FOLDER_TYPES.map((type) => {
                          const folder = preparer.folders.find(f => f.folderType === type);
                          const hasImages = folder && folder.imageCount > 0;
                          return (
                            <div
                              key={type}
                              className={cn(
                                'w-1.5 h-4 rounded-sm',
                                hasImages ? FOLDER_TYPE_CONFIG[type].color : 'bg-muted-foreground/20'
                              )}
                              title={`${FOLDER_TYPE_CONFIG[type].displayName}: ${folder?.imageCount || 0}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Initialize Button */}
        {needsInitialization && (
          <div className="p-4 border-t">
            <Button
              onClick={() => initFoldersMutation.mutate()}
              disabled={initFoldersMutation.isPending}
              className="w-full"
              size="sm"
            >
              {initFoldersMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="mr-2 h-4 w-4" />
              )}
              Initialize Folders
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {!selectedPreparerId && !showDefaults ? (
          // Empty state
          <div className="h-full flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Select a Preparer</h2>
              <p className="text-muted-foreground">
                Choose a preparer from the sidebar to manage their promotional images,
                or select &ldquo;Tax Genius Defaults&rdquo; to manage the fallback images.
              </p>
            </div>
          </div>
        ) : showDefaults ? (
          // Defaults View
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">Tax Genius Default Images</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                These images are used when a preparer&apos;s folder is empty.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {ALL_FOLDER_TYPES.map((folderType) => {
                const config = FOLDER_TYPE_CONFIG[folderType];
                const folder = defaultFolders.find((f) => f.folderType === folderType);

                return (
                  <FolderCard
                    key={folderType}
                    folder={folder}
                    config={config}
                    folderType={folderType}
                    onUpload={handleUploadClick}
                    onDeleteImage={(id) => deleteImageMutation.mutate(id)}
                    isUploading={isUploading && selectedFolder === folder?.id}
                    isDeleting={deleteImageMutation.isPending}
                  />
                );
              })}
            </div>
          </div>
        ) : selectedPreparer ? (
          // Preparer View
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <User className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">{selectedPreparer.preparerName}</h2>
                {selectedPreparer.preparerCode && (
                  <Badge variant="outline" className="text-sm">
                    {selectedPreparer.preparerCode}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                Manage promotional images for all 4 folder types. Empty folders use Tax Genius defaults.
              </p>
            </div>

            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload up to 4 images per folder. If empty, clients will see the Tax Genius default images.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {ALL_FOLDER_TYPES.map((folderType) => {
                const config = FOLDER_TYPE_CONFIG[folderType];
                const folder = selectedPreparer.folders.find((f) => f.folderType === folderType);
                const defaultFolder = defaultFolders.find((f) => f.folderType === folderType);
                const usesDefault = (!folder || folder.imageCount === 0) && defaultFolder && defaultFolder.imageCount > 0;

                return (
                  <FolderCard
                    key={folderType}
                    folder={folder}
                    config={config}
                    folderType={folderType}
                    usesDefault={usesDefault}
                    onUpload={handleUploadClick}
                    onDeleteImage={(id) => deleteImageMutation.mutate(id)}
                    isUploading={isUploading && selectedFolder === folder?.id}
                    isDeleting={deleteImageMutation.isPending}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface FolderCardProps {
  folder?: ImageFolder;
  config: {
    displayName: string;
    dateRange: string;
    description: string;
    icon: typeof Snowflake;
    color: string;
  };
  folderType: FolderType;
  usesDefault?: boolean;
  onUpload: (folderId: string) => void;
  onDeleteImage: (imageId: string) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

function FolderCard({ folder, config, usesDefault, onUpload, onDeleteImage, isUploading, isDeleting }: FolderCardProps) {
  const Icon = config.icon;
  const imageCount = folder?.imageCount || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn('text-white py-3', config.color)}>
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4" />
            {config.displayName}
          </CardTitle>
          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
            {imageCount}/4
          </Badge>
        </div>
        <CardDescription className="text-white/80 text-xs">
          {config.dateRange}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3">
        {usesDefault && (
          <div className="mb-3 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Check className="h-3 w-3" />
              <span className="font-medium">Using Tax Genius Defaults</span>
            </div>
          </div>
        )}

        {/* Image Grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {folder?.images.map((image) => (
            <div key={image.id} className="relative aspect-square rounded overflow-hidden bg-muted group">
              <Image
                src={image.thumbnailUrl || image.imageUrl}
                alt={image.altText}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <a
                  href={image.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 bg-white rounded hover:bg-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 text-gray-800" />
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="p-1 bg-red-500 rounded hover:bg-red-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this image. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteImage(image.id)}
                        className="bg-red-500 hover:bg-red-600"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {image.downloadCount > 0 && (
                <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5">
                  <Download className="h-2 w-2" />
                  {image.downloadCount}
                </div>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 4 - imageCount }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => folder && onUpload(folder.id)}
              disabled={!folder}
              className="aspect-square rounded border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Upload Button */}
        <Button
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={() => folder && onUpload(folder.id)}
          disabled={isUploading || imageCount >= 4 || !folder}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Uploading...
            </>
          ) : imageCount >= 4 ? (
            <>
              <Check className="mr-1.5 h-3 w-3" />
              Full
            </>
          ) : (
            <>
              <Upload className="mr-1.5 h-3 w-3" />
              Upload ({4 - imageCount} left)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
