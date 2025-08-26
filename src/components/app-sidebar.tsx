"use client"

import * as React from "react"
import {
  Anvil,
  Github,
} from "lucide-react"

import { NavProjects } from "@/components/nav-projects"
import { NavTestSets } from "@/components/nav-test-sets"
import { NavAPIKeysSettings } from "@/components/nav-api-keys-settings"
import { NavBackupSettings } from "@/components/nav-backup-settings"
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
import { useProjects } from "@/contexts/ProjectContext"
import { useTestSets } from "@/contexts/TestSetContext"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { clearCurrentProject } = useProjects()
  const { setCurrentTestSet } = useTestSets()

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    clearCurrentProject()
    setCurrentTestSet(null)
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <button onClick={handleLogoClick} className="w-full">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Anvil className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Prompt Forge</span>
                  <span className="truncate text-xs">AI Prompt Workbench</span>
                </div>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects />
        <NavTestSets />
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
                <NavBackupSettings />
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
