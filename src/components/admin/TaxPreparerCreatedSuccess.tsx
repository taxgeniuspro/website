'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Copy,
  Download,
  ExternalLink,
  Mail,
  QrCode,
  Link2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface TaxPreparerCreatedSuccessProps {
  isOpen: boolean;
  accountData: {
    userId: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    trackingCode: string;
    magicLink: string;
    magicLinkExpiry: string;
    qrCodeUrl?: string;
    intakeFormUrl: string;
    appointmentUrl: string;
    profilePhotoUrl?: string;
  };
  onClose: () => void;
  onCreateAnother: () => void;
}

export function TaxPreparerCreatedSuccess({
  isOpen,
  accountData,
  onClose,
  onCreateAnother,
}: TaxPreparerCreatedSuccessProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadQRCode = () => {
    if (!accountData.qrCodeUrl) return;

    // Create download link
    const link = document.createElement('a');
    link.href = accountData.qrCodeUrl;
    link.download = `${accountData.trackingCode}-qr-code.png`;
    link.click();
    toast.success('QR code downloaded');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            Tax Preparer Account Created!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Confirmation */}
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Welcome Email Sent
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    To: {accountData.email}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    The tax preparer will receive instructions to set up their password.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Magic Link */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Setup Link (Expires in 24 hours)
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={accountData.magicLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(accountData.magicLink, 'Magic link')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this link if you need to manually send the setup URL
            </p>
          </div>

          <Separator />

          {/* Account Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Account Details
            </h3>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{accountData.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{accountData.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tracking Code</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-medium bg-muted px-2 py-1 rounded">
                    {accountData.trackingCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(accountData.trackingCode, 'Tracking code')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">User ID</p>
                <p className="font-mono text-xs">{accountData.userId}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* QR Code */}
          {accountData.qrCodeUrl && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                QR Code Preview
              </h3>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-48 h-48 border-2 rounded-lg overflow-hidden bg-white">
                  <Image
                    src={accountData.qrCodeUrl}
                    alt="QR Code"
                    fill
                    className="object-contain p-2"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This QR code links to their intake form and includes their tracking code.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadQRCode}>
                      <Download className="w-4 h-4 mr-2" />
                      Download QR Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(accountData.qrCodeUrl!, 'QR code URL')}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy URL
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Referral Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Referral Links</h3>

            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Intake Form URL</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={accountData.intakeFormUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs border rounded-md bg-muted font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(accountData.intakeFormUrl, 'Intake form URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(accountData.intakeFormUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Appointment URL</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={accountData.appointmentUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs border rounded-md bg-muted font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(accountData.appointmentUrl, 'Appointment URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(accountData.appointmentUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onCreateAnother}>
              Create Another
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`/admin/users?id=${accountData.userId}`, '_blank')}
              >
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
