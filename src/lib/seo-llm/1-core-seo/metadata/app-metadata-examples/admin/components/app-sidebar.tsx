'use client'

import * as React from 'react'
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Printer,
  Palette,
  BarChart3,
  Home,
  Droplets,
  Layers,
  Mail,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  Truck,
  Monitor,
  TestTube,
  Settings,
  Wrench,
  Search,
} from 'lucide-react'

import { NavMain } from './nav-main'

import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: 'Ira Watkins',
    email: 'iradwatkins@gmail.com',
    avatar: '/avatars/admin.jpg',
  },
  teams: [
    {
      name: 'GangRun Printing',
      logo: Printer,
      plan: 'Enterprise',
    },
  ],
  navMain: [
    {
      title: 'Dashboard',
      url: '/admin',
      icon: Home,
      isActive: true,
    },
    {
      title: 'Orders',
      url: '/admin/orders',
      icon: ShoppingCart,
    },
    {
      title: 'Customers',
      url: '/admin/customers',
      icon: Users,
    },
    {
      title: 'Products',
      url: '/admin/products',
      icon: Package,
      isActive: true,
      items: [
        {
          title: 'All Products',
          url: '/admin/products',
        },
        {
          title: 'Categories',
          url: '/admin/categories',
        },
        {
          title: 'Paper Stocks',
          url: '/admin/paper-stocks',
        },
        {
          title: 'Paper Stock Sets',
          url: '/admin/paper-stock-sets',
        },
        {
          title: 'Quantities',
          url: '/admin/quantities',
        },
        {
          title: 'Sizes',
          url: '/admin/sizes',
        },
        {
          title: 'Add-ons',
          url: '/admin/addons',
        },
        {
          title: 'Add-on Sets',
          url: '/admin/addon-sets',
        },
        {
          title: 'Design Options',
          url: '/admin/design-options',
        },
        {
          title: 'Design Sets',
          url: '/admin/design-sets',
        },
        {
          title: 'Turnaround Times',
          url: '/admin/turnaround-times',
        },
        {
          title: 'Turnaround Time Sets',
          url: '/admin/turnaround-time-sets',
        },
      ],
    },
    {
      title: 'Analytics',
      url: '/admin/analytics',
      icon: BarChart3,
      items: [
        {
          title: 'Overview',
          url: '/admin/analytics',
        },
        {
          title: 'Funnel Analytics',
          url: '/admin/funnel-analytics',
        },
        {
          title: 'SEO Performance',
          url: '/admin/seo/performance',
        },
        {
          title: '🤖 Crawler Activity',
          url: '/admin/seo/crawlers',
        },
        {
          title: '🧠 AI Content Generator',
          url: '/admin/seo/generate',
        },
      ],
    },
    {
      title: 'Marketing & Automation',
      url: '/admin/marketing',
      icon: Mail,
      items: [
        {
          title: 'Campaigns',
          url: '/admin/marketing/campaigns',
        },
        {
          title: 'Email Builder',
          url: '/admin/marketing/email-builder',
        },
        {
          title: 'Automation',
          url: '/admin/marketing/automation',
        },
        {
          title: 'Segments',
          url: '/admin/marketing/segments',
        },
        {
          title: 'Analytics',
          url: '/admin/marketing/analytics',
        },
      ],
    },
    {
      title: 'Design',
      url: '/admin/design',
      icon: Palette,
      items: [
        {
          title: 'Theme Colors',
          url: '/admin/theme-colors',
        },
      ],
    },
    {
      title: 'Settings',
      url: '/admin/settings',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '/admin/settings',
        },
        {
          title: 'Staff',
          url: '/admin/staff',
        },
        {
          title: 'Vendors',
          url: '/admin/vendors',
        },
        {
          title: 'SEO & Search Engines',
          url: '/admin/seo',
        },
        {
          title: 'System Health',
          url: '/admin/monitoring',
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
