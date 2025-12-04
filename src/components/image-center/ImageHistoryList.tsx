'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { ImageGenerationGrid } from './ImageGenerationGrid';

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

interface ImageHistoryListProps {
  images: GeneratedImage[];
  onAccept: (imageId: string) => Promise<void>;
  onReject: (imageId: string) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onRegenerate: (image: GeneratedImage) => void;
  onViewDetails: (image: GeneratedImage) => void;
  onFilterChange?: (filters: FilterState) => void;
}

interface FilterState {
  status?: string;
  provider?: string;
  search?: string;
}

export function ImageHistoryList({
  images,
  onAccept,
  onReject,
  onDelete,
  onRegenerate,
  onViewDetails,
  onFilterChange,
}: ImageHistoryListProps) {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange?.({
      status: activeTab !== 'all' ? activeTab : undefined,
      provider: provider !== 'all' ? provider : undefined,
      search: value || undefined,
    });
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    onFilterChange?.({
      status: activeTab !== 'all' ? activeTab : undefined,
      provider: value !== 'all' ? value : undefined,
      search: search || undefined,
    });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onFilterChange?.({
      status: value !== 'all' ? value : undefined,
      provider: provider !== 'all' ? provider : undefined,
      search: search || undefined,
    });
  };

  const filterImages = (status?: string) => {
    let filtered = images;

    if (status && status !== 'all') {
      filtered = filtered.filter((img) => img.status === status);
    }

    if (provider !== 'all') {
      filtered = filtered.filter((img) => img.provider === provider);
    }

    if (search) {
      filtered = filtered.filter((img) =>
        img.prompt.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  const allImages = filterImages();
  const acceptedImages = filterImages('accepted');
  const readyImages = filterImages('ready');
  const rejectedImages = filterImages('rejected');
  const generatingImages = filterImages('generating');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by prompt..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="replicate">Replicate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({allImages.length})
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready ({readyImages.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedImages.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedImages.length})
          </TabsTrigger>
          <TabsTrigger value="generating">
            Generating ({generatingImages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ImageGenerationGrid
            images={allImages}
            onAccept={onAccept}
            onReject={onReject}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            onViewDetails={onViewDetails}
          />
        </TabsContent>

        <TabsContent value="ready" className="mt-6">
          <ImageGenerationGrid
            images={readyImages}
            onAccept={onAccept}
            onReject={onReject}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            onViewDetails={onViewDetails}
          />
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          <ImageGenerationGrid
            images={acceptedImages}
            onAccept={onAccept}
            onReject={onReject}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            onViewDetails={onViewDetails}
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <ImageGenerationGrid
            images={rejectedImages}
            onAccept={onAccept}
            onReject={onReject}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            onViewDetails={onViewDetails}
          />
        </TabsContent>

        <TabsContent value="generating" className="mt-6">
          <ImageGenerationGrid
            images={generatingImages}
            onAccept={onAccept}
            onReject={onReject}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            onViewDetails={onViewDetails}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
