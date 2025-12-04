'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { ALL_NAV_ITEMS, ROLE_DASHBOARD_ROUTES, type NavItem } from '@/lib/navigation-items';
import { Phone, MapPin, Share2, ChevronUp, ChevronDown, Settings, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface MobileSidebarProps {
  role: UserRole;
  permissions: Partial<UserPermissions>;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ role, permissions, isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(true);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mobile-sidebar-footer-collapsed');
    if (saved !== null) {
      setIsFooterCollapsed(saved === 'true');
    }
  }, []);

  // Toggle and save to localStorage
  const toggleFooterCollapsed = () => {
    const newState = !isFooterCollapsed;
    setIsFooterCollapsed(newState);
    localStorage.setItem('mobile-sidebar-footer-collapsed', String(newState));
  };

  // Get role-specific dashboard route
  const getDashboardRoute = () => {
    switch (role) {
      case 'tax_preparer':
        return '/dashboard/tax-preparer/settings';
      case 'affiliate':
        return '/dashboard/affiliate/settings';
      case 'client':
      case 'lead':
        return '/dashboard/client/settings';
      case 'admin':
      case 'super_admin':
        return '/admin/settings';
      default:
        return '/dashboard/settings';
    }
  };

  // Filter navigation items based on user's role and permissions
  const filteredItems = ALL_NAV_ITEMS.filter((item) => {
    // Check if item is restricted to specific roles
    if (item.roles && !item.roles.includes(role)) {
      return false;
    }

    // Check permission
    return permissions[item.permission] === true;
  }).map((item) => {
    // Dashboard Home is special - update href based on role (but only for the generic /dashboard route)
    if (item.permission === 'dashboard' && item.href === '/dashboard') {
      return { ...item, href: ROLE_DASHBOARD_ROUTES[role] };
    }
    return item;
  });

  // Group items by section
  const sections: Record<string, NavItem[]> = {};
  filteredItems.forEach((item) => {
    const section = item.section || 'Other';
    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(item);
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-white font-bold text-sm">TG</span>
              </div>
              <span className="text-lg font-semibold">Tax Genius Pro</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-13rem)] px-4 py-4">
          <nav className="space-y-6">
            {Object.entries(sections).map(([sectionName, items]) => (
              <div key={sectionName} className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  {sectionName}
                </h3>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Collapsible Footer Section */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-background">
          {/* Collapsed State - Icon Buttons Only */}
          {isFooterCollapsed && (
            <div className="p-4">
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="tel:+14046271015"
                  className="w-10 h-10 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                  title="Call Us"
                >
                  <Phone className="w-4 h-4" />
                </Link>
                <Link
                  href="https://maps.google.com/?q=1632+Jonesboro+Rd+SE+Atlanta+GA+30315"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                  title="Location"
                >
                  <MapPin className="w-4 h-4" />
                </Link>
                <Link
                  href="/quick-share"
                  onClick={onClose}
                  className="w-10 h-10 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                  title="Quick Share"
                >
                  <Share2 className="w-4 h-4" />
                </Link>
                <Link
                  href={getDashboardRoute()}
                  onClick={onClose}
                  className="w-10 h-10 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => signOut(() => router.push('/'))}
                  className="w-10 h-10 bg-muted hover:bg-destructive/10 transition-colors rounded-full flex items-center justify-center"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleFooterCollapsed}
                  className="w-10 h-10 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-full flex items-center justify-center"
                  aria-label="Expand quick actions"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Expanded State - Full Buttons with Labels */}
          {!isFooterCollapsed && (
            <div className="p-4 space-y-2">
              <Link
                href="tel:+14046271015"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-primary/10 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call: +1 404-627-1015</span>
              </Link>
              <Link
                href="https://maps.google.com/?q=1632+Jonesboro+Rd+SE+Atlanta+GA+30315"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-primary/10 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>1632 Jonesboro Rd SE, Atlanta</span>
              </Link>
              <Link
                href="/quick-share"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-primary/10 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Quick Share</span>
              </Link>
              <Link
                href={getDashboardRoute()}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-primary/10 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => signOut(() => router.push('/'))}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-destructive/10 hover:bg-destructive/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
              <button
                onClick={toggleFooterCollapsed}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Collapse quick actions"
              >
                <span>Collapse</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
