"use client"

import { useState, useEffect, useRef, forwardRef, useCallback } from 'react'
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
import { Copy, Delete, RefreshCw, ImageIcon, X } from 'lucide-react'

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
  imageUrls?: string[]
  onImageAdd?: (urls: string[]) => void
  onImageRemove?: (url: string) => void
}

// 图片上传API配置
const IMAGE_UPLOAD_API = 'https://api.imgbb.com/1/upload';
const API_KEY = '9d457023806d83246f882b06943fa1f3';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGES = 10;
const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

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
  streamingContent = '',
  imageUrls = [],
  onImageAdd,
  onImageRemove
}, ref) => {
  const [textValue, setTextValue] = useState(content)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(
    placeholder || `Enter ${role} prompt here...`
  )
  const [uploadingImages, setUploadingImages] = useState<boolean>(false)
  const [images, setImages] = useState<string[]>(imageUrls)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 当type变化时，如果没有自定义placeholder，则更新placeholder
  useEffect(() => {
    if (!placeholder) {
      setCurrentPlaceholder(`Enter ${role} prompt here...`)
    }
  }, [role, placeholder])
  
  // 当外部content变化时更新内部状态
  useEffect(() => {
    setTextValue(content)
  }, [content])
  
  // 当外部imageUrls变化时更新内部状态
  useEffect(() => {
    setImages(imageUrls)
  }, [imageUrls])
  
  // 当正在流式生成时，使用streamingContent值
  useEffect(() => {
    if (isStreaming && streamingContent !== undefined) {
      setTextValue(streamingContent)
    }
  }, [isStreaming, streamingContent])
  
  // 添加自动调整高度的功能
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const finalRef = (ref || textareaRef) as React.RefObject<HTMLTextAreaElement>
  
  // 修改 adjustHeight 函数，确保在下一帧执行
  const adjustHeight = useCallback(() => {
    const textarea = finalRef.current
    if (textarea) {
      requestAnimationFrame(() => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      })
    }
  }, [finalRef])
  
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
  }, [adjustHeight])
  
  // 初始加载和内容变化时调整高度
  useEffect(() => {
    adjustHeight()
  }, [textValue, adjustHeight])
  
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
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    // 检查所选文件数量
    if (files.length > MAX_IMAGES || images.length + files.length > MAX_IMAGES) {
      alert(`最多只能上传${MAX_IMAGES}张图片`)
      return
    }
    
    setUploadingImages(true)
    
    const uploadedUrls: string[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // 检查文件类型
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        alert(`不支持的文件格式: ${file.name}\n支持的格式: PNG, JPEG, WEBP, 非动画GIF`)
        continue
      }
      
      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件过大: ${file.name}\n最大支持20MB`)
        continue
      }
      
      try {
        const formData = new FormData()
        formData.append('key', API_KEY)
        formData.append('image', file)
        
        const response = await fetch(IMAGE_UPLOAD_API, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`上传失败: ${response.statusText}`)
        }
        
        const result = await response.json()
        console.log("image upload result", result)
        
        if (result.success) {
          uploadedUrls.push(result.data.url)
        } else {
          throw new Error('上传失败')
        }
      } catch (error) {
        console.error('图片上传错误:', error)
        alert(`上传失败: ${file.name}`)
      }
    }
    
    if (uploadedUrls.length > 0) {
      setImages(prev => [...prev, ...uploadedUrls])
      onImageAdd?.(uploadedUrls)
    }
    
    setUploadingImages(false)
    
    // 清空文件输入，以便可以再次上传相同的文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleRemoveImage = (url: string) => {
    setImages(prev => prev.filter(item => item !== url))
    onImageRemove?.(url)
  }

  return (
    <div className={`w-full group/item border rounded-md mb-2 ${isGenerating ? 'opacity-70' : ''}`}>
        <div className="flex w-full justify-between p-2">
            <Select 
              value={role.toLowerCase()}
              disabled={isGenerating}
              onValueChange={(value) => {
                const newRole = value as 'system' | 'user' | 'assistant';
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
                {role === 'assistant' && onRegenerate && (
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
                {role === 'user' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={handleUploadClick}
                          disabled={isGenerating || uploadingImages || images.length >= MAX_IMAGES}
                        >
                          <ImageIcon className={`h-4 w-4 ${uploadingImages ? 'animate-pulse' : ''}`} />
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".png,.jpg,.jpeg,.webp,.gif"
                            multiple
                            onChange={handleFileChange} 
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {uploadingImages ? 'Uploading...' : 'Upload Images'}
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
        
        {/* 图片预览区域 */}
        {images.length > 0 && (
          <div className="p-2 border-t">
            <div className="flex flex-wrap gap-2">
              {images.map((url, index) => (
                <div key={index} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={url} 
                    alt={`Uploaded ${index + 1}`} 
                    className="h-20 w-20 object-cover rounded"
                  />
                  <button 
                    className="absolute top-1 right-1 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(url)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
})

PromptTextarea.displayName = 'PromptTextarea'

export default PromptTextarea

