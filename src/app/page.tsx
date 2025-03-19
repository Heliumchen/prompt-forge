"use client";

import LLM from "@themaximalist/llm.js";
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
  SelectGroup,
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
import { Plus, Save, Play, ListTodo, Braces, Swords } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { ModelSelect } from "@/components/model-select";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { ProjectSelect } from "@/components/project-select";

// 定义类型来区分是处理 prompt 还是 message
type ItemType = 'prompt' | 'message';

export default function Page() {
  const {
    projects,
    currentProject,
    addPrompt,
    updatePrompt,
    deletePrompt,
    addMessage,
    updateMessage,
    deleteMessage,
    updateProject,
  } = useProjects();

  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedEvaluationProject, setSelectedEvaluationProject] = useState<string>("");

  // 初始化时从currentProject中读取模型设置
  useEffect(() => {
    if (currentProject?.modelConfig) {
      setSelectedModel(`${currentProject.modelConfig.provider}/${currentProject.modelConfig.model}`);
    }
  }, [currentProject]);

  const handleModelChange = (value: string, provider: string) => {
    setSelectedModel(value);
    if (currentProject) {
      const [modelProvider, modelValue] = value.split("/");
      updateProject({
        ...currentProject,
        modelConfig: {
          provider: modelProvider,
          model: modelValue
        }
      });
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
    const items = type === 'prompt' ? currentProject?.prompts : currentProject?.messages;
    const item = items?.find((item) => item.id === id);
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

  const handleGenerate = async (messageId?: number) => {
    if (!currentProject) {
      alert("请选择一个项目");
      return;
    }

    if (!selectedModel) {
      alert("请选择一个模型");
      return;
    }

    // 从selectedModel中解析provider和model
    const [provider, model] = selectedModel.split("/");
    if (!provider || !model) {
      alert("模型格式错误");
      return;
    }

    // 从localStorage获取API key
    const apiKeysStr = localStorage.getItem('apiKeys');
    if (!apiKeysStr) {
      alert(`请在设置中配置 ${provider} 的API密钥`);
      return;
    }
    const apiKeys = JSON.parse(apiKeysStr);
    const apiKey = apiKeys[provider];
    if (!apiKey) {
      alert(`请在设置中配置 ${provider} 的API密钥`);
      return;
    }

    // 如果指定了messageId，则只使用该message之前的所有消息
    let messages;
    
    if (messageId !== undefined) {
      // 获取当前project中所有messages，按显示顺序排列
      const allMessages = [...currentProject.messages];
      
      // 找到当前messageId在messages数组中的索引
      const messageIndex = allMessages.findIndex(m => m.id === messageId);
      
      if (messageIndex === -1) {
        console.error(`Message with id ${messageId} not found`);
        return;
      }
      
      // 组装消息，先添加所有prompts，再添加当前message之前的messages
      messages = [
        ...currentProject.prompts.map(p => ({
          role: p.role,
          content: p.content
        })),
        ...allMessages.slice(0, messageIndex).map(m => ({
          role: m.role,
          content: m.content
        }))
      ];
      
      console.log(`Regenerating message ${messageId}, using ${messages.length} previous messages`);
    } else {
      // 如果没有指定messageId，使用所有消息
      messages = [
        ...currentProject.prompts.map(p => ({
          role: p.role,
          content: p.content
        })),
        ...currentProject.messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];
    }

    if (messages.length === 0) {
      alert("请至少添加一条提示");
      return;
    }

    setIsGenerating(true);
    setGeneratingMessageId(messageId || null);
    
    try {
      const options = {
        model,
        service: provider.toLowerCase(),
        apikey: apiKey,
        dangerouslyAllowBrowser: true,
        stream: true, // 启用流式输出
      };

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

      const llm = new LLM(messages, options);
      const stream = await llm.send();
      
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
      // 可以添加一个小延迟确保状态已更新
      setTimeout(() => {
        setStreamingMessageId(null);
        setStreamingContent('');
      }, 100);
    } catch (error: any) {
      console.error("生成错误:", error);
      alert("生成错误: " + (error.message || "未知错误"));
    } finally {
      setIsGenerating(false);
      setGeneratingMessageId(null);
    }
  };

  const handleEvaluate = async (rounds: number = 5) => {
    if (!currentProject) {
      alert("请选择一个主项目");
      return;
    }

    if (!selectedEvaluationProject) {
      alert("请选择一个评估项目");
      return;
    }

    if (!selectedModel) {
      alert("请选择一个模型");
      return;
    }

    // 从selectedModel中解析provider和model
    const [provider, model] = selectedModel.split("/");
    if (!provider || !model) {
      alert("模型格式错误");
      return;
    }

    // 从localStorage获取API key
    const apiKeysStr = localStorage.getItem('apiKeys');
    if (!apiKeysStr) {
      alert(`请在设置中配置 ${provider} 的API密钥`);
      return;
    }
    const apiKeys = JSON.parse(apiKeysStr);
    const apiKey = apiKeys[provider];
    if (!apiKey) {
      alert(`请在设置中配置 ${provider} 的API密钥`);
      return;
    }

    // 获取评估项目
    const evaluationProject = projects.find((p: any) => p.uid === selectedEvaluationProject);
    
    if (!evaluationProject) {
      alert("评估项目不存在");
      return;
    }

    setIsEvaluating(true);

    try {
      // 模拟对话轮次
      for (let i = 0; i < rounds; i++) {
        console.log(`开始评估轮次 ${i + 1}/${rounds}`);
        
        // 第一步：使用当前项目生成assistant回复
        const currentProjectMessages = [
          ...currentProject.prompts.map((p: any) => ({
            role: p.role,
            content: p.content
          })),
          ...currentProject.messages.map((m: any) => ({
            role: m.role,
            content: m.content
          }))
        ];
        
        // 生成assistant回复
        const assistantOptions = {
          model,
          service: provider.toLowerCase(),
          apikey: apiKey,
          dangerouslyAllowBrowser: true,
        };
        
        let assistantContent = '';
        const assistantLLM = new LLM(currentProjectMessages, assistantOptions);
        assistantContent = await assistantLLM.send();
        
        // 添加assistant回复到当前项目
        const assistantMessageId = addMessage(currentProject.uid, {
          role: 'assistant',
          content: assistantContent
        });
        
        console.log(`生成了assistant回复: ${assistantContent.substring(0, 50)}...`);
        
        // 第二步：使用评估项目的提示词，将角色反转后生成user回复
        // 创建反转角色的消息列表
        const reversedMessages = [
          // 首先添加评估项目的system prompt
          ...evaluationProject.prompts.map((p: any) => ({
            role: p.role,
            content: p.content
          })),
          // 添加之前的对话历史，但角色反转
          ...currentProject.messages.map((m: any) => ({
            // 角色反转：assistant变为user，user变为assistant
            role: m.role === 'assistant' ? 'user' : (m.role === 'user' ? 'assistant' : m.role),
            content: m.content
          })),
          // 添加刚生成的assistant回复，但作为user输入
          {
            role: 'user',
            content: assistantContent
          }
        ];

        console.log('reversedMessages', reversedMessages);
        
        // 生成user回复
        const userOptions = {
          model,
          service: provider.toLowerCase(),
          apikey: apiKey,
          dangerouslyAllowBrowser: true,
        };
        
        let userContent = '';
        const userLLM = new LLM(reversedMessages, userOptions);
        userContent = await userLLM.send();
        
        // 添加user回复到当前项目
        const userMessageId = addMessage(currentProject.uid, {
          role: 'user',
          content: userContent
        });
        
        console.log(`生成了user回复: ${userContent.substring(0, 50)}...`);
        
        // 等待一小段时间，避免API调用过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      alert(`评估完成，共进行了 ${rounds} 轮对话模拟`);
    } catch (error: any) {
      console.error("评估错误:", error);
      alert("评估错误: " + (error.message || "未知错误"));
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
                    {currentProject
                      ? currentProject.name
                      : "No Project Selected"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 px-4">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a version" defaultValue="3" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="3">v3 (Current)</SelectItem>
                  <SelectItem value="2">v2 (03-12 20:00)</SelectItem>
                  <SelectItem value="1">v1 (03-11 11:00)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary">
                    <Save />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save new version</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>
        <div className="flex gap-4 p-4 pt-0">
          <div className="flex flex-col rounded-xl w-1/2 p-4">
            {/* 左侧 Prompt 编辑区 */}
            <h2 className="mb-4 font-semibold">Prompt Template</h2>

            {currentProject ? (
              <>
                <ul>
                  {currentProject.prompts.map((prompt) => (
                    <li key={prompt.id}>
                        <PromptTextarea
                          role={prompt.role}
                          content={prompt.content}
                          onChange={(content) =>
                            handleValueChange(content, prompt.id, 'prompt')
                          }
                          onTypeChange={(type) =>
                            handleTypeChange(type, prompt.id, 'prompt')
                          }
                          onCopy={() => handleCopy(prompt.id, 'prompt')}
                          onDelete={() => handleDelete(prompt.id, 'prompt')}
                          isGenerating={isGenerating}
                        />
                    </li>
                  ))}
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
            <h2 className="mb-4 font-semibold">Generations</h2>
            <div className="flex flex-col gap-4">
              {
              currentProject?.variables?.length && currentProject.variables.length > 0 ? (
                <>
                  <div className="flex flex-col gap-4">
                    <h2 className="mb-4 font-semibold">Variables</h2>
                    <p>TODO: 识别左侧的variables，用户可以给每个variable填充值</p>
                  </div>
                </>
              ) : (
                <Alert>
              <Braces className="h-4 w-4" />
                <AlertTitle>Variables</AlertTitle>
                <AlertDescription>
                You can create a variable in prompt template like this: {'{{variable_name}}'}
                </AlertDescription>
              </Alert>
              )
            }          
              
              {currentProject ? (
              <>
                <ul>
                  {currentProject.messages.map((message) => (
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
                          isGenerating={isGenerating && (generatingMessageId === message.id || generatingMessageId === null)}
                        />
                    </li>
                  ))}
                </ul>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  onClick={() => handleAdd('message')}
                  disabled={isGenerating}
                >
                  <Plus /> Add
                </Button>
              </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
                  <p className="text-gray-500 mb-4">
                    请从侧边栏选择一个项目，或创建新项目
                  </p>
                </div>
              )}
              
              <div className="flex gap-4">
                <ModelSelect 
                  value={selectedModel}
                  onChange={handleModelChange}
                />
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
              
              <h2 className="mb-4 font-semibold">Evaluation (LLM-as-a-User)</h2>
              <div className="flex gap-4">
                <ProjectSelect 
                  value={selectedEvaluationProject}
                  onChange={(value) => setSelectedEvaluationProject(value)}
                />
                <Button
                  className="flex-1"
                  onClick={() => handleEvaluate(1)}
                  disabled={isEvaluating}
                >
                  {isEvaluating ? (
                    <div className="animate-spin mr-2">⌛</div>
                  ) : (
                    <Swords className="mr-2" />
                  )}
                  {isEvaluating ? "Evaluating..." : "Evaluate"}
                </Button>
              </div>              
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
