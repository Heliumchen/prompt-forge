"use client";

import React from "react";
import { LLMClient } from "@/lib/openrouter";
import { AppSidebar } from "@/components/app-sidebar";

import PromptTextarea from "@/components/prompt-textarea";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Plus, Play, Braces, Swords, MessageCircleOff, Settings2 } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { useTestSets } from "@/contexts/TestSetContext";
import { ModelSelect } from "@/components/model-select";
import { useState, useEffect, useCallback, useRef } from "react";
import { ProjectSelect } from "@/components/project-select";
import { toast } from "sonner"
import { IntroBlock } from "@/components/intro-block";
import { Message, Project, Prompt } from "@/lib/storage";
import { DialogModelSettings } from "@/components/dialog-model-settings";
import { VersionSelect } from "@/components/version-select";
import { VariablesSection } from "@/components/variables-section";
import { TestSetView } from "@/components/test-set-view";


// 定义类型来区分是处理 prompt 还是 message
type ItemType = 'prompt' | 'message';

export default function Page() {
  const {
    projects,
    currentProject,
    addPrompt,
    updatePrompt,
    deletePrompt,
    clearPrompts,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    updateProject,
    updateVariable,
    getDetectedVariables,
    processPromptsWithVariables,
  } = useProjects();

  const { currentTestSet } = useTestSets();

  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedEvaluationProject, setSelectedEvaluationProject] = useState<string>("");
  const [evaluatingRound, setEvaluatingRound] = useState<number>(0);
  const [evaluatingTotal, setEvaluatingTotal] = useState<number>(0);
  const [selectedEvaluationRound, setSelectedEvaluationRound] = useState<number>(5);
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState(false);
  const lastUserMessageRef = useRef<HTMLTextAreaElement>(null);

  // 初始化时从currentProject中读取模型设置
  useEffect(() => {
    if (currentProject) {
      const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
      if (currentVersion?.data.modelConfig?.model) {
        setSelectedModel(currentVersion.data.modelConfig.model);
      }
    }
  }, [currentProject]);

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    if (currentProject) {
      const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
      if (currentVersion) {
        updateProject({
          ...currentProject,
          versions: currentProject.versions.map(v => 
            v.id === currentVersion.id ? {
              ...v,
              data: {
                ...v.data,
                modelConfig: {
                  provider: "OpenRouter",
                  model: value
                }
              }
            } : v
          )
        });
      }
    }
  };

  // 处理图片添加
  const handleImageAdd = (id: number, type: ItemType, urls: string[]) => {
    if (currentProject) {
      const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
      if (currentVersion) {
        if (type === 'prompt') {
          const prompt = currentVersion.data.prompts.find(p => p.id === id);
          if (prompt) {
            const newImageUrls = [...(prompt.image_urls || []), ...urls];
            updatePrompt(currentProject.uid, id, { image_urls: newImageUrls });
          }
        } else { // type === 'message'
          const message = currentVersion.data.messages.find(m => m.id === id);
          if (message && message.role === 'user') { // Only user messages can have images added via UI
            const newImageUrls = [...(message.image_urls || []), ...urls];
            updateMessage(currentProject.uid, id, { image_urls: newImageUrls });
          }
        }
      }
    }
  };

  // 处理图片移除
  const handleImageRemove = (id: number, type: ItemType, urlToRemove: string) => {
    if (currentProject) {
      const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
      if (currentVersion) {
        if (type === 'prompt') {
          const prompt = currentVersion.data.prompts.find(p => p.id === id);
          if (prompt && prompt.image_urls) {
            const newImageUrls = prompt.image_urls.filter(url => url !== urlToRemove);
            updatePrompt(currentProject.uid, id, { image_urls: newImageUrls });
          }
        } else { // type === 'message'
          const message = currentVersion.data.messages.find(m => m.id === id);
          if (message && message.role === 'user' && message.image_urls) {
            const newImageUrls = message.image_urls.filter(url => url !== urlToRemove);
            updateMessage(currentProject.uid, id, { image_urls: newImageUrls });
          }
        }
      }
    }
  };

  // 通用的添加函数
  const handleAdd = (type: ItemType) => {
    if (currentProject) {
      if (type === 'prompt') {
        addPrompt(currentProject.uid);
      } else {
        addMessage(currentProject.uid);
      }
    }
  };

  const handleClearAll = (type: ItemType) => {
    if (currentProject) {
      if (type === 'prompt') {
        clearPrompts(currentProject.uid);
        toast.success("Prompt templates cleared");
      } else {
        clearMessages(currentProject.uid);
        toast.success("Messages cleared");
      }
    }
  };
  
  // 通用的值更新函数
  const handleValueChange = (value: string, id: number, type: ItemType) => {
    if (currentProject) {
      if (type === 'prompt') {
        updatePrompt(currentProject.uid, id, { content: value });
      } else {
        updateMessage(currentProject.uid, id, { content: value });
      }
    }
  };

  // 通用的类型更新函数
  const handleTypeChange = (
    roleType: "system" | "user" | "assistant",
    id: number,
    type: ItemType
  ) => {
    if (currentProject) {
      if (type === 'prompt') {
        updatePrompt(currentProject.uid, id, { role: roleType });
      } else {
        updateMessage(currentProject.uid, id, { role: roleType });
      }
    }
  };

  // 通用的复制函数
  const handleCopy = (id: number, type: ItemType) => {
    const currentVersion = currentProject?.versions.find(v => v.id === currentProject.currentVersion);
    if (!currentVersion) return;
    
    const items = type === 'prompt' ? currentVersion.data.prompts : currentVersion.data.messages;
    const item = items.find((item) => item.id === id);
    if (item) {
      navigator.clipboard.writeText(item.content);
      console.log(`${type} ${id} copied to clipboard`);
    }
  };

  // 通用的删除函数
  const handleDelete = (id: number, type: ItemType) => {
    if (currentProject) {
      if (type === 'prompt') {
        deletePrompt(currentProject.uid, id);
      } else {
        deleteMessage(currentProject.uid, id);
      }
      console.log(`${type} ${id} deleted`);
    }
  };

  const handleGenerate = useCallback(async (messageId?: number) => {
    if (!currentProject) {
      toast.error("请选择一个项目");
      return;
    }

    if (!selectedModel) {
      toast.error("请选择一个模型");
      return;
    }

    // 从localStorage获取OpenRouter API key
    const apiKeysStr = localStorage.getItem('apiKeys');
    if (!apiKeysStr) {
      toast.error('请在设置中配置OpenRouter API密钥');
      return;
    }
    const apiKeys = JSON.parse(apiKeysStr);
    const apiKey = apiKeys.OpenRouter;
    
    if (!apiKey) {
      toast.error('请在设置中配置OpenRouter API密钥');
      return;
    }

    // 获取当前版本数据
    const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
    if (!currentVersion) {
      toast.error("当前版本不存在");
      return;
    }

    // 如果指定了messageId，则只使用该message之前的所有消息
    let messages;
    
    if (messageId !== undefined) {
      // 获取当前project中所有messages，按显示顺序排列
      const allMessages = [...currentVersion.data.messages];
      
      // 找到当前messageId在messages数组中的索引
      const messageIndex = allMessages.findIndex(m => m.id === messageId);
      
      if (messageIndex === -1) {
        console.error(`Message with id ${messageId} not found`);
        return;
      }
      
      // 组装消息，先添加所有prompts（处理变量），再添加当前message之前的messages
      const processedPrompts = processPromptsWithVariables(currentProject.uid);
      messages = [
        ...processedPrompts.map(p => ({
          role: p.role,
          content: p.content,
          image_urls: p.image_urls
        })),
        ...allMessages.slice(0, messageIndex).map(m => ({
          role: m.role,
          content: m.content,
          image_urls: m.image_urls || []
        }))
      ];
      
      console.log(`Regenerating message ${messageId}, using ${messages.length} previous messages`);
    } else {
      // 如果没有指定messageId，使用所有消息（处理变量）
      const processedPrompts = processPromptsWithVariables(currentProject.uid);
      messages = [
        ...processedPrompts.map(p => ({
          role: p.role,
          content: p.content,
          image_urls: p.image_urls
        })),
        ...currentVersion.data.messages.map(m => ({
          role: m.role,
          content: m.content,
          image_urls: m.image_urls || []
        }))
      ];
    }

    if (messages.length === 0) {
      toast.error("请至少添加一条提示");
      return;
    }

    setIsGenerating(true);
    setGeneratingMessageId(messageId || null);
    
    try {
      const client = new LLMClient(apiKey);
      
      let generatedText = '';
      let newMessageId: number | undefined;
      
      // 如果是重新生成，使用现有ID，否则创建新消息
      if (messageId !== undefined) {
        newMessageId = messageId;
        // 先清空现有消息内容
        updateMessage(currentProject.uid, messageId, { content: '' });
      } else {
        // 创建新的assistant消息
        newMessageId = addMessage(currentProject.uid, {
          role: 'assistant',
          content: ''
        });
      }

      setStreamingMessageId(newMessageId);

      const options = {
        model: selectedModel,
        stream: true,
        temperature: currentVersion.data.modelConfig?.temperature || 1.0,
        max_tokens: currentVersion.data.modelConfig?.max_tokens || 1024,
        top_p: currentVersion.data.modelConfig?.top_p,
        frequency_penalty: currentVersion.data.modelConfig?.frequency_penalty,
        presence_penalty: currentVersion.data.modelConfig?.presence_penalty,
      };

      const stream = await client.chat(messages, options);
      
      // 处理流式输出
      for await (const chunk of stream) {
        generatedText += chunk;
        // 更新本地状态以驱动UI更新
        setStreamingContent(generatedText);
        
        // 同时更新项目数据
        if (newMessageId !== undefined) {
          updateMessage(currentProject.uid, newMessageId, {
            content: generatedText
          });
        }
      }
      
      // 确保最终内容被设置
      setStreamingContent(generatedText);

      // 在完全处理完后再重置流式状态
      setTimeout(() => {
        setStreamingMessageId(null);
        setStreamingContent('');
      }, 100);

      // 只有在不是重新生成的情况下才添加新的用户消息
      if (messageId === undefined) {
        addMessage(currentProject.uid, {
          role: 'user',
          content: ''
        });
        // 使用 setTimeout 确保 DOM 已更新
        setTimeout(() => {
          lastUserMessageRef.current?.focus();
        }, 0);
      }
    } catch (error: Error | unknown) {
      console.error("生成错误:", error);
      toast.error("生成错误: " + ((error instanceof Error) ? error.message : "未知错误"));
    } finally {
      setIsGenerating(false);
      setGeneratingMessageId(null);
    }
  }, [currentProject, selectedModel, addMessage, updateMessage, setStreamingContent, setStreamingMessageId, setIsGenerating, setGeneratingMessageId, processPromptsWithVariables]);

  const handleEvaluate = async (rounds: number = 5) => {
    if (!currentProject) {
      toast.error("请选择一个主项目");
      return;
    }

    if (!selectedEvaluationProject) {
      toast.error("请选择一个评估项目");
      return;
    }

    if (!selectedModel) {
      toast.error("请选择一个模型");
      return;
    }

    // 从localStorage获取OpenRouter API key
    const apiKeysStr = localStorage.getItem('apiKeys');
    if (!apiKeysStr) {
      toast.error('请在设置中配置OpenRouter API密钥');
      return;
    }
    const apiKeys = JSON.parse(apiKeysStr);
    const apiKey = apiKeys.OpenRouter;
    
    if (!apiKey) {
      toast.error('请在设置中配置OpenRouter API密钥');
      return;
    }

    // 获取评估项目
    const evaluationProject = projects.find((p: Project) => p.uid === selectedEvaluationProject);
    
    if (!evaluationProject) {
      toast.error("评估项目不存在");
      return;
    }

    // 获取评估项目当前版本
    const evaluationVersion = evaluationProject.versions.find(v => v.id === evaluationProject.currentVersion);
    if (!evaluationVersion) {
      toast.error("评估项目版本不存在");
      return;
    }

    setIsEvaluating(true);
    setEvaluatingTotal(rounds);

    try {
      // 创建一个本地变量来跟踪所有生成的消息
      const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
      if (!currentVersion) {
        toast.error("当前版本不存在");
        return;
      }
      
      const localMessages = [...currentVersion.data.messages];
      
      // 模拟对话轮次
      for (let i = 0; i < rounds; i++) {
        setEvaluatingRound(i + 1);
        console.log(`开始评估轮次 ${i + 1}/${rounds}`);
        
        try {
          // 使用本地跟踪的消息（处理变量）
          const processedPrompts = processPromptsWithVariables(currentProject.uid);
          const currentProjectMessages = [
            ...processedPrompts.map((p: Prompt) => ({
              role: p.role,
              content: p.content
            })),
            ...localMessages.map((m: Message) => ({
              role: m.role,
              content: m.content,
              image_urls: m.image_urls
            }))
          ];
          
          // 生成assistant回复（流式）
          const client = new LLMClient(apiKey);
          
          // 创建新的assistant消息
          const assistantMessageId = addMessage(currentProject.uid, {
            role: 'assistant',
            content: ''
          });
          
          // 设置流式输出的目标消息
          setStreamingMessageId(assistantMessageId);
          
          let assistantContent = '';
          const assistantOptions = {
            model: selectedModel,
            stream: true,
            temperature: currentProject.versions.find(v => v.id === currentProject.currentVersion)?.data.modelConfig?.temperature || 1.0,
            max_tokens: currentProject.versions.find(v => v.id === currentProject.currentVersion)?.data.modelConfig?.max_tokens || 1024,
          };
          
          const assistantStream = await client.chat(currentProjectMessages, assistantOptions);
          
          // 处理流式输出
          for await (const chunk of assistantStream) {
            assistantContent += chunk;
            // 更新本地状态以驱动UI更新
            setStreamingContent(assistantContent);
            
            // 同时更新项目数据
            updateMessage(currentProject.uid, assistantMessageId, {
              content: assistantContent
            });
          }
          
          // 重置流式状态但给用户一点时间查看结果
          await new Promise(resolve => setTimeout(resolve, 500));
          setStreamingMessageId(null);
          setStreamingContent('');
          
          // 添加新生成的消息到本地消息列表
          const assistantMessage = {
            id: Date.now(), // 临时ID
            role: "assistant" as const,
            content: assistantContent
          };
          localMessages.push(assistantMessage);
          
          // 构建反转消息，使用本地消息列表
          const reversedMessages = [
            // 首先添加评估项目的system prompt
            ...evaluationVersion.data.prompts.map((p: Prompt) => ({
              role: p.role,
              content: p.content
            })),
            // 添加本地消息历史，但角色反转
            ...localMessages.map((m: Message) => {
              const reversedRole = m.role === 'assistant' ? 'user' : 
                                  (m.role === 'user' ? 'assistant' : m.role);
              return {
                role: reversedRole as "system" | "user" | "assistant",
                content: m.content,
                image_urls: m.image_urls
              };
            })
            // 注意：不需要再添加assistantContent，因为它已经包含在localMessages中
          ];
          
          console.log('Round ' + (i+1) + ' reversedMessages:', reversedMessages);
          
          // 生成user回复（流式）
          const userOptions = {
            model: selectedModel,
            stream: true,
            temperature: currentProject.versions.find(v => v.id === currentProject.currentVersion)?.data.modelConfig?.temperature || 1.0,
            max_tokens: currentProject.versions.find(v => v.id === currentProject.currentVersion)?.data.modelConfig?.max_tokens || 1024,
          };
          
          // 创建新的user消息
          const userMessageId = addMessage(currentProject.uid, {
            role: 'user',
            content: ''
          });
          
          // 设置流式输出的目标消息
          setStreamingMessageId(userMessageId);
          
          let userContent = '';
          const userStream = await client.chat(reversedMessages, userOptions);
          
          // 处理流式输出
          for await (const chunk of userStream) {
            userContent += chunk;
            // 更新本地状态以驱动UI更新
            setStreamingContent(userContent);
            
            // 同时更新项目数据
            updateMessage(currentProject.uid, userMessageId, {
              content: userContent
            });
          }
          
          // 重置流式状态但给用户一点时间查看结果
          await new Promise(resolve => setTimeout(resolve, 500));
          setStreamingMessageId(null);
          setStreamingContent('');
          
          // 添加新生成的user消息到本地消息列表
          const userMessage = {
            id: Date.now() + 1, // 临时ID
            role: "user" as const,
            content: userContent
          };
          localMessages.push(userMessage);
          
        } catch (roundError: Error | unknown) {
          console.error(`轮次 ${i+1} 评估错误:`, roundError);
          // 显示错误但继续下一轮
          toast.error(`轮次 ${i+1} 评估错误: ${(roundError instanceof Error) ? roundError.message : "未知错误"}`);
          
          // 重置流式状态
          setStreamingMessageId(null);
          setStreamingContent('');
          
          // 继续下一轮
          continue;
        }
      }
      
      toast.success(`评估完成，共进行了 ${rounds} 轮对话模拟`);
    } catch (error: Error | unknown) {
      console.error("评估错误:", error);
      toast.error("评估错误: " + ((error instanceof Error) ? error.message : "未知错误"));
    } finally {
      setIsEvaluating(false);
      setEvaluatingRound(0);
      setEvaluatingTotal(0);
      setStreamingMessageId(null);
      setStreamingContent('');
    }
  };

  // 添加键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下 Enter 键
      if (e.key === 'Enter') {
        // 检查是否按下 Command (Mac) 或 Control (Windows) 键
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifierKey = isMac ? e.metaKey : e.ctrlKey;
        
        if (modifierKey && !isGenerating) {
          e.preventDefault(); // 阻止默认行为
          handleGenerate();
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGenerating, handleGenerate]); // 添加 handleGenerate 到依赖数组

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {currentProject && (
          <DialogModelSettings
            open={isModelSettingsOpen}
            onOpenChange={setIsModelSettingsOpen}
            modelConfig={currentProject.versions.find(v => v.id === currentProject.currentVersion)?.data.modelConfig || { provider: "", model: "" }}
            onSave={(config) => {
              if (currentProject) {
                const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
                if (currentVersion) {
                  updateProject({
                    ...currentProject,
                    versions: currentProject.versions.map(v => 
                      v.id === currentVersion.id ? {
                        ...v,
                        data: {
                          ...v.data,
                          modelConfig: config
                        }
                      } : v
                    )
                  });
                }
              }
            }}
          />
        )}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b justify-between">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage>
                    {currentTestSet
                      ? currentTestSet.name
                      : currentProject
                      ? currentProject.name
                      : "No Project Selected"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {currentProject && !currentTestSet ? (
            <div className="flex items-center gap-2 px-4">
              <VersionSelect project={currentProject} />
            </div>
          ) : null}
        </header>
        {currentTestSet ? (
          <TestSetView testSetUid={currentTestSet.uid} />
        ) : (
          <div className="flex pl-2">
          <div className="flex flex-col rounded-xl w-1/2 p-4">
            <h2 className="mb-4 font-semibold">Prompt Template</h2>

            {currentProject ? (
              <>
                <ul>
                  {(() => {
                    const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
                    if (!currentVersion) return null;
                    return currentVersion.data.prompts.map((prompt) => (
                      <li key={prompt.id}>
                        <PromptTextarea
                          role={prompt.role}
                          content={prompt.content}
                          imageUrls={prompt.image_urls || []}
                          onChange={(content) =>
                            handleValueChange(content, prompt.id, 'prompt')
                          }
                          onTypeChange={(type) =>
                            handleTypeChange(type, prompt.id, 'prompt')
                          }
                          onCopy={() => handleCopy(prompt.id, 'prompt')}
                          onDelete={() => handleDelete(prompt.id, 'prompt')}
                          onImageAdd={(urls) => handleImageAdd(prompt.id, 'prompt', urls)}
                          onImageRemove={(url) => handleImageRemove(prompt.id, 'prompt', url)}
                          isGenerating={isGenerating}
                        />
                      </li>
                    ));
                  })()}
                </ul>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => handleAdd('prompt')}
                  disabled={isGenerating}
                >
                  <Plus />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
                <p className="text-gray-500 mb-4">
                  请从侧边栏选择一个项目，或创建新项目
                </p>
              </div>
            )}
          </div>
          {/* 右侧 Context+Response 区域 */}
          <div className="flex-1 flex-col rounded-xl p-4">
          {currentProject ? (
              <>
            <h2 className="mb-4 font-semibold">Generations</h2>
            <div className="flex flex-col gap-4">
              {(() => {
                try {
                  const currentVersion = currentProject.versions.find(v => v.id === currentProject.currentVersion);
                  if (!currentVersion) return null;
                  
                  // Get detected variables and current variable values
                  const detectedVariables = getDetectedVariables(currentProject.uid);
                  const currentVariables = currentVersion.data.variables || [];
                  
                  // Show Variables Section if there are detected variables
                  if (detectedVariables.length > 0) {
                    return (
                      <VariablesSection
                        variables={currentVariables}
                        onVariableUpdate={(name: string, value: string) => {
                          try {
                            updateVariable(currentProject.uid, name, value);
                          } catch (error) {
                            console.error("Error updating variable:", error);
                            toast.error("Failed to update variable");
                          }
                        }}
                        isGenerating={isGenerating}
                        defaultCollapsed={detectedVariables.length > 3}
                      />
                    );
                  } else {
                    return (
                      <Alert className="border-dashed mb-6">
                        <Braces className="h-4 w-4" />
                        <AlertTitle>Variables</AlertTitle>
                        <AlertDescription>
                          You can create a variable in prompt template like this: {'{{variable_name}}'}
                        </AlertDescription>
                      </Alert>
                    );
                  }
                } catch (error) {
                  console.error("Error rendering Variables Section:", error);
                  return (
                    <Alert className="border-dashed mb-6" variant="destructive">
                      <Braces className="h-4 w-4" />
                      <AlertTitle>Variables Error</AlertTitle>
                      <AlertDescription>
                        Failed to load variables. Please try refreshing the page.
                      </AlertDescription>
                    </Alert>
                  );
                }
              })()}          
              
              
                <ul>
                  {currentProject.versions.find(v => v.id === currentProject.currentVersion)?.data.messages.map((message, index, array) => (
                    <li key={message.id}>
                      <PromptTextarea
                        role={message.role}
                        content={message.content}
                        isStreaming={streamingMessageId === message.id}
                        streamingContent={streamingMessageId === message.id ? streamingContent : undefined}
                        onChange={(content) =>
                          handleValueChange(content, message.id, 'message')
                        }
                        onTypeChange={(role) =>
                          handleTypeChange(role, message.id, 'message')
                        }
                        onCopy={() => handleCopy(message.id, 'message')}
                        onDelete={() => handleDelete(message.id, 'message')}
                        onRegenerate={message.role === 'assistant' ? () => handleGenerate(message.id) : undefined}
                        imageUrls={message.image_urls || []}
                        onImageAdd={message.role === 'user' ? (urls) => handleImageAdd(message.id, 'message', urls) : undefined}
                        onImageRemove={message.role === 'user' ? (url) => handleImageRemove(message.id, 'message', url) : undefined}
                        isGenerating={isGenerating && (generatingMessageId === message.id || generatingMessageId === null)}
                        ref={message.role === 'user' && index === array.length - 1 ? lastUserMessageRef : undefined}
                      />
                    </li>
                  ))}
                </ul>
                <div className="flex gap-4">                
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleAdd('message')}
                    disabled={isGenerating}
                  >
                    <Plus /> Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleClearAll('message')}
                    disabled={isGenerating}
                  >
                    <MessageCircleOff />
                  </Button>
                </div>
                

              
              <div className="flex gap-4">
                <ModelSelect 
                  value={selectedModel}
                  onChange={handleModelChange}
                />
                <Button
                    variant="outline"
                    onClick={() => setIsModelSettingsOpen(true)}
                    disabled={isGenerating}
                    className="w-[70px]"
                  >
                  <Settings2/>
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <div className="animate-spin mr-2">⌛</div>
                  ) : (
                    <Play className="mr-2" />
                  )}
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>

              <Separator className="my-4" />
              
              <h2 className="mb-2 font-semibold">Evaluation (LLM-as-a-User)</h2>
              <div className="flex gap-4">
                <ProjectSelect 
                  value={selectedEvaluationProject}
                  onChange={(value) => setSelectedEvaluationProject(value)}
                />
                <Select defaultValue="5" onValueChange={(value) => setSelectedEvaluationRound(parseInt(value))}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="Rounds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="flex-1"
                  onClick={() => handleEvaluate(selectedEvaluationRound)}
                  disabled={isEvaluating}
                >
                  {isEvaluating ? (
                    <>
                      <div className="animate-spin mr-2">⌛</div>
                      {evaluatingRound}/{evaluatingTotal}
                    </>
                  ) : (
                    <Swords className="mr-2" />
                  )}
                  {isEvaluating ? "Evaluating..." : "Evaluate"}
                </Button>
              </div>              
            </div>
            </>
              ) : (
                <IntroBlock />
              )}
          </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
