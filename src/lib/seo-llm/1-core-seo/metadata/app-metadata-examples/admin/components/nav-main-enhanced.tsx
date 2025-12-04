'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useNavigationState } from '@/hooks/useNavigationState'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface NavMainItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

export function NavMainEnhanced({
  items,
}: {
  items: NavMainItem[]
}) {
  const pathname = usePathname()

  // Create initial state from items
  const initialState = items.reduce((acc, item) => {
    acc[item.title] = item.isActive || false
    return acc
  }, {} as Record<string, boolean>)

  const { openSections, toggleSection, isLoaded } = useNavigationState(initialState)

  // Don't render until localStorage is loaded to prevent flash
  if (!isLoaded) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
          const hasSubItems = item.items && item.items.length > 0
          const subItemCount = hasSubItems ? item.items!.length : 0

          return (
            <Collapsible
              key={item.title}
              asChild
              className="group/collapsible"
              open={openSections[item.title] || false}
              onOpenChange={() => toggleSection(item.title)}
            >
              <SidebarMenuItem>
                {hasSubItems ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={isActive} tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        {/* Child count indicator */}
                        <Badge
                          variant="secondary"
                          className={cn(
                            'ml-auto mr-1 h-5 min-w-[20px] px-1.5 text-[10px] font-medium',
                            'transition-all duration-200',
                            'group-data-[state=open]/collapsible:bg-primary/10 group-data-[state=open]/collapsible:text-primary',
                          )}
                        >
                          {subItemCount}
                        </Badge>
                        <ChevronRight className="ml-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
