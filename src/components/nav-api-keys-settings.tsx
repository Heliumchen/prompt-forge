import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { toast } from "sonner"


export function NavAPIKeysSettings() {
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

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      try {
        const savedKeys = localStorage.getItem('apiKeys')
        if (savedKeys) {
          setApiKeys(JSON.parse(savedKeys))
        }
      } catch (error) {
        console.error('Error loading API keys:', error)
        toast.error('Error loading API keys')
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
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys))
    toast.success('API keys have been saved to local storage')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem key="API Keys Settings">
              <SidebarMenuButton asChild size="sm">
                <a className="cursor-pointer">
                  <KeyRound />
                  <span>API Keys Settings</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>API Keys Settings</DialogTitle>
          <DialogDescription>
            Configure API keys for different AI service providers. All keys are stored locally in the browser and will not be uploaded to the server.
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
                  placeholder={`Enter ${provider.name} API key`}
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
          <Button onClick={saveKeys}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
