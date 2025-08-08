"use client";

import * as React from "react";
import { Check, ChevronsUpDown, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LLMClient } from "@/lib/openrouter";
import { ModelGroup } from "@/lib/openrouter/types";
import { toast } from "sonner";

interface ModelSelectProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function ModelSelect({ value = "", onChange }: ModelSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [models, setModels] = React.useState<ModelGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState(value);

  // 加载模型列表
  const loadModels = React.useCallback(async () => {
    setLoading(true);
    try {
      // 从localStorage获取OpenRouter API密钥
      const apiKeysStr = localStorage.getItem("apiKeys");
      if (!apiKeysStr) {
        toast.error("请先配置OpenRouter API密钥");
        return;
      }

      const apiKeys = JSON.parse(apiKeysStr);
      const openRouterKey = apiKeys.OpenRouter;

      if (!openRouterKey) {
        toast.error("请先配置OpenRouter API密钥");
        return;
      }

      const client = new LLMClient(openRouterKey);
      const groupedModels = await client.getGroupedModels();
      setModels(groupedModels);
    } catch (error) {
      console.error("Failed to load models:", error);
      toast.error("加载模型列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时加载模型
  React.useEffect(() => {
    loadModels();
  }, [loadModels]);

  // 同步外部value
  React.useEffect(() => {
    setSelectedModel(value);
  }, [value]);

  // 查找当前选中模型的标签
  const getSelectedModelLabel = () => {
    for (const group of models) {
      const foundModel = group.models.find(
        (model) => model.id === selectedModel,
      );
      if (foundModel) {
        return foundModel.name;
      }
    }
    return selectedModel || "Select Model...";
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setOpen(false);
    onChange?.(modelId);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    LLMClient.clearCache();
    loadModels();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex w-[250px] justify-between"
          disabled={loading}
        >
          <span className="truncate">
            {loading ? "Loading models..." : getSelectedModelLabel()}
          </span>
          <div className="flex items-center gap-1">
            <div
              className="h-4 w-4 p-0 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={handleRefresh}
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </div>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search model..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              {models.length === 0
                ? "No models loaded. Please check your API key."
                : "No model found."}
            </CommandEmpty>
            {models.map((group) => (
              <CommandGroup
                key={group.provider}
                heading={group.provider.toUpperCase()}
              >
                {group.models.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.id}
                    onSelect={() => handleModelSelect(model.id)}
                    className="flex flex-col items-start"
                  >
                    <div className="flex items-center w-full">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{model.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {model.id}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          selectedModel === model.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
