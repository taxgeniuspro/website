'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  Eye,
  Copy,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface Creative {
  id: string;
  name: string;
  description: string | null;
  type: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  text: string | null;
  htmlContent: string | null;
  downloadUrl: string | null;
  targetUrl: string | null;
  views: number;
  downloads: number;
  category: string | null;
  tags: string[];
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  IMAGE: <ImageIcon className="w-4 h-4" />,
  BANNER: <ImageIcon className="w-4 h-4" />,
  TEXT: <FileText className="w-4 h-4" />,
  EMAIL_TEMPLATE: <FileText className="w-4 h-4" />,
  SOCIAL_POST: <FileText className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  FLYER: <FileText className="w-4 h-4" />,
  BUSINESS_CARD: <FileText className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  IMAGE: 'Image',
  BANNER: 'Banner',
  TEXT: 'Text Copy',
  EMAIL_TEMPLATE: 'Email Template',
  SOCIAL_POST: 'Social Post',
  VIDEO: 'Video',
  FLYER: 'Flyer',
  BUSINESS_CARD: 'Business Card',
};

export function CreativesLibrary() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCreatives();
  }, [activeType, searchQuery]);

  const fetchCreatives = async () => {
    try {
      const params = new URLSearchParams();
      if (activeType !== 'all') params.append('type', activeType);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/affiliate/creatives?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCreatives(data.creatives || []);
      }
    } catch (error) {
      console.error('Failed to fetch creatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackUsage = async (creativeId: string, action: string) => {
    try {
      await fetch(`/api/affiliate/creatives/${creativeId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
    }
  };

  const handleDownload = async (creative: Creative) => {
    await trackUsage(creative.id, 'DOWNLOAD');
    if (creative.downloadUrl || creative.imageUrl) {
      window.open(creative.downloadUrl || creative.imageUrl || '', '_blank');
      toast.success('Download started');
    }
  };

  const handleCopyText = async (creative: Creative) => {
    await trackUsage(creative.id, 'COPY');
    const textToCopy = creative.text || creative.htmlContent || '';
    navigator.clipboard.writeText(textToCopy);
    toast.success('Text copied to clipboard');
  };

  const handleView = async (creative: Creative) => {
    await trackUsage(creative.id, 'VIEW');
    setSelectedCreative(creative);
  };

  const getCreativePreview = (creative: Creative) => {
    if (creative.thumbnailUrl || creative.imageUrl) {
      return (
        <img
          src={creative.thumbnailUrl || creative.imageUrl || ''}
          alt={creative.name}
          className="w-full h-full object-cover"
        />
      );
    }

    if (creative.text) {
      return (
        <div className="w-full h-full p-4 overflow-hidden text-sm text-muted-foreground">
          {creative.text.substring(0, 150)}...
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        {TYPE_ICONS[creative.type] || <FileText className="w-8 h-8 text-muted-foreground" />}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading marketing materials...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Marketing Materials
              </CardTitle>
              <CardDescription>
                Download and use these materials to promote Tax Genius Pro
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Type Filters */}
          <Tabs value={activeType} onValueChange={setActiveType} className="mb-6">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="IMAGE" className="text-xs">Images</TabsTrigger>
              <TabsTrigger value="BANNER" className="text-xs">Banners</TabsTrigger>
              <TabsTrigger value="TEXT" className="text-xs">Text</TabsTrigger>
              <TabsTrigger value="EMAIL_TEMPLATE" className="text-xs">Email</TabsTrigger>
              <TabsTrigger value="SOCIAL_POST" className="text-xs">Social</TabsTrigger>
              <TabsTrigger value="FLYER" className="text-xs">Flyers</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Creatives Grid */}
          {creatives.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'No materials found matching your search'
                  : 'No marketing materials available yet'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creatives.map((creative) => (
                <Card
                  key={creative.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Preview */}
                  <div className="aspect-video bg-muted relative">
                    {getCreativePreview(creative)}
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 text-xs"
                    >
                      {TYPE_ICONS[creative.type]}
                      <span className="ml-1">{TYPE_LABELS[creative.type]}</span>
                    </Badge>
                  </div>

                  <CardContent className="p-4">
                    <h4 className="font-medium truncate">{creative.name}</h4>
                    {creative.description && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {creative.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {creative.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {creative.downloads} downloads
                      </span>
                    </div>

                    {/* Tags */}
                    {creative.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {creative.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleView(creative)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      {['TEXT', 'EMAIL_TEMPLATE', 'SOCIAL_POST'].includes(creative.type) ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCopyText(creative)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDownload(creative)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!selectedCreative} onOpenChange={() => setSelectedCreative(null)}>
        <DialogContent className="max-w-3xl">
          {selectedCreative && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCreative.name}</DialogTitle>
                <DialogDescription>
                  {selectedCreative.description || `${TYPE_LABELS[selectedCreative.type]} creative`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Image Preview */}
                {(selectedCreative.imageUrl || selectedCreative.thumbnailUrl) && (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    <img
                      src={selectedCreative.imageUrl || selectedCreative.thumbnailUrl || ''}
                      alt={selectedCreative.name}
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                  </div>
                )}

                {/* Text Preview */}
                {selectedCreative.text && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedCreative.text}</p>
                  </div>
                )}

                {/* HTML Preview */}
                {selectedCreative.htmlContent && (
                  <div
                    className="p-4 bg-muted rounded-lg prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedCreative.htmlContent }}
                  />
                )}

                {/* Target URL */}
                {selectedCreative.targetUrl && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{selectedCreative.targetUrl}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCreative.targetUrl || '');
                        toast.success('Link copied');
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {['TEXT', 'EMAIL_TEMPLATE', 'SOCIAL_POST'].includes(selectedCreative.type) ? (
                    <Button className="flex-1" onClick={() => handleCopyText(selectedCreative)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Text
                    </Button>
                  ) : (
                    <Button className="flex-1" onClick={() => handleDownload(selectedCreative)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCreative(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
