import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Download,
  Image as ImageIcon,
  Type,
  ExternalLink,
  Check,
  Facebook,
  Twitter,
} from 'lucide-react';
import { FacebookShareButton, TwitterShareButton, FacebookIcon, TwitterIcon } from 'react-share';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarketingMaterials } from '@/hooks/useReferrerData';
import { useToast } from '@/hooks/use-toast';
import type { MarketingMaterial } from '@/lib/types';

interface MarketingHubProps {
  referralUrl?: string;
}

export const MarketingHub: React.FC<MarketingHubProps> = ({
  referralUrl = 'https://taxgenius.com/refer',
}) => {
  const { toast } = useToast();
  const { data: materials, isLoading } = useMarketingMaterials();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = async (text: string, materialId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(materialId);
      toast({
        title: 'Copied!',
        description: 'Marketing text copied to clipboard.',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy text to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleShareUrl = (platform: string, material: any) => {
    const shareText = material.adCopy
      ? `${material.adCopy} ${referralUrl}`
      : `Check out Tax Genius! ${referralUrl}`;

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
        '_blank',
        'width=600,height=400'
      );
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}&quote=${encodeURIComponent(material.adCopy || 'Check out Tax Genius!')}`,
        '_blank',
        'width=600,height=400'
      );
    }
  };

  const handleDownloadImage = (imageUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMaterialCard = (material: any) => (
    <Card key={material.id} className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{material.title}</CardTitle>
            {material.description && (
              <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Badge variant="outline" className="text-xs">
              {material.materialType || material.material_type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Preview */}
        {material.imageUrl && (
          <div className="relative">
            <img
              src={material.imageUrl}
              alt={material.title}
              className="w-full h-32 object-cover rounded-md border"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => handleDownloadImage(material.imageUrl!, material.title)}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Ad Copy */}
        {material.adCopy && (
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm whitespace-pre-line">{material.adCopy}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleCopyText(material.adCopy!, material.id)}
            >
              {copiedId === material.id ? (
                <Check className="h-4 w-4 mr-2 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedId === material.id ? 'Copied!' : 'Copy Text'}
            </Button>
          </div>
        )}

        {/* Social Sharing Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => handleShareUrl('twitter', material)}
          >
            <Twitter className="h-4 w-4 mr-2" />
            Twitter
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => handleShareUrl('facebook', material)}
          >
            <Facebook className="h-4 w-4 mr-2" />
            Facebook
          </Button>
        </div>

        {/* Tags */}
        {material.tags && material.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {material.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const filterMaterialsByType = (type: string) => {
    return materials?.filter((material) => material.materialType === type) || [];
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Marketing Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Marketing Hub
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pre-made promotional materials to help you market Tax Genius effectively
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon className="h-4 w-4 mr-1" />
              Images
            </TabsTrigger>
            <TabsTrigger value="text">
              <Type className="h-4 w-4 mr-1" />
              Text
            </TabsTrigger>
            <TabsTrigger value="template">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {materials && materials.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {materials.map(renderMaterialCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Share2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No marketing materials available</p>
                <p className="text-xs">Check back later for new promotional content</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="image" className="mt-4">
            {filterMaterialsByType('image').length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterMaterialsByType('image').map(renderMaterialCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No image materials available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            {filterMaterialsByType('text').length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterMaterialsByType('text').map(renderMaterialCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No text materials available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="template" className="mt-4">
            {filterMaterialsByType('template').length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterMaterialsByType('template').map(renderMaterialCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ExternalLink className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No template materials available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MarketingHub;
