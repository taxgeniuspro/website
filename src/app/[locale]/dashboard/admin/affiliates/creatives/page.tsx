'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  Eye,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  Globe,
  Lock,
  Users,
  Search,
} from 'lucide-react';
import Link from 'next/link';

interface Creative {
  id: string;
  name: string;
  description: string | null;
  type: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  text: string | null;
  downloadUrl: string | null;
  targetUrl: string | null;
  privacy: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  views: number;
  clicks: number;
  downloads: number;
  conversions: number;
  category: string | null;
  tags: string[];
  createdAt: string;
}

const CREATIVE_TYPES = [
  { value: 'IMAGE', label: 'Image', icon: ImageIcon },
  { value: 'BANNER', label: 'Banner', icon: ImageIcon },
  { value: 'TEXT', label: 'Text Copy', icon: FileText },
  { value: 'EMAIL_TEMPLATE', label: 'Email Template', icon: FileText },
  { value: 'SOCIAL_POST', label: 'Social Post', icon: Globe },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'FLYER', label: 'Flyer', icon: FileText },
  { value: 'BUSINESS_CARD', label: 'Business Card', icon: FileText },
];

const PRIVACY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: Globe, description: 'All affiliates can access' },
  { value: 'GROUP_ONLY', label: 'Group Only', icon: Users, description: 'Only specific groups' },
  { value: 'PRIVATE', label: 'Private', icon: Lock, description: 'Only specific affiliates' },
];

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'IMAGE',
    imageUrl: '',
    thumbnailUrl: '',
    text: '',
    downloadUrl: '',
    targetUrl: '',
    privacy: 'PUBLIC',
    status: 'ACTIVE',
    category: '',
    tags: '',
  });

  useEffect(() => {
    fetchCreatives();
  }, [activeType, searchQuery]);

  const fetchCreatives = async () => {
    try {
      const params = new URLSearchParams();
      if (activeType !== 'all') params.append('type', activeType);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/admin/creatives?${params.toString()}`);
      const data = await res.json();
      setCreatives(data.creatives || []);
    } catch (error) {
      console.error('Failed to fetch creatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCreative = async () => {
    try {
      const res = await fetch('/api/admin/creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        setIsCreateDialogOpen(false);
        resetForm();
        fetchCreatives();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create creative');
      }
    } catch (error) {
      console.error('Failed to create creative:', error);
      alert('Failed to create creative');
    }
  };

  const handleDeleteCreative = async (id: string) => {
    if (!confirm('Are you sure you want to delete this creative?')) return;

    try {
      const res = await fetch(`/api/admin/creatives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCreatives();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete creative');
      }
    } catch (error) {
      console.error('Failed to delete creative:', error);
      alert('Failed to delete creative');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'IMAGE',
      imageUrl: '',
      thumbnailUrl: '',
      text: '',
      downloadUrl: '',
      targetUrl: '',
      privacy: 'PUBLIC',
      status: 'ACTIVE',
      category: '',
      tags: '',
    });
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = CREATIVE_TYPES.find((t) => t.value === type);
    const Icon = typeConfig?.icon || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getPrivacyIcon = (privacy: string) => {
    const privacyConfig = PRIVACY_OPTIONS.find((p) => p.value === privacy);
    const Icon = privacyConfig?.icon || Globe;
    return <Icon className="w-4 h-4" />;
  };

  const CreativeForm = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Tax Season Banner"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATIVE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this creative..."
        />
      </div>

      {['IMAGE', 'BANNER', 'FLYER', 'BUSINESS_CARD'].includes(formData.type) && (
        <>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
            <Input
              id="thumbnailUrl"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </>
      )}

      {['TEXT', 'EMAIL_TEMPLATE', 'SOCIAL_POST'].includes(formData.type) && (
        <div className="space-y-2">
          <Label htmlFor="text">Content</Label>
          <Textarea
            id="text"
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            placeholder="Enter text content..."
            className="min-h-[150px]"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="downloadUrl">Download URL (optional)</Label>
        <Input
          id="downloadUrl"
          value={formData.downloadUrl}
          onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetUrl">Target URL (for tracking)</Label>
        <Input
          id="targetUrl"
          value={formData.targetUrl}
          onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="privacy">Privacy</Label>
          <Select
            value={formData.privacy}
            onValueChange={(value) => setFormData({ ...formData, privacy: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIVACY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="social_media">Social Media</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="print">Print</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="tax, season, promo"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/admin/affiliates">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Marketing Materials</h1>
              <p className="text-muted-foreground">
                Create and manage creatives for affiliates
              </p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Creative
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Creative</DialogTitle>
                <DialogDescription>
                  Add a new marketing material for affiliates
                </DialogDescription>
              </DialogHeader>
              <CreativeForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCreative}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search creatives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={activeType} onValueChange={setActiveType} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="IMAGE">Images</TabsTrigger>
              <TabsTrigger value="TEXT">Text</TabsTrigger>
              <TabsTrigger value="EMAIL_TEMPLATE">Email</TabsTrigger>
              <TabsTrigger value="VIDEO">Video</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Creatives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creatives.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creatives.reduce((acc, c) => acc + c.views, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creatives.reduce((acc, c) => acc + c.downloads, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creatives.reduce((acc, c) => acc + c.conversions, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creatives Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading creatives...</div>
        ) : creatives.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No creatives yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first marketing material for affiliates
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Creative
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {creatives.map((creative) => (
              <Card key={creative.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Preview */}
                <div className="aspect-video bg-muted relative">
                  {creative.imageUrl || creative.thumbnailUrl ? (
                    <img
                      src={creative.thumbnailUrl || creative.imageUrl || ''}
                      alt={creative.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(creative.type)}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge
                      variant={creative.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {creative.status}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="outline" className="text-xs bg-background/80">
                      {getPrivacyIcon(creative.privacy)}
                      <span className="ml-1">{creative.privacy}</span>
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-medium truncate">{creative.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {creative.description || 'No description'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {creative.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {creative.downloads}
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
                      {creative.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{creative.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCreative(creative.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
