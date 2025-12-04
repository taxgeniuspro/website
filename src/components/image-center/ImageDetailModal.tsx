'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, RefreshCw, Check, X } from 'lucide-react';
import { format } from 'date-fns';

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
  acceptedAt?: string | Date | null;
  createdByProfile?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  acceptedByProfile?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  metadata?: any;
}

interface ImageDetailModalProps {
  image: GeneratedImage | null;
  open: boolean;
  onClose: () => void;
  onAccept?: (imageId: string) => Promise<void>;
  onReject?: (imageId: string) => Promise<void>;
  onRegenerate?: (image: GeneratedImage) => void;
  onDownload?: (image: GeneratedImage) => void;
}

export function ImageDetailModal({
  image,
  open,
  onClose,
  onAccept,
  onReject,
  onRegenerate,
  onDownload,
}: ImageDetailModalProps) {
  if (!image) return null;

  const createdDate = typeof image.createdAt === 'string'
    ? new Date(image.createdAt)
    : image.createdAt;

  const acceptedDate = image.acceptedAt
    ? typeof image.acceptedAt === 'string'
      ? new Date(image.acceptedAt)
      : image.acceptedAt
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Image Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          <div className="relative aspect-square w-full max-w-2xl mx-auto bg-muted rounded-lg overflow-hidden">
            <Image
              src={image.imageUrl}
              alt={image.prompt}
              fill
              className="object-contain"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {image.status === 'ready' && onAccept && (
              <Button onClick={() => onAccept(image.id)} variant="default">
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
            )}
            {image.status === 'ready' && onReject && (
              <Button onClick={() => onReject(image.id)} variant="destructive">
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
            {onRegenerate && (
              <Button onClick={() => onRegenerate(image)} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            )}
            {onDownload && (
              <Button onClick={() => onDownload(image)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Status</h3>
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

            <div>
              <h3 className="font-semibold mb-2">Prompt</h3>
              <p className="text-sm text-muted-foreground">{image.prompt}</p>
            </div>

            {image.negativePrompt && (
              <div>
                <h3 className="font-semibold mb-2">Negative Prompt</h3>
                <p className="text-sm text-muted-foreground">{image.negativePrompt}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Provider</h3>
                <p className="text-sm text-muted-foreground capitalize">{image.provider}</p>
              </div>

              {image.modelUsed && (
                <div>
                  <h3 className="font-semibold mb-2">Model</h3>
                  <p className="text-sm text-muted-foreground">{image.modelUsed}</p>
                </div>
              )}

              {image.width && image.height && (
                <div>
                  <h3 className="font-semibold mb-2">Dimensions</h3>
                  <p className="text-sm text-muted-foreground">
                    {image.width} × {image.height}
                  </p>
                </div>
              )}

              {image.fileSize && (
                <div>
                  <h3 className="font-semibold mb-2">File Size</h3>
                  <p className="text-sm text-muted-foreground">
                    {(image.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {image.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {image.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {image.category && (
              <div>
                <h3 className="font-semibold mb-2">Category</h3>
                <p className="text-sm text-muted-foreground">{image.category}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Created</h3>
                <p className="text-sm text-muted-foreground">
                  {format(createdDate, 'PPp')}
                </p>
                {image.createdByProfile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    by {image.createdByProfile.firstName} {image.createdByProfile.lastName}
                  </p>
                )}
              </div>

              {acceptedDate && (
                <div>
                  <h3 className="font-semibold mb-2">Accepted</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(acceptedDate, 'PPp')}
                  </p>
                  {image.acceptedByProfile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {image.acceptedByProfile.firstName} {image.acceptedByProfile.lastName}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
