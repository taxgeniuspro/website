'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Link as LinkIcon, Clock, Upload, Check } from 'lucide-react';
import { logger } from '@/lib/logger';

export interface CreateUploadLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  clientId: string;
  clientName?: string;
  onLinkCreated?: (linkData: any) => void;
}

export function CreateUploadLinkDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  clientId,
  clientName,
  onLinkCreated,
}: CreateUploadLinkDialogProps) {
  const queryClient = useQueryClient();
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [maxUploads, setMaxUploads] = useState('');
  const [createdLink, setCreatedLink] = useState<any>(null);

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/folders/${folderId}/create-upload-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          expiresInHours: parseInt(expiresInHours),
          maxUploads: maxUploads ? parseInt(maxUploads) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create upload link');
      }

      return response.json();
    },
    onSuccess: (data) => {
      logger.info('Upload link created successfully', data);
      setCreatedLink(data.uploadLink);
      toast.success('Upload link created successfully!');
      queryClient.invalidateQueries({ queryKey: ['upload-links', folderId] });

      if (onLinkCreated) {
        onLinkCreated(data.uploadLink);
      }
    },
    onError: (error: Error) => {
      logger.error('Failed to create upload link', error);
      toast.error(error.message || 'Failed to create upload link');
    },
  });

  const handleCopyLink = () => {
    if (createdLink?.url) {
      navigator.clipboard.writeText(createdLink.url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleClose = () => {
    setCreatedLink(null);
    setExpiresInHours('24');
    setMaxUploads('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Upload Link</DialogTitle>
          <DialogDescription>
            Create a secure, time-limited link for {clientName || 'client'} to upload documents to{' '}
            <strong>{folderName}</strong>
          </DialogDescription>
        </DialogHeader>

        {!createdLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expiresIn">Link Expiration</Label>
              <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                <SelectTrigger id="expiresIn">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours (recommended)</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The link will expire after this time period
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUploads">Upload Limit (Optional)</Label>
              <Input
                id="maxUploads"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxUploads}
                onChange={(e) => setMaxUploads(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of files that can be uploaded via this link
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Features:</span>
              </div>
              <ul className="text-sm space-y-1 ml-6 list-disc text-muted-foreground">
                <li>Client can upload from camera or file picker</li>
                <li>Files automatically saved to this folder</li>
                <li>You'll receive a notification when files are uploaded</li>
                <li>Link can be shared via SMS, email, or messaging</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <Check className="w-5 h-5" />
              <span className="font-medium">Upload link created successfully!</span>
            </div>

            <div className="space-y-2">
              <Label>Upload Link</Label>
              <div className="flex gap-2">
                <Input value={createdLink.url} readOnly className="font-mono text-sm" />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the link icon to copy the URL
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="font-medium">{new Date(createdLink.expiresAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Upload Limit</p>
                <p className="font-medium">
                  {createdLink.maxUploads ? `${createdLink.maxUploads} files` : 'Unlimited'}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>Next step:</strong> Use the Share button to send this link to{' '}
                {clientName} via SMS, email, or in-app message.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!createdLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => createLinkMutation.mutate()}
                disabled={createLinkMutation.isPending}
              >
                {createLinkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Upload className="w-4 h-4 mr-2" />
                Create Link
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
