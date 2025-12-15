'use client';

/**
 * Admin Referral Images Management Page
 *
 * Allows admins to:
 * - Create image sets (preseason-loans, tax-season, preparer-custom)
 * - Upload promotional images to each set
 * - Manage and delete images
 * - View download statistics
 */

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, Upload, Trash2, Download, Image as ImageIcon, Calendar, User, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ReferralImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  alt: string;
  platform: string | null;
  downloadCount: number;
}

interface ImageSet {
  id: string;
  name: string;
  description: string | null;
  category: string;
  preparerId: string | null;
  preparerName: string | null;
  preparerCode: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  imageCount: number;
  invitationCount: number;
  images: ReferralImage[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminReferralImagesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form state for creating new image set
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [newSetCategory, setNewSetCategory] = useState('preseason-loans');
  const [newSetPreparerId, setNewSetPreparerId] = useState('');

  // Fetch all image sets
  const { data: imageSetsData, isLoading } = useQuery({
    queryKey: ['admin-referral-images'],
    queryFn: async () => {
      const response = await fetch('/api/admin/referral-images');
      if (!response.ok) throw new Error('Failed to fetch image sets');
      return response.json();
    },
  });

  // Fetch preparers for dropdown
  const { data: preparersData } = useQuery({
    queryKey: ['preparers-list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/preparers');
      if (!response.ok) throw new Error('Failed to fetch preparers');
      return response.json();
    },
  });

  // Create image set mutation
  const createSetMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      category: string;
      preparerId?: string;
    }) => {
      const response = await fetch('/api/admin/referral-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create image set');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-images'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Image set created successfully');
    },
    onError: () => {
      toast.error('Failed to create image set');
    },
  });

  const resetForm = () => {
    setNewSetName('');
    setNewSetDescription('');
    setNewSetCategory('preseason-loans');
    setNewSetPreparerId('');
  };

  const handleCreateSet = () => {
    if (!newSetName.trim()) {
      toast.error('Please enter a name for the image set');
      return;
    }

    createSetMutation.mutate({
      name: newSetName,
      description: newSetDescription,
      category: newSetCategory,
      preparerId: newSetCategory === 'preparer-custom' ? newSetPreparerId : undefined,
    });
  };

  const handleUploadClick = (setId: string) => {
    setSelectedSet(setId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedSet) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('setId', selectedSet);
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
      queryClient.invalidateQueries({ queryKey: ['admin-referral-images'] });
      toast.success(`Uploaded ${result.images.length} images`);
    } catch {
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
      setSelectedSet(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'preseason-loans':
        return <Badge className="bg-blue-600">Preseason Loans</Badge>;
      case 'tax-season':
        return <Badge className="bg-green-600">Tax Season</Badge>;
      case 'preparer-custom':
        return <Badge className="bg-purple-600">Preparer Custom</Badge>;
      default:
        return <Badge>{category}</Badge>;
    }
  };

  const imageSets: ImageSet[] = imageSetsData?.imageSets || [];
  const preparers = preparersData?.preparers || [];

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
            Manage promotional images for client referral invitations
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Image Set
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Image Set</DialogTitle>
              <DialogDescription>
                Create a new collection of promotional images
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Preseason Loans 2025"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this image set..."
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newSetCategory} onValueChange={setNewSetCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preseason-loans">Preseason Loans (until Jan 15)</SelectItem>
                    <SelectItem value="tax-season">Tax Season (Jan 16 - Apr 15)</SelectItem>
                    <SelectItem value="preparer-custom">Preparer Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newSetCategory === 'preparer-custom' && (
                <div className="space-y-2">
                  <Label htmlFor="preparer">Tax Preparer</Label>
                  <Select value={newSetPreparerId} onValueChange={setNewSetPreparerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a preparer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {preparers.map((preparer: { id: string; firstName: string; lastName: string; customTrackingCode?: string }) => (
                        <SelectItem key={preparer.id} value={preparer.id}>
                          {preparer.firstName} {preparer.lastName}{preparer.customTrackingCode ? ` (${preparer.customTrackingCode})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSet}
                disabled={createSetMutation.isPending}
                className="bg-secondary hover:bg-secondary/90"
              >
                {createSetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {imageSets.length === 0 && (
        <Alert>
          <ImageIcon className="h-4 w-4" />
          <AlertDescription>
            No image sets created yet. Click &quot;Create Image Set&quot; to get started.
          </AlertDescription>
        </Alert>
      )}

      {/* Image Sets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {imageSets.map((set) => (
          <Card key={set.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{set.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {set.description || 'No description'}
                  </CardDescription>
                </div>
                {getCategoryBadge(set.category)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Metadata */}
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {set.preparerName && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {set.preparerName}
                  </div>
                )}
                {set.validFrom && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Valid from {new Date(set.validFrom).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {set.imageCount} images
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {set.invitationCount} invitations
                </div>
              </div>

              {/* Image Grid */}
              {set.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {set.images.slice(0, 4).map((image) => (
                    <div key={image.id} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                      <Image
                        src={image.thumbnailUrl || image.url}
                        alt={image.alt}
                        fill
                        className="object-cover"
                      />
                      {image.downloadCount > 0 && (
                        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1 rounded-tl">
                          {image.downloadCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No images yet</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUploadClick(set.id)}
                  disabled={isUploading && selectedSet === set.id}
                >
                  {isUploading && selectedSet === set.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Images
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
