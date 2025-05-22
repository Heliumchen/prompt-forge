"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const models = [
  {
    provider: "OpenAI",
    items: [
      { value: "o1", label: "o1" },
      { value: "o1-mini", label: "o1-mini" },
      { value: "o3-mini", label: "o3-mini" },
      { value: "gpt-4o", label: "gpt-4o" },
      { value: "gpt-4o-mini", label: "gpt-4o-mini" },
      { value: "gpt-4.5-preview-2025-02-27", label: "gpt-4.5-preview-2025-02-27" },
      { value: "gpt-4.1-nano-2025-04-14", label: "gpt-4.1-nano-2025-04-14" },
      { value: "gpt-4.1-mini-2025-04-14", label: "gpt-4.1-mini-2025-04-14" },
      { value: "gpt-4.1-2025-04-14", label: "gpt-4.1-2025-04-14" },      
    ]
  },
  {
    provider: "Google",
    items: [
      { value: "gemini-2.5-flash-preview-05-20", label: "gemini-2.5-flash-preview-05-20" },
      { value: "gemini-2.5-pro-preview-05-065", label: "gemini-2.5-pro-preview-05-06" },
      { value: "gemini-2.0-flash", label: "gemini-2.0-flash" },
      { value: "gemini-2.0-flash-lite", label: "gemini-2.0-flash-lite" },      
      { value: "gemini-1.5-pro", label: "gemini-1.5-pro" },
      { value: "gemini-1.5-flash", label: "gemini-1.5-flash" }
    ]
  },
  {
    provider: "Anthropic",
    items: [
      { value: "claude-3-7-sonnet-latest", label: "claude-3-7-sonnet-latest" },
      { value: "claude-3-5-haiku-latest", label: "claude-3-5-haiku-latest" },
      { value: "claude-3-5-sonnet-latest", label: "claude-3-5-sonnet-latest" },
      { value: "claude-3-opus-latest", label: "claude-3-opus-latest" },
      { value: "claude-3-sonnet-20240229", label: "claude-3-sonnet-20240229" },
      { value: "claude-3-haiku-20240307", label: "claude-3-haiku-20240307" }
    ]
  },
  {
    provider: "DeepSeek",
    items: [
      { value: "deepseek-chat", label: "deepseek-chat" },
      { value: "deepseek-reasoner", label: "deepseek-reasoner" }
    ]
  }
]

interface ModelSelectProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function ModelSelect({ value = "", onChange }: ModelSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [modelValue, setModelValue] = React.useState(value)

  // 初始化时从value中解析provider和modelValue
  React.useEffect(() => {
    if (value) {
      const [, modelValue] = value.split("/")
      setModelValue(modelValue)
    }
  }, [value])

  // 查找当前选中模型的标签
  const getSelectedModelLabel = () => {
    for (const group of models) {
      const foundModel = group.items.find(item => item.value === modelValue)
      if (foundModel) return foundModel.label
    }
    return "Select Model..."
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex w-[200px] justify-between"
        >
          <span className="truncate">{modelValue ? getSelectedModelLabel() : "Select Model..."}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search model..." className="h-9" />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {models.map((group) => (
              <CommandGroup key={group.provider} heading={group.provider}>
                {group.items.map((model) => (
                  <CommandItem
                    key={model.value}
                    value={model.value}
                    onSelect={(currentValue: string) => {
                      const newValue = currentValue === modelValue ? "" : currentValue
                      setModelValue(newValue)
                      setOpen(false)
                      onChange?.(`${group.provider}/${newValue}`)
                    }}
                  >
                    {model.label}
                    <Check
                      className={cn(
                        "ml-auto",
                        modelValue === model.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
