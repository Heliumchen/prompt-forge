"use client"

import { useState } from "react"
import { SquareArrowOutUpRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ModelConfig } from "@/lib/storage"

interface DialogModelSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelConfig: ModelConfig
  onSave: (config: ModelConfig) => void
}

export function DialogModelSettings({
  open,
  onOpenChange,
  modelConfig,
  onSave,
}: DialogModelSettingsProps) {
  const [config, setConfig] = useState<ModelConfig>(modelConfig)

  const handleSave = () => {
    onSave({
      ...modelConfig,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      reasoning_effort: config.reasoning_effort
    })
    onOpenChange(false)
  }

  // 检查是否是 reasoning 模型
  const isReasoningModel = (model: string): boolean => {
    const reasoningPatterns = [
      /gpt-5/i,
      /o1/i,
      /o3/i,
      /grok.*reasoning/i,
      /gemini.*thinking/i
    ];
    return reasoningPatterns.some(pattern => pattern.test(model));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
          <DialogDescription>
            Configure advanced parameters for the model
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-8 py-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="temperature">Temperature</Label>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[config.temperature ?? 1.0]}
                onValueChange={([value]) => setConfig({ ...config, temperature: value })}
                className="flex-1"
              />
              <span className="w-12 text-right">{config.temperature ?? 1.0}</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max_tokens">Max Tokens</Label>
            <Input
              id="max_tokens"
              type="number"
              value={config.max_tokens || 4096}
              onChange={(e) => setConfig({ ...config, max_tokens: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Default: 4096"
            />
          </div>

          {isReasoningModel(modelConfig.model) && (
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="reasoning_effort">Reasoning Effort</Label>
                <span className="text-xs text-muted-foreground">(for reasoning models)</span>
              </div>
              <Select
                value={config.reasoning_effort || "medium"}
                onValueChange={(value: 'low' | 'medium' | 'high') => setConfig({ ...config, reasoning_effort: value })}
              >
                <SelectTrigger id="reasoning_effort">
                  <SelectValue placeholder="Select effort level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (~20% tokens for reasoning)</SelectItem>
                  <SelectItem value="medium">Medium (~50% tokens for reasoning)</SelectItem>
                  <SelectItem value="high">High (~80% tokens for reasoning)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls how much time the model spends on internal reasoning. Higher effort means more thorough thinking but slower responses.
              </p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <a
              href="https://platform.openai.com/docs/api-reference/chat/create"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              View all API options<SquareArrowOutUpRight className="inline-block ml-1 h-3 w-3" />
            </a>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
