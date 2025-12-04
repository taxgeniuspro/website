'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Check,
  X,
  MoreVertical,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  prompt: string;
  negativePrompt?: string | null;
  provider: string;
  modelUsed?: string | null;
  status: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  tags: string[];
  category?: string | null;
  generationId: string;
  createdAt: string | Date;
  createdByProfile?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface ImageGenerationGridProps {
  images: GeneratedImage[];
  onAccept: (imageId: string) => Promise<void>;
  onReject: (imageId: string) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onRegenerate: (image: GeneratedImage) => void;
  onViewDetails: (image: GeneratedImage) => void;
}

export function ImageGenerationGrid({
  images,
  onAccept,
  onReject,
  onDelete,
  onRegenerate,
  onViewDetails,
}: ImageGenerationGridProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handleAction = async (imageId: string, action: () => Promise<void>) => {
    setProcessingIds((prev) => new Set(prev).add(imageId));
    try {
      await action();
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const confirmDelete = (imageId: string) => {
    setImageToDelete(imageId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (imageToDelete) {
      await handleAction(imageToDelete, () => onDelete(imageToDelete));
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No images generated yet. Use the form above to create your first AI image.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image) => {
          const isProcessing = processingIds.has(image.id);

          return (
            <Card key={image.id} className="overflow-hidden group relative">
              <div className="aspect-square relative bg-muted">
                {image.status === 'generating' ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Image
                    src={image.thumbnailUrl || image.imageUrl}
                    alt={image.prompt}
                    fill
                    className="object-cover"
                  />
                )}

                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <Badge
                    variant={
                      image.status === 'accepted'
                        ? 'default'
                        : image.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {image.status}
                  </Badge>
                </div>

                {/* Actions Overlay */}
                {image.status !== 'generating' && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {image.status === 'ready' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAction(image.id, () => onAccept(image.id))}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(image.id, () => onReject(image.id))}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onViewDetails(image)}
                      disabled={isProcessing}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="secondary" disabled={isProcessing}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDownload(image)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRegenerate(image)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => confirmDelete(image.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              <CardContent className="p-3">
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {image.prompt}
                </p>
                {image.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {image.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {image.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{image.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this generated image. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
