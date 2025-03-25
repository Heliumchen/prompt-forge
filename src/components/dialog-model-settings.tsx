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
      max_tokens: config.max_tokens
    })
    onOpenChange(false)
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
