'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
  Calculator,
  FileText,
  Users,
  Building,
  TrendingUp,
  Clock,
  Shield,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

interface MenuItem {
  title: string;
  href: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const servicesMenu: MenuSection = {
  title: 'Services',
  items: [
    {
      title: 'Individual Tax Returns',
      href: '/services/individual',
      description: 'Personal tax preparation with maximum deductions',
      icon: Calculator,
    },
    {
      title: 'Business Tax Services',
      href: '/services/business',
      description: 'Comprehensive business tax solutions',
      icon: Building,
    },
    {
      title: 'Tax Planning',
      href: '/services/planning',
      description: 'Strategic planning to minimize tax liability',
      icon: TrendingUp,
    },
    {
      title: 'Audit Support',
      href: '/services/audit',
      description: 'IRS audit representation and support',
      icon: Shield,
    },
    {
      title: 'Express Filing',
      href: '/services/express',
      description: 'Fast-track filing for simple returns',
      icon: Clock,
    },
    {
      title: 'View All Services',
      href: '/services',
      description: 'Browse our complete service catalog',
      icon: ChevronRight,
    },
  ],
};

const resourcesMenu: MenuSection = {
  title: 'Resources',
  items: [
    {
      title: 'Tax Calculator',
      href: '/resources/calculator',
      description: 'Estimate your tax refund or liability',
      icon: Calculator,
    },
    {
      title: 'Tax Forms',
      href: '/resources/forms',
      description: 'Download common tax forms',
      icon: FileText,
    },
    {
      title: 'Tax Guide',
      href: '/resources/guide',
      description: 'Comprehensive tax preparation guide',
      icon: FileText,
    },
    {
      title: 'FAQ',
      href: '/faq',
      description: 'Frequently asked questions',
      icon: Users,
    },
    {
      title: 'Blog',
      href: '/blog',
      description: 'Tax tips and industry insights',
      icon: TrendingUp,
    },
  ],
};

const mainNavItems: MenuItem[] = [
  { title: 'Home', href: '/' },
  { title: 'About', href: '/about' },
  { title: 'Pricing', href: '/pricing' },
  { title: 'Contact', href: '/contact' },
];

export function SiteMenu() {
  const pathname = usePathname();

  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        {mainNavItems.slice(0, 1).map((item) => (
          <NavigationMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), pathname === item.href && 'bg-accent')}
              >
                {item.title}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}

        <NavigationMenuItem>
          <NavigationMenuTrigger>Services</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-6 w-[500px] lg:w-[600px] lg:grid-cols-2">
              {servicesMenu.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group grid grid-cols-[auto,1fr] items-start gap-3 rounded-lg p-3 hover:bg-accent transition-colors',
                      pathname === item.href && 'bg-accent'
                    )}
                  >
                    {Icon && <Icon className="h-5 w-5 text-primary mt-0.5" />}
                    <div className="space-y-1">
                      <div className="font-medium leading-none group-hover:underline">
                        {item.title}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-6 w-[400px] lg:w-[500px]">
              {resourcesMenu.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group grid grid-cols-[auto,1fr] items-start gap-3 rounded-lg p-3 hover:bg-accent transition-colors',
                      pathname === item.href && 'bg-accent'
                    )}
                  >
                    {Icon && <Icon className="h-5 w-5 text-primary mt-0.5" />}
                    <div className="space-y-1">
                      <div className="font-medium leading-none group-hover:underline">
                        {item.title}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {mainNavItems.slice(1).map((item) => (
          <NavigationMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), pathname === item.href && 'bg-accent')}
              >
                {item.title}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function MobileMenu() {
  const pathname = usePathname();

  const allItems = [
    ...mainNavItems,
    { title: 'Services', href: '/services' },
    ...servicesMenu.items.slice(0, -1),
    ...resourcesMenu.items,
  ];

  return (
    <nav className="flex flex-col space-y-1 p-4">
      {allItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
