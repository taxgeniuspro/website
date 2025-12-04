/**
 * Saved Reply Selector Component
 * Allows preparers to select and apply saved reply templates
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Search, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SavedReplySelectorProps {
  onSelect: (content: string) => void;
  ticketId: string;
  trigger?: React.ReactNode;
}

export function SavedReplySelector({ onSelect, ticketId, trigger }: SavedReplySelectorProps) {
  const [open, setOpen] = useState(false);
  const [savedReplies, setSavedReplies] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSavedReplies();
    }
  }, [open]);

  const fetchSavedReplies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/support/saved-replies?includeCategories=true');
      const data = await response.json();

      if (data.success) {
        setSavedReplies(data.data.savedReplies || []);
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load saved replies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyReply = async (replyId: string) => {
    try {
      setApplying(replyId);
      const response = await fetch(`/api/support/saved-replies/${replyId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      });

      const data = await response.json();

      if (data.success) {
        onSelect(data.data.content);
        setOpen(false);
        toast({
          title: 'Success',
          description: 'Template applied successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to apply template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply template',
        variant: 'destructive',
      });
    } finally {
      setApplying(null);
    }
  };

  const filteredReplies = savedReplies.filter((reply) => {
    const matchesCategory = selectedCategory === 'all' || reply.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Extract variables from content
  const extractVariables = (content: string) => {
    const matches = content.match(/{{(.*?)}}/g);
    return matches ? matches.map((m) => m.slice(2, -2)) : [];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Saved Replies
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Saved Reply Templates</DialogTitle>
          <DialogDescription>
            Select a template to quickly respond to common questions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace(/-/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Templates List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No templates found matching your filters'
                  : 'No saved replies available'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredReplies.map((reply) => {
                  const variables = extractVariables(reply.content);
                  const isApplying = applying === reply.id;

                  return (
                    <Card
                      key={reply.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">{reply.title}</h4>
                                {reply.isGlobal && (
                                  <Badge variant="secondary" className="text-xs">
                                    Global
                                  </Badge>
                                )}
                              </div>
                              {reply.category && (
                                <Badge variant="outline" className="text-xs">
                                  {reply.category.replace(/-/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => applyReply(reply.id)}
                              disabled={isApplying}
                            >
                              {isApplying ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Apply'
                              )}
                            </Button>
                          </div>

                          {/* Content Preview */}
                          <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                            {reply.content}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {reply.usageCount > 0 && <span>Used {reply.usageCount} times</span>}
                              {variables.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  <span>{variables.length} variables</span>
                                </div>
                              )}
                            </div>
                            {reply.createdBy && (
                              <span>
                                By {reply.createdBy.firstName} {reply.createdBy.lastName}
                              </span>
                            )}
                          </div>

                          {/* Variables Tooltip */}
                          {variables.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-1">
                                Variables (auto-filled):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {variables.map((variable, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs font-mono"
                                  >
                                    {`{{${variable}}}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
