'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  X,
  Link as LinkIcon,
  Copy,
  Share2,
  QrCode,
  ExternalLink,
  UserPlus,
  FileText,
  Calendar,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickLink {
  id: string;
  label: string;
  description: string;
  url: string;
  type: 'lead' | 'intake' | 'appointment';
  qrCodeUrl?: string;
}

interface QuickLinksSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links?: QuickLink[];
  preparerName?: string;
}

const typeIcons = {
  lead: UserPlus,
  intake: FileText,
  appointment: Calendar,
};

const typeColors = {
  lead: 'text-purple-500 bg-purple-500/10',
  intake: 'text-blue-500 bg-blue-500/10',
  appointment: 'text-green-500 bg-green-500/10',
};

export function QuickLinksSheet({
  open,
  onOpenChange,
  links = [],
  preparerName,
}: QuickLinksSheetProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);

  const handleCopy = async (link: QuickLink) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      toast.success('Link copied!', {
        description: 'Ready to paste and share',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async (link: QuickLink) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: link.label,
          text: link.description,
          url: link.url,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to copy
      handleCopy(link);
    }
  };

  const handleShowQR = (linkId: string) => {
    setShowQR(showQR === linkId ? null : linkId);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            <DrawerTitle>Your Links</DrawerTitle>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="p-4 pb-8">
          {preparerName && (
            <p className="text-sm text-muted-foreground mb-4">
              Share your personalized links to capture leads
            </p>
          )}

          {links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LinkIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">No links available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Contact admin to set up your referral links
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const Icon = typeIcons[link.type];
                const colorClass = typeColors[link.type];
                const isCopied = copiedId === link.id;
                const isQRVisible = showQR === link.id;

                return (
                  <div
                    key={link.id}
                    className="rounded-xl border bg-card overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                            colorClass
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{link.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {link.description}
                          </p>
                          <p className="text-xs text-muted-foreground/70 truncate mt-1 font-mono">
                            {link.url}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCopy(link)}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleShare(link)}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                        {link.qrCodeUrl && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleShowQR(link.id)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          asChild
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* QR Code section */}
                    {isQRVisible && link.qrCodeUrl && (
                      <div className="border-t p-4 bg-muted/30">
                        <div className="flex flex-col items-center">
                          <img
                            src={link.qrCodeUrl}
                            alt={`QR Code for ${link.label}`}
                            className="w-48 h-48 rounded-lg bg-white p-2"
                          />
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Scan to open {link.label.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
