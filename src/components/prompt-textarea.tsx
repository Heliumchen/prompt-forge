"use client"

import { useState, useEffect, useRef, forwardRef } from 'react'
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
import { Copy, Delete, RefreshCw } from 'lucide-react'

// TODO: 编辑器考虑支持markdown https://www.blocknotejs.org/

export interface PromptTextareaProps {
  role?: 'system' | 'user' | 'assistant'
  onTypeChange?: (role: 'system' | 'user' | 'assistant') => void
  onDelete?: () => void
  onCopy?: () => void
  onRegenerate?: () => void
  isGenerating?: boolean
  placeholder?: string
  content?: string
  onChange?: (content: string) => void
  isStreaming?: boolean
  streamingContent?: string
}

const PromptTextarea = forwardRef<HTMLTextAreaElement, PromptTextareaProps>(({
  role = 'system',
  onTypeChange,
  onDelete,
  onCopy,
  onRegenerate,
  isGenerating = false,
  placeholder,
  content = '',
  onChange,
  isStreaming = false,
  streamingContent = ''
}, ref) => {
  const [textValue, setTextValue] = useState(content)
  const [currentRole, setCurrentRole] = useState<'system' | 'user' | 'assistant'>(role)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(
    placeholder || `Enter ${role} prompt here...`
  )
  
  // 当外部type变化时更新内部状态
  useEffect(() => {
    setCurrentRole(role)
  }, [role])
  
  // 当type变化时，如果没有自定义placeholder，则更新placeholder
  useEffect(() => {
    if (!placeholder) {
      setCurrentPlaceholder(`Enter ${currentRole} prompt here...`)
    }
  }, [currentRole, placeholder])
  
  // 当外部content变化时更新内部状态
  useEffect(() => {
    setTextValue(content)
  }, [content])
  
  // 当正在流式生成时，使用streamingContent值
  useEffect(() => {
    if (isStreaming && streamingContent !== undefined) {
      setTextValue(streamingContent)
    }
  }, [isStreaming, streamingContent])
  
  // 添加自动调整高度的功能
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const finalRef = (ref || textareaRef) as React.RefObject<HTMLTextAreaElement>
  
  // 添加窗口大小变化的监听
  useEffect(() => {
    const handleResize = () => {
      adjustHeight()
    }
    
    window.addEventListener('resize', handleResize)
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, []) // 空依赖数组，只在组件挂载时添加监听
  
  // 修改 adjustHeight 函数，确保在下一帧执行
  const adjustHeight = () => {
    const textarea = finalRef.current
    if (textarea) {
      requestAnimationFrame(() => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      })
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
  
  const handleCopy = () => {
    navigator.clipboard.writeText(textValue)
    onCopy?.()
  }
  
  const handleDelete = () => {
    onDelete?.()
  }

  const handleRegenerate = () => {
    onRegenerate?.()
  }

  return (
    <div className={`w-full group/item border rounded-md mb-2 ${isGenerating ? 'opacity-70' : ''}`}>
        <div className="flex w-full justify-between p-2">
            <Select 
              value={currentRole.toLowerCase()}
              disabled={isGenerating}
              onValueChange={(value) => {
                const newRole = value as 'system' | 'user' | 'assistant';
                setCurrentRole(newRole);
                onTypeChange?.(newRole);
              }}
            >
                <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="system">📌 System</SelectItem>
                    <SelectItem value="user">👤 User</SelectItem>
                    <SelectItem value="assistant">🤖 Assistant</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex items-center gap-1 invisible group-hover/item:visible">
                {currentRole === 'assistant' && onRegenerate && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={handleRegenerate}
                          disabled={isGenerating}
                        >
                          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isGenerating ? 'Generating...' : 'Regenerate'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={handleCopy}
                              disabled={isGenerating}
                            >
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
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={handleDelete}
                              disabled={isGenerating}
                            >
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
          ref={finalRef}
          className="textarea w-full p-3 min-h-18 h-fit resize-none overflow-hidden focus:outline-none" 
          placeholder={currentPlaceholder}
          value={textValue}
          onChange={handleChange}
          disabled={isGenerating}
        ></textarea>
    </div>
  )
})

PromptTextarea.displayName = 'PromptTextarea'

export default PromptTextarea

