'use client';

import {
  BoxIcon,
  Code2Icon,
  LayoutDashboardIcon,
  RouteIcon,
  SparklesIcon,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
  { id: 'routes', label: 'Routes', icon: RouteIcon },
  { id: 'functions', label: 'Functions', icon: SparklesIcon },
  { id: 'dev', label: 'Dev Mode', icon: Code2Icon },
];

export default function AppSidebar({ section, onNavigate, cwd }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <BoxIcon className="size-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold tracking-tight">Devboy Studio</div>
            <div className="truncate text-xs text-muted-foreground">Local config + editor</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={section === item.id}
                    tooltip={item.label}
                    onClick={() => onNavigate(item.id)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:hidden">
        <p className="truncate font-mono text-[10px] leading-relaxed text-muted-foreground" title={cwd}>
          {cwd || '…'}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
