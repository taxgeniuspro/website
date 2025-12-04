'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2,
  Copy,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  Check,
  ExternalLink,
} from 'lucide-react';
import { logger } from '@/lib/logger';

export interface ShareUploadLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadLink: {
    id: string;
    token: string;
    url: string;
    folderName: string;
    clientName: string;
    clientPhone?: string | null;
  };
  folderId: string;
}

export function ShareUploadLinkDialog({
  open,
  onOpenChange,
  uploadLink,
  folderId,
}: ShareUploadLinkDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState(uploadLink.clientPhone || '');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: async (data: { method: string; phoneNumber?: string; email?: string }) => {
      const response = await fetch(`/api/folders/${folderId}/share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: uploadLink.id,
          ...data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to share link');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      logger.info('Upload link shared', data);
      toast.success(`Link sent successfully via ${variables.method.toUpperCase()}!`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      logger.error('Failed to share link', error);
      toast.error(error.message || 'Failed to share link');
    },
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(uploadLink.url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Upload Documents',
          text: `Please upload your documents to "${uploadLink.folderName}" using this secure link:`,
          url: uploadLink.url,
        });
        toast.success('Share dialog opened');
      } catch (error) {
        // User cancelled or share failed
        logger.info('Web share cancelled or failed', error);
      }
    } else {
      toast.error('Web Share not supported on this device');
      handleCopyLink(); // Fallback to copy
    }
  };

  const handleSendSMS = () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    shareMutation.mutate({ method: 'sms', phoneNumber });
  };

  const handleSendEmail = () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    shareMutation.mutate({ method: 'email', email });
  };

  const handleSendInApp = () => {
    shareMutation.mutate({ method: 'inapp' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Share Upload Link</DialogTitle>
          <DialogDescription>
            Send this link to {uploadLink.clientName} so they can upload documents to{' '}
            <strong>{uploadLink.folderName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>

            {typeof navigator !== 'undefined' && navigator.share && (
              <Button
                variant="outline"
                onClick={handleWebShare}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            )}
          </div>

          {/* Share Methods Tabs */}
          <Tabs defaultValue="sms" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sms">
                <Phone className="w-4 h-4 mr-2" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="inapp">
                <MessageSquare className="w-4 h-4 mr-2" />
                In-App
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sms" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {uploadLink.clientPhone
                    ? 'Pre-filled with client\'s phone number'
                    : 'Enter client\'s phone number'}
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-2">Message Preview:</p>
                <p className="text-muted-foreground">
                  Hi {uploadLink.clientName}! Your tax preparer has requested documents from you.
                  Please upload your files to "{uploadLink.folderName}" using this secure link...
                </p>
              </div>

              <Button
                onClick={handleSendSMS}
                disabled={shareMutation.isPending || !phoneNumber}
                className="w-full"
              >
                {shareMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Phone className="w-4 h-4 mr-2" />
                Send SMS
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Client will receive a professionally formatted email with the upload link
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-2">Email Preview:</p>
                <p className="text-muted-foreground">
                  Subject: Document Upload Request from Your Tax Preparer
                  <br />
                  <br />
                  Professional email template with upload button and link...
                </p>
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={shareMutation.isPending || !email}
                className="w-full"
              >
                {shareMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </TabsContent>

            <TabsContent value="inapp" className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Send In-App Notification</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadLink.clientName} will receive a notification in their Tax Genius Pro
                      dashboard and on their mobile device (if they have the PWA installed).
                    </p>
                  </div>
                </div>

                <div className="pl-8 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Instant delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Push notification on mobile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Click to open upload page</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSendInApp}
                disabled={shareMutation.isPending}
                className="w-full"
              >
                {shareMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <MessageSquare className="w-4 h-4 mr-2" />
                Send In-App Notification
              </Button>
            </TabsContent>
          </Tabs>

          {/* Link Preview */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ExternalLink className="w-4 h-4" />
              Upload Link
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {uploadLink.url}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
