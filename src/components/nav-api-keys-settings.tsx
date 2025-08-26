import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import { decryptApiKey, encryptApiKey, migrateApiKeys } from "@/lib/security";

export function NavAPIKeysSettings() {
  const providers = [
    {
      name: "OpenRouter",
      id: "OpenRouter",
      description: "",
      required: true,
    },
  ];

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      try {
        // 首先尝试迁移现有的明文API key
        migrateApiKeys("apiKeys");

        const savedKeys = localStorage.getItem("apiKeys");
        if (savedKeys) {
          const encryptedKeys = JSON.parse(savedKeys);
          // 解密所有API key用于显示
          const decryptedKeys: Record<string, string> = {};
          for (const [providerId, encryptedKey] of Object.entries(
            encryptedKeys,
          )) {
            if (typeof encryptedKey === "string") {
              decryptedKeys[providerId] = decryptApiKey(encryptedKey);
            }
          }
          setApiKeys(decryptedKeys);
        }
      } catch (error) {
        console.error("Error loading API keys:", error);
        toast.error("Error loading API keys");
      }
    }
  };

  const handleKeyChange = (providerId: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [providerId]: value }));
  };

  const toggleKeyVisibility = (providerId: string) => {
    setVisibleKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const saveKeys = () => {
    try {
      // 加密所有API key后保存
      const encryptedKeys: Record<string, string> = {};
      for (const [providerId, apiKey] of Object.entries(apiKeys)) {
        if (apiKey && apiKey.trim() !== "") {
          encryptedKeys[providerId] = encryptApiKey(apiKey);
        }
      }

      localStorage.setItem("apiKeys", JSON.stringify(encryptedKeys));
      toast.success("API keys have been saved securely to local storage");
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast.error("Error saving API keys");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem key="API Keys Settings">
              <SidebarMenuButton asChild size="sm">
                <a className="cursor-pointer">
                  <KeyRound />
                  <span>API Key Settings</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>API Key Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenRouter API key to access multiple AI models. The
            key is stored locally in your browser and never uploaded to any
            server.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="grid grid-cols-4 items-center gap-4"
            >
              <label htmlFor={provider.id} className="text-right">
                {provider.name}
              </label>
              <div className="col-span-3 flex flex-col">
                <div className="flex">
                  <Input
                    id={provider.id}
                    type={visibleKeys[provider.id] ? "text" : "password"}
                    value={apiKeys[provider.id] || ""}
                    onChange={(e) =>
                      handleKeyChange(provider.id, e.target.value)
                    }
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
                {provider.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {provider.description}
                  </p>
                )}
                {provider.id === "OpenRouter" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Get OpenRouter API key
                    </a>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={saveKeys}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
