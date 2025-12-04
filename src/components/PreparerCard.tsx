'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Award, Sparkles, Phone, Mail, QrCode } from 'lucide-react';
import Image from 'next/image';

interface PreparerCardProps {
  preparer: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    companyName?: string | null;
    licenseNo?: string | null;
    bio?: string | null;
    phone?: string | null;
    email?: string | null;
    qrCodeUrl?: string | null;
  };
}

export function PreparerCard({ preparer }: PreparerCardProps) {
  const initials = `${preparer.firstName[0]}${preparer.lastName[0]}`.toUpperCase();
  const fullName = `${preparer.firstName} ${preparer.lastName}`;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Avatar className="w-20 h-20 border-2 border-primary/30 flex-shrink-0">
            <AvatarImage src={preparer.avatarUrl || undefined} alt={fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground">Your Tax Professional</p>
              </div>
              <h3 className="text-xl font-bold text-foreground">{fullName}</h3>
            </div>

            {/* Company Name */}
            {preparer.companyName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{preparer.companyName}</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="flex flex-col gap-1">
              {preparer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${preparer.phone}`} className="hover:text-primary">
                    {preparer.phone}
                  </a>
                </div>
              )}
              {preparer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${preparer.email}`} className="hover:text-primary">
                    {preparer.email}
                  </a>
                </div>
              )}
            </div>

            {/* License Badge */}
            {preparer.licenseNo && (
              <Badge variant="secondary" className="text-xs w-fit">
                <Award className="w-3 h-3 mr-1" />
                License: {preparer.licenseNo}
              </Badge>
            )}

            {/* Bio */}
            {preparer.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{preparer.bio}</p>
            )}
          </div>

          {/* QR Code */}
          {preparer.qrCodeUrl && (
            <div className="flex-shrink-0">
              <div className="relative w-24 h-24 border-2 border-primary/20 rounded-lg overflow-hidden bg-white">
                <Image
                  src={preparer.qrCodeUrl}
                  alt={`QR Code for ${fullName}`}
                  fill
                  className="object-contain p-1"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-1">
                <QrCode className="w-3 h-3 inline mr-1" />
                Scan to connect
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
