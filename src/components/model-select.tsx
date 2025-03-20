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
      { value: "o1-preview", label: "o1-preview" },
      { value: "o1-mini", label: "o1-mini" },
      { value: "gpt-4o", label: "gpt-4o" },
      { value: "gpt-4o-mini", label: "gpt-4o-mini" }
    ]
  },
  {
    provider: "Google",
    items: [
      { value: "gemini-1.5-pro", label: "gemini-1.5-pro" },
      { value: "gemini-1.0-pro", label: "gemini-1.0-pro" },
      { value: "gemini-pro-vision", label: "gemini-pro-vision" }
    ]
  },
  {
    provider: "Anthropic",
    items: [
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
          className="w-[200px] justify-between"
        >
          {modelValue ? getSelectedModelLabel() : "Select Model..."}
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
