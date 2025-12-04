import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QRPosterGenerator } from '@/components/QRPosterGenerator';

interface QRPosterDialogProps {
  referralUrl: string;
  referrerName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  className?: string;
}

export const QRPosterDialog: React.FC<QRPosterDialogProps> = ({
  referralUrl,
  referrerName,
  variant = 'outline',
  className = 'w-full justify-start',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <QrCode className="h-4 w-4 mr-2" />
          Generate QR Poster
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR Code Poster Generator</DialogTitle>
        </DialogHeader>
        <QRPosterGenerator referralUrl={referralUrl} referrerName={referrerName} />
      </DialogContent>
    </Dialog>
  );
};

export default QRPosterDialog;
