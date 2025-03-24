"use client"

import * as React from "react"
import {
  Anvil,
  Eye,
  EyeOff,
  KeyRound,
  Github,
} from "lucide-react"

import { NavProjects } from "@/components/nav-projects"
import { NavAPIKeysSettings } from "@/components/nav-api-keys-settings"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "./theme-toggle"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Anvil className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Prompt Forge</span>
                  <span className="truncate text-xs">AI Prompt Workbench</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects />
      </SidebarContent>
      <SidebarFooter className="p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <ThemeToggle />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavAPIKeysSettings />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm">
                  <a href="https://github.com/Heliumchen/prompt-forge">
                    <Github />
                    <span>View on Github</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>              
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>          
      </SidebarFooter>
    </Sidebar>
  )
}
