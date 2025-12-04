'use client'

import * as React from 'react'
import {
  Home,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  Mail,
  Palette,
  Settings2,
  Printer,
} from 'lucide-react'

import { NavMainEnhanced, type NavMainItem } from './nav-main-enhanced'
import { NavToolbar } from './nav-toolbar'
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
import { useNavigationState } from '@/hooks/useNavigationState'

const navItems: NavMainItem[] = [
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
]

const userData = {
  name: 'Ira Watkins',
  email: 'iradwatkins@gmail.com',
  avatar: '/avatars/admin.jpg',
}

const teamsData = [
  {
    name: 'GangRun Printing',
    logo: Printer,
    plan: 'Enterprise',
  },
]

export function AppSidebarEnhanced({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Get navigation state management
  const initialState = navItems.reduce((acc, item) => {
    acc[item.title] = item.isActive || false
    return acc
  }, {} as Record<string, boolean>)

  const { expandAll, collapseAll } = useNavigationState(initialState)

  // Get all expandable section titles
  const expandableSections = navItems.filter((item) => item.items && item.items.length > 0).map((item) => item.title)

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Cmd+E or Ctrl+E - Expand all
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && !e.shiftKey) {
        e.preventDefault()
        expandAll(expandableSections)
      }
      // Cmd+Shift+E or Ctrl+Shift+E - Collapse all
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && e.shiftKey) {
        e.preventDefault()
        collapseAll()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [expandAll, collapseAll, expandableSections])

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teamsData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMainEnhanced items={navItems} />
        {/* Toolbar for expand/collapse all */}
        <NavToolbar onExpandAll={() => expandAll(expandableSections)} onCollapseAll={collapseAll} />
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
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
