'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getMobileNavConfig, type UserRole, type NavItem } from '@/lib/mobile-navigation-config';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MobileBottomNavProps {
  role: UserRole;
  onLinksOpen?: () => void;
  onNotificationsOpen?: () => void;
  notificationCount?: number;
}

export function MobileBottomNav({
  role,
  onLinksOpen,
  onNotificationsOpen,
  notificationCount = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const config = getMobileNavConfig(role);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNavClick = (item: NavItem) => {
    if (item.action === 'links' && onLinksOpen) {
      onLinksOpen();
    } else if (item.action === 'notifications' && onNotificationsOpen) {
      onNotificationsOpen();
    } else if (item.action === 'more') {
      setMoreOpen(true);
    }
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16">
          {config.primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isAction = !!item.action;

            const content = (
              <div
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative',
                  active ? 'text-primary' : 'text-muted-foreground',
                  !active && 'active:text-foreground'
                )}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-b-full" />
                )}

                {/* Notification badge */}
                {item.action === 'notifications' && notificationCount > 0 && (
                  <span className="absolute top-2 right-1/2 translate-x-4 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}

                <Icon className={cn('h-5 w-5', active && 'scale-110')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            );

            if (item.href && !isAction) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex-1 h-full"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className="flex-1 h-full"
                type="button"
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Menu Drawer */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between border-b pb-4">
            <DrawerTitle>Menu</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="p-4 pb-8 grid grid-cols-3 gap-3">
            {config.secondary.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href || '#'}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors',
                    'bg-muted/50 hover:bg-muted',
                    active && 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
