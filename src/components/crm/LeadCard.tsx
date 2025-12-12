'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Phone,
  Mail,
  MessageSquare,
  MoreVertical,
  User,
  FileText,
  FolderPlus,
  StickyNote,
  UserCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  source?: string;
  referralCode?: string;
  createdAt: Date | string;
  avatarUrl?: string;
  notes?: string;
}

interface LeadCardProps {
  lead: Lead;
  onCall?: (lead: Lead) => void;
  onText?: (lead: Lead) => void;
  onEmail?: (lead: Lead) => void;
  onViewCRM?: (lead: Lead) => void;
  onViewTaxDetails?: (lead: Lead) => void;
  onCreateFolder?: (lead: Lead) => void;
  onAddNote?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
  onSchedule?: (lead: Lead) => void;
  className?: string;
}

const statusColors: Record<Lead['status'], string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  QUALIFIED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  PROPOSAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function LeadCard({
  lead,
  onCall,
  onText,
  onEmail,
  onViewCRM,
  onViewTaxDetails,
  onCreateFolder,
  onAddNote,
  onConvert,
  onSchedule,
  className,
}: LeadCardProps) {
  const fullName = `${lead.firstName} ${lead.lastName}`.trim();
  const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase();
  const createdDate = typeof lead.createdAt === 'string' ? new Date(lead.createdAt) : lead.createdAt;

  const handleCall = () => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
      onCall?.(lead);
    }
  };

  const handleText = () => {
    if (lead.phone) {
      window.location.href = `sms:${lead.phone}`;
      onText?.(lead);
    }
  };

  const handleEmail = () => {
    window.location.href = `mailto:${lead.email}`;
    onEmail?.(lead);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        {/* Header with avatar, name, and status */}
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={lead.avatarUrl} alt={fullName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{fullName || 'Unknown'}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', statusColors[lead.status])}>
                    {lead.status}
                  </Badge>
                  {lead.referralCode && (
                    <span className="text-[10px] text-muted-foreground">
                      Ref: {lead.referralCode}
                    </span>
                  )}
                </div>
              </div>

              {/* More menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onViewCRM && (
                    <DropdownMenuItem onClick={() => onViewCRM(lead)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in CRM
                    </DropdownMenuItem>
                  )}
                  {onViewTaxDetails && (
                    <DropdownMenuItem onClick={() => onViewTaxDetails(lead)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Tax Details
                    </DropdownMenuItem>
                  )}
                  {onSchedule && (
                    <DropdownMenuItem onClick={() => onSchedule(lead)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onCreateFolder && (
                    <DropdownMenuItem onClick={() => onCreateFolder(lead)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Create Folder
                    </DropdownMenuItem>
                  )}
                  {onAddNote && (
                    <DropdownMenuItem onClick={() => onAddNote(lead)}>
                      <StickyNote className="h-4 w-4 mr-2" />
                      Add Note
                    </DropdownMenuItem>
                  )}
                  {onConvert && lead.status !== 'WON' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onConvert(lead)}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Convert to Client
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Contact info */}
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                <Mail className="h-3 w-3 flex-shrink-0" />
                {lead.email}
              </p>
              {lead.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  {lead.phone}
                </p>
              )}
            </div>

            {/* Source and date */}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground/70">
              {lead.source && <span>{lead.source}</span>}
              {lead.source && <span>•</span>}
              <span>{formatDistanceToNow(createdDate, { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={handleCall}
            disabled={!lead.phone}
          >
            <Phone className="h-4 w-4 mr-1.5" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={handleText}
            disabled={!lead.phone}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={handleEmail}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
