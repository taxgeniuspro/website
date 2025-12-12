'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Bell,
  Calendar,
  Users,
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  type: 'appointment' | 'lead' | 'document' | 'payment' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  href?: string;
}

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
}

const typeIcons = {
  appointment: Calendar,
  lead: Users,
  document: FileText,
  payment: DollarSign,
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
};

const typeColors = {
  appointment: 'text-blue-500 bg-blue-500/10',
  lead: 'text-purple-500 bg-purple-500/10',
  document: 'text-orange-500 bg-orange-500/10',
  payment: 'text-green-500 bg-green-500/10',
  info: 'text-gray-500 bg-gray-500/10',
  success: 'text-green-500 bg-green-500/10',
  warning: 'text-yellow-500 bg-yellow-500/10',
};

export function NotificationDrawer({
  open,
  onOpenChange,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  onClearAll,
}: NotificationDrawerProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const groupedNotifications = notifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = 'Earlier';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
      return groups;
    },
    {} as Record<string, Notification[]>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <DrawerTitle>Notifications</DrawerTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && onMarkAllRead && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                Mark all read
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                We&apos;ll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              {Object.entries(groupedNotifications).map(([group, items]) => (
                <div key={group}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {group}
                  </h3>
                  <div className="space-y-2">
                    {items.map((notification) => {
                      const Icon = typeIcons[notification.type];
                      const colorClass = typeColors[notification.type];

                      return (
                        <button
                          key={notification.id}
                          onClick={() => onNotificationClick?.(notification)}
                          className={cn(
                            'w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left',
                            'hover:bg-muted/50 active:bg-muted',
                            !notification.read && 'bg-primary/5'
                          )}
                        >
                          <div
                            className={cn(
                              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                              colorClass
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  'text-sm',
                                  !notification.read && 'font-medium'
                                )}
                              >
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && onClearAll && (
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClearAll}
            >
              Clear all notifications
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
