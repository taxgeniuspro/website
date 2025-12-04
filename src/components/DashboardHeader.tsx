'use client';

import { useSession, signOut } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Eye, LogOut, Settings, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { RoleSwitcher } from '@/components/admin/RoleSwitcher';
import { UserRole } from '@/lib/permissions';
import { GlobalSearch } from '@/components/GlobalSearch';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { RecentItemsDropdown } from '@/components/RecentItems';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardHeaderProps {
  actualRole?: UserRole;
  effectiveRole?: UserRole;
  isViewingAsOtherRole?: boolean;
}

export function DashboardHeader({
  actualRole,
  effectiveRole,
  isViewingAsOtherRole = false,
}: DashboardHeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const { theme, setTheme } = useTheme();

  // ALWAYS trust server props if provided (prevents flickering from stale session cache)
  // Only fall back to client-side user data if server didn't provide props
  const role = effectiveRole ?? user?.role;
  const realRole = actualRole ?? user?.role;

  // If we have server props, don't let client data override them during hydration
  const displayRole = effectiveRole !== undefined ? effectiveRole : role;
  const displayRealRole = actualRole !== undefined ? actualRole : realRole;

  const getRoleBadgeColor = (role?: string) => {
    const normalizedRole = role?.toString().toUpperCase();
    switch (normalizedRole) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'ADMIN':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'LEAD':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'TAX_PREPARER':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'AFFILIATE':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'CLIENT':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatRole = (role?: string | UserRole) => {
    if (!role) return 'User';
    return String(role)
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 bg-background z-10">
        {/* Sidebar Toggle */}
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-white font-bold text-sm">TG</span>
          </div>
          <span className="text-lg font-semibold hidden md:block">Tax Genius</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Role Switcher - Only for admins */}
          {(displayRealRole === 'SUPER_ADMIN' || displayRealRole === 'ADMIN') && (
            <RoleSwitcher
              actualRole={displayRealRole}
              effectiveRole={displayRole || 'CLIENT'}
              isViewingAsOtherRole={isViewingAsOtherRole}
            />
          )}

          {/* Global Search - Command+K */}
          <GlobalSearch />

          {/* Recent Items - Quick Access */}
          <RecentItemsDropdown maxItems={10} />

          {/* Dark Mode Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Section */}
          <div className="flex items-center gap-3 pl-2 border-l">
            {/* User Info - Hidden on small screens */}
            <div className="hidden lg:flex flex-col items-end">
              <p className="text-sm font-medium leading-none">
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <Badge
                variant="secondary"
                className={`mt-1 text-xs flex items-center gap-1 ${getRoleBadgeColor(displayRole)}`}
              >
                {isViewingAsOtherRole && <Eye className="h-3 w-3" />}
                {formatRole(displayRole)}
              </Badge>
            </div>

            {/* User Button with dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="text-red-600 dark:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Keyboard Shortcuts Dialog - Global */}
      <KeyboardShortcutsDialog />
    </>
  );
}
