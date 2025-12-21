'use client';

/**
 * AI Image Generation Tab
 * Embedded version of the Image Center for Marketing Hub
 */

import { useState, useEffect, useCallback } from 'react';
import { ImagePromptForm, GenerationData } from '@/components/image-center/ImagePromptForm';
import { ImageHistoryList } from '@/components/image-center/ImageHistoryList';
import { ImageDetailModal } from '@/components/image-center/ImageDetailModal';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

export function AIImagesTab() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/image-center/images');
      if (!response.ok) throw new Error('Failed to fetch images');
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      toast.error('Failed to load images');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleGenerate = async (data: GenerationData) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/image-center/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate images');
      }

      const result = await response.json();
      toast.success(result.message || 'Images generated successfully');
      await fetchImages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate images');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async (imageId: string) => {
    try {
      const response = await fetch(`/api/admin/image-center/images/${imageId}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept image');
      }

      toast.success('Image accepted');
      await fetchImages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept image');
      console.error(error);
    }
  };

  const handleReject = async (imageId: string) => {
    try {
      const response = await fetch(`/api/admin/image-center/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject image');
      }

      toast.success('Image rejected');
      await fetchImages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject image');
      console.error(error);
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/admin/image-center/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete image');
      }

      toast.success('Image deleted');
      await fetchImages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete image');
      console.error(error);
    }
  };

  const handleRegenerate = async (image: GeneratedImage) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/image-center/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalImageId: image.id,
          prompt: image.prompt,
          negativePrompt: image.negativePrompt,
          provider: image.provider,
          size: `${image.width}x${image.height}`,
          tags: image.tags,
          category: image.category,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate image');
      }

      toast.success('Image regenerated');
      await fetchImages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate image');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetails = (image: GeneratedImage) => {
    setSelectedImage(image);
    setDetailModalOpen(true);
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

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <ImagePromptForm onGenerate={handleGenerate} isGenerating={generating} />

      <Separator />

      {/* Image History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Generated Images</h3>
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading images...
            </CardContent>
          </Card>
        ) : (
          <ImageHistoryList
            images={images}
            onAccept={handleAccept}
            onReject={handleReject}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>

      {/* Detail Modal */}
      <ImageDetailModal
        image={selectedImage}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedImage(null);
        }}
        onAccept={handleAccept}
        onReject={handleReject}
        onRegenerate={handleRegenerate}
        onDownload={handleDownload}
      />
    </div>
  );
}
