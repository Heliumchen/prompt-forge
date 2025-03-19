"use client"

import { useState, useEffect, useRef } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
  
import { Button } from '@/components/ui/button'
import { Copy, Delete } from 'lucide-react'

// TODO: 编辑器考虑支持markdown https://www.blocknotejs.org/

export interface PromptTextareaProps {
  type?: 'system' | 'user' | 'assistant'
  onTypeChange?: (type: 'system' | 'user' | 'assistant') => void
  onDelete?: () => void
  onCopy?: () => void
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export default function PromptTextarea({
  type = 'system',
  onTypeChange,
  onDelete,
  onCopy,
  placeholder,
  value = '',
  onChange
}: PromptTextareaProps) {
  const [textValue, setTextValue] = useState(value)
  const [currentType, setCurrentType] = useState<'system' | 'user' | 'assistant'>(type)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(
    placeholder || `${type} Prompt`
  )
  
  // 当外部type变化时更新内部状态
  useEffect(() => {
    setCurrentType(type)
  }, [type])
  
  // 当type变化时，如果没有自定义placeholder，则更新placeholder
  useEffect(() => {
    if (!placeholder) {
      setCurrentPlaceholder(`${currentType} Prompt`)
    }
  }, [currentType, placeholder])
  
  // 添加自动调整高度的功能
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      // 先将高度重置为自动，以便正确计算内容高度
      textarea.style.height = 'auto'
      // 然后设置为实际内容的高度
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }
  
  // 初始加载和内容变化时调整高度
  useEffect(() => {
    adjustHeight()
  }, [textValue])
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value)
    onChange?.(e.target.value)
  }
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'system' | 'user' | 'assistant'
    setCurrentType(newType)
    onTypeChange?.(newType)
  }
  
  const handleCopy = () => {
    navigator.clipboard.writeText(textValue)
    onCopy?.()
  }
  
  const handleDelete = () => {
    onDelete?.()
  }

  return (
    <div className="w-full group/item border rounded-md mb-2">
        <div className="flex w-full justify-between p-2">
            <Select 
              value={currentType.toLowerCase()} 
              onValueChange={(value) => {
                const newType = value as 'system' | 'user' | 'assistant';
                setCurrentType(newType);
                onTypeChange?.(newType);
              }}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex items-center gap-1 invisible group-hover/item:visible">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleCopy}>
                                <Copy />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Copy
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleDelete}>
                                <Delete />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Delete
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>                  
        </div>
        <textarea 
          ref={textareaRef}
          className="textarea w-full p-3 min-h-24 h-fit resize-none overflow-hidden focus:outline-none" 
          placeholder={currentPlaceholder}
          value={textValue}
          onChange={handleChange}
        ></textarea>
    </div>
  )
}

