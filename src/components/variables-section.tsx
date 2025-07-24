"use client"

import * as React from "react"
import { Variable } from "@/lib/storage"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Braces, ChevronDown, ChevronRight } from "lucide-react"

interface VariablesSectionProps {
  variables: Variable[]
  onVariableUpdate: (name: string, value: string) => void
  isGenerating?: boolean
  className?: string
  defaultCollapsed?: boolean
}

export function VariablesSection({
  variables,
  onVariableUpdate,
  isGenerating = false,
  className,
  defaultCollapsed = false
}: VariablesSectionProps) {
  // State for collapse/expand
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  
  // Debounce variable updates to avoid excessive calls
  const debounceTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({})

  const handleVariableChange = React.useCallback((name: string, value: string) => {
    // Clear existing timeout for this variable
    if (debounceTimeouts.current[name]) {
      clearTimeout(debounceTimeouts.current[name])
    }

    // Set new timeout for debounced update
    debounceTimeouts.current[name] = setTimeout(() => {
      onVariableUpdate(name, value)
      delete debounceTimeouts.current[name]
    }, 300) // 300ms debounce delay
  }, [onVariableUpdate])

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    const currentTimeouts = debounceTimeouts.current
    return () => {
      Object.values(currentTimeouts).forEach(clearTimeout)
    }
  }, [])

  // Empty state when no variables are detected
  if (variables.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4" />
          <h3 className="text-sm font-medium">Variables</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Braces className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-1">No variables detected</p>
          <p className="text-xs text-muted-foreground">
            Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{{variable}}"}</code> syntax in your prompts
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4" />
          <h3 className="text-sm font-medium">Variables</h3>
          <span className="text-xs text-muted-foreground">({variables.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-6 w-6 p-0"
          aria-label={isCollapsed ? "Expand variables" : "Collapse variables"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {!isCollapsed && (
        <div className="space-y-3">
          {variables.map((variable) => (
            <VariableInput
              key={variable.name}
              variable={variable}
              onChange={handleVariableChange}
              disabled={isGenerating}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface VariableInputProps {
  variable: Variable
  onChange: (name: string, value: string) => void
  disabled?: boolean
}

function VariableInput({ variable, onChange, disabled = false }: VariableInputProps) {
  const [localValue, setLocalValue] = React.useState(variable.value)

  // Update local value when variable prop changes
  React.useEffect(() => {
    setLocalValue(variable.value)
  }, [variable.value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    if (!disabled) {
      onChange(variable.name, newValue)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`variable-${variable.name}`} className="text-xs">
        <code className="bg-muted px-1 py-0.5 rounded text-xs">
          {`{{${variable.name}}}`}
        </code>
      </Label>
      <Textarea
        id={`variable-${variable.name}`}
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={`Enter value for ${variable.name}...`}
        className="min-h-20 text-sm"
        aria-label={`Value for variable ${variable.name}`}
      />
    </div>
  )
}

// Loading skeleton component for when variables are being detected
export function VariablesSectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}