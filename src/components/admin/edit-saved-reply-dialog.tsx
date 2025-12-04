'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isGlobal: boolean;
}

interface EditSavedReplyDialogProps {
  reply: SavedReply;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditSavedReplyDialog({
  reply,
  open,
  onOpenChange,
  onSuccess,
}: EditSavedReplyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: reply.title,
    content: reply.content,
    category: reply.category || '',
    isGlobal: reply.isGlobal,
  });

  useEffect(() => {
    setFormData({
      title: reply.title,
      content: reply.content,
      category: reply.category || '',
      isGlobal: reply.isGlobal,
    });
  }, [reply]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/support/saved-replies/${reply.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update template');
      }

      toast({
        title: 'Success',
        description: 'Template updated successfully.',
      });

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      logger.error('Error updating template:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Saved Reply Template</DialogTitle>
            <DialogDescription>Update the template content and settings.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="edit-title">
                Template Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                disabled={loading}
                required
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category (optional)</Label>
              <Input
                id="edit-category"
                placeholder="e.g., onboarding, tax-deductions"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                disabled={loading}
              />
            </div>

            {/* Content */}
            <div className="grid gap-2">
              <Label htmlFor="edit-content">
                Template Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="edit-content"
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                disabled={loading}
                required
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {`{{client_name}}`}, {`{{ticket_number}}`}, {`{{preparer_name}}`}
              </p>
            </div>

            {/* Global Template */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="edit-isGlobal">Global Template</Label>
                <p className="text-sm text-muted-foreground">
                  Make this template available to all preparers
                </p>
              </div>
              <Switch
                id="edit-isGlobal"
                checked={formData.isGlobal}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isGlobal: checked }))
                }
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
