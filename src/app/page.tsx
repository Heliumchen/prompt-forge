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
import { Plus, Save, Play, Braces, Swords, MessageCircleOff } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { ModelSelect } from "@/components/model-select";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { ProjectSelect } from "@/components/project-select";
import { toast } from "sonner"
import { IntroBlock } from "@/components/intro-block";
import { Message, Project, Prompt } from "@/lib/storage";


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
  } = useProjects();

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

  // 初始化时从currentProject中读取模型设置
  useEffect(() => {
    if (currentProject?.modelConfig) {
      setSelectedModel(`${currentProject.modelConfig.provider}/${currentProject.modelConfig.model}`);
    }
  }, [currentProject]);

  const handleModelChange = (value: string) => {
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

  const handleClearAll = (type: ItemType) => {
    if (currentProject) {
      if (type === 'prompt') {
        clearPrompts(currentProject.uid);
        toast.success("Prompt templates clear");
      } else {
        clearMessages(currentProject.uid);
        toast.success("Messages clear");
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
      toast.error("请选择一个项目");
      return;
    }

    if (!selectedModel) {
      toast.error("请选择一个模型");
      return;
    }

    // 从selectedModel中解析provider和model
    const [provider, model] = selectedModel.split("/");
    if (!provider || !model) {
      toast.error("模型格式错误");
      return;
    }

    // 从localStorage获取API key
    const apiKeysStr = localStorage.getItem('apiKeys');
    if (!apiKeysStr) {
      toast.error(`请在设置中配置 ${provider} 的API密钥`);
      return;
    }
    const apiKeys = JSON.parse(apiKeysStr);
    const apiKey = apiKeys[provider];
    if (!apiKey) {
      toast.error(`请在设置中配置 ${provider} 的API密钥`);
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
      toast.error("请至少添加一条提示");
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

      // 添加一个用户消息，方便用户接话
      addMessage(currentProject.uid, {
        role: 'user',
        content: ''
      });
    } catch (error: Error | unknown) {
      console.error("生成错误:", error);
      toast.error("生成错误: " + ((error instanceof Error) ? error.message : "未知错误"));
    } finally {
      setIsGenerating(false);
      setGeneratingMessageId(null);
    }
  };

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

    // 从selectedModel中解析provider和model
    const [provider, model] = selectedModel.split("/");
    if (!provider || !model) {
      toast.error("模型格式错误");
      return;
    }

    // 从localStorage获取API key
    const apiKeysStr = localStorage.getItem('apiKeys');
    if (!apiKeysStr) {
      toast.error(`请在设置中配置 ${provider} 的API密钥`);
      return;
    }
    const apiKeys = JSON.parse(apiKeysStr);
    const apiKey = apiKeys[provider];
    if (!apiKey) {
      toast.error(`请在设置中配置 ${provider} 的API密钥`);
      return;
    }

    // 获取评估项目
    const evaluationProject = projects.find((p: Project) => p.uid === selectedEvaluationProject);
    
    if (!evaluationProject) {
      toast.error("评估项目不存在");
      return;
    }

    setIsEvaluating(true);
    setEvaluatingTotal(rounds);

    try {
      // 创建一个本地变量来跟踪所有生成的消息
      const localMessages = [...currentProject.messages];
      
      // 模拟对话轮次
      for (let i = 0; i < rounds; i++) {
        setEvaluatingRound(i + 1);
        console.log(`开始评估轮次 ${i + 1}/${rounds}`);
        
        try {
          // 使用本地跟踪的消息
          const currentProjectMessages = [
            ...currentProject.prompts.map((p: Prompt) => ({
              role: p.role,
              content: p.content
            })),
            ...localMessages.map((m: Message) => ({
              role: m.role,
              content: m.content
            }))
          ];
          
          // 生成assistant回复（流式）
          const assistantOptions = {
            model,
            service: provider.toLowerCase(),
            apikey: apiKey,
            dangerouslyAllowBrowser: true,
            stream: true,
          };
          
          // 创建新的assistant消息
          const assistantMessageId = addMessage(currentProject.uid, {
            role: 'assistant',
            content: ''
          });
          
          // 设置流式输出的目标消息
          setStreamingMessageId(assistantMessageId);
          
          let assistantContent = '';
          const assistantLLM = new LLM(currentProjectMessages, assistantOptions);
          const assistantStream = await assistantLLM.send();
          
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
            ...evaluationProject.prompts.map((p: Prompt) => ({
              role: p.role,
              content: p.content
            })),
            // 添加本地消息历史，但角色反转
            ...localMessages.map((m: Message) => {
              const reversedRole = m.role === 'assistant' ? 'user' : 
                                  (m.role === 'user' ? 'assistant' : m.role);
              return {
                role: reversedRole as "system" | "user" | "assistant",
                content: m.content
              };
            })
            // 注意：不需要再添加assistantContent，因为它已经包含在localMessages中
          ];
          
          console.log('Round ' + (i+1) + ' reversedMessages:', reversedMessages);
          
          // 生成user回复（流式）
          const userOptions = {
            model,
            service: provider.toLowerCase(),
            apikey: apiKey,
            dangerouslyAllowBrowser: true,
            stream: true,
          };
          
          // 创建新的user消息
          const userMessageId = addMessage(currentProject.uid, {
            role: 'user',
            content: ''
          });
          
          // 设置流式输出的目标消息
          setStreamingMessageId(userMessageId);
          
          let userContent = '';
          const userLLM = new LLM(reversedMessages, userOptions);
          const userStream = await userLLM.send();
          
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
          {currentProject ? (
            <div className="flex items-center gap-2 px-4">
              <Select defaultValue="1">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a version"  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="1">v1</SelectItem>
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
                  <TooltipContent>Save new version (Coming soon)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
          </div>
          ) : null}
        </header>
        <div className="flex pl-2">
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
          {currentProject ? (
              <>
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
              <Alert className="border-dashed">
                <Braces className="h-4 w-4" />
                <AlertTitle>Variables </AlertTitle>
                <AlertDescription>
                (Coming soon) You can create a variable in prompt template like this: {'{{variable_name}}'}
                </AlertDescription>
              </Alert>
              )
            }          
              
              
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
                  <SelectTrigger className="w-[80px]">
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
      </SidebarInset>
    </SidebarProvider>
  );
}
