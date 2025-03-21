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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ThemeToggle } from "./theme-toggle"

// 添加ModelSettingsDialog组件
function ModelSettingsDialog() {
  const providers = [
    { name: "OpenAI", id: "OpenAI" },
    { name: "Google", id: "Google" },
    { name: "Anthropic", id: "Anthropic" },
    { name: "DeepSeek", id: "DeepSeek" },
    { name: "OpenRouter", id: "OpenRouter" },
    { name: "Together", id: "Together" },
  ]

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [isOpen, setIsOpen] = useState(false)

  // 当对话框打开时，从localStorage加载数据
  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      try {
        const savedKeys = localStorage.getItem('apiKeys')
        if (savedKeys) {
          setApiKeys(JSON.parse(savedKeys))
        }
      } catch (error) {
        console.error('加载API密钥时出错:', error)
      }
    }
  }

  const handleKeyChange = (providerId: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: value }))
  }

  const toggleKeyVisibility = (providerId: string) => {
    setVisibleKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  const saveKeys = () => {
    // 保存到localStorage
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys))
    // 显示保存成功提示
    alert('API密钥已保存到本地存储')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
      <SidebarGroupContent>
        <SidebarMenu>
            <SidebarMenuItem key="Models Settings">
              <SidebarMenuButton asChild size="sm">
                <a className="cursor-pointer">
                  <KeyRound />
                  <span>Model Settings</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        </SidebarGroupContent>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>模型API设置</DialogTitle>
          <DialogDescription>
            配置各AI服务提供商的API密钥。所有密钥仅存储在本地浏览器中，不会上传到服务器。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {providers.map((provider) => (
            <div key={provider.id} className="grid grid-cols-4 items-center gap-4">
              <label htmlFor={provider.id} className="text-right">
                {provider.name}
              </label>
              <div className="col-span-3 flex">
                <Input
                  id={provider.id}
                  type={visibleKeys[provider.id] ? "text" : "password"}
                  value={apiKeys[provider.id] || ""}
                  onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                  className="flex-1"
                  placeholder={`输入${provider.name} API密钥`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility(provider.id)}
                  className="ml-2"
                >
                  {visibleKeys[provider.id] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={saveKeys}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
                <ModelSettingsDialog />
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
