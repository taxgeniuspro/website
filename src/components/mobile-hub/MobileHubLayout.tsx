'use client';

import { ReactNode, useState } from 'react';
import { Home, BarChart3, MessageCircle, User, Menu, X, Monitor } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TaxAssistantWidget } from '@/components/tax-assistant/TaxAssistantWidget';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { UserRole } from '@/lib/permissions';

interface MobileHubLayoutProps {
  children: ReactNode;
  user: {
    firstName: string;
    lastName: string;
    imageUrl?: string;
    role?: UserRole;
  };
}

export function MobileHubLayout({ children, user }: MobileHubLayoutProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const switchToDesktopView = () => {
    localStorage.setItem('mobile_hub_disabled', 'true');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.imageUrl} alt={user.firstName} />
              <AvatarFallback>
                {user.firstName[0]}
                {user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">TaxGenius Hub</p>
              <p className="text-xs text-muted-foreground">Your command center</p>
            </div>
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Quick settings and options</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={switchToDesktopView}
                >
                  <Monitor className="h-4 w-4 mr-3" />
                  Switch to Desktop View
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-6">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
        <div className="grid grid-cols-4 gap-1 p-2">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={() => router.push('/mobile-hub')}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={() => router.push('/dashboard')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={() => {
              const event = new CustomEvent('openTaxAssistant');
              window.dispatchEvent(event);
            }}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs">Oliver</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={() => router.push('/dashboard/settings')}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </nav>

      {/* Tax Assistant AI Chat Widget - Only for Tax Preparers and Admins */}
      {user.role &&
        (user.role === 'tax_preparer' || user.role === 'admin' || user.role === 'super_admin') && (
          <TaxAssistantWidget />
        )}
    </div>
  );
}
