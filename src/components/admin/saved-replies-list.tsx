'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Edit, Trash2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditSavedReplyDialog } from './edit-saved-reply-dialog';
import { logger } from '@/lib/logger';

interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isGlobal: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: {
    firstName: string | null;
    lastName: string | null;
  };
}

export function SavedRepliesList() {
  const { toast } = useToast();
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingReply, setEditingReply] = useState<SavedReply | null>(null);

  useEffect(() => {
    fetchReplies();
  }, [searchQuery, categoryFilter]);

  const fetchReplies = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const response = await fetch(`/api/support/saved-replies?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data && data.data.replies) {
        setReplies(data.data.replies);
      } else {
        setReplies([]);
      }
    } catch (error) {
      logger.error('Error fetching saved replies:', error);
      setReplies([]); // Set to empty array on error
      toast({
        title: 'Error',
        description: 'Failed to load saved replies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/support/saved-replies/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template deleted successfully',
        });
        fetchReplies();
      } else {
        throw new Error(data.error || 'Failed to delete template');
      }
    } catch (error) {
      logger.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(matches, (m) => m[1]);
  };

  // Safely extract categories with null checks
  const categories = Array.isArray(replies)
    ? Array.from(new Set(replies.map((r) => r.category).filter(Boolean)))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat!}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Replies List */}
      {replies.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No templates found. Create your first template!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {replies.map((reply) => {
            const variables = extractVariables(reply.content);
            const creatorName =
              `${reply.createdBy.firstName || ''} ${reply.createdBy.lastName || ''}`.trim();

            return (
              <Card key={reply.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{reply.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {reply.category && (
                              <Badge variant="secondary" className="text-xs">
                                {reply.category}
                              </Badge>
                            )}
                            {reply.isGlobal && (
                              <Badge variant="outline" className="text-xs">
                                Global
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Usage Stats */}
                        {reply.usageCount > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>{reply.usageCount} uses</span>
                          </div>
                        )}
                      </div>

                      {/* Content Preview */}
                      <p className="text-sm text-muted-foreground line-clamp-2">{reply.content}</p>

                      {/* Variables */}
                      {variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {variables.map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs font-mono">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {creatorName && <span>Created by: {creatorName}</span>}
                        <span>Created: {new Date(reply.createdAt).toLocaleDateString()}</span>
                        {reply.lastUsedAt && (
                          <span>Last used: {new Date(reply.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingReply(reply)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(reply.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {editingReply && (
        <EditSavedReplyDialog
          reply={editingReply}
          open={!!editingReply}
          onOpenChange={(open) => !open && setEditingReply(null)}
          onSuccess={() => {
            setEditingReply(null);
            fetchReplies();
          }}
        />
      )}
    </div>
  );
}
