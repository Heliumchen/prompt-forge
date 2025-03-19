"use client";

import LLM from "@themaximalist/llm.js";
import { AppSidebar } from "@/components/app-sidebar";

import PromptTextarea from "@/components/prompt-textarea";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Plus, Save, Play, ListTodo } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { ModelSelect } from "@/components/model-select";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

// 定义类型来区分是处理 prompt 还是 message
type ItemType = 'prompt' | 'message';

export default function Page() {
  const {
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
  const [response, setResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerate = async () => {
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

    // 组装消息，先添加prompts，再添加messages
    const messages = [
      ...currentProject.prompts.map(p => ({
        role: p.role,
        content: p.content
      })),
      ...currentProject.messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];
    console.log('messages=', messages);

    if (messages.length === 0) {
      alert("请至少添加一条提示");
      return;
    }

    setIsGenerating(true);
    try {
      const options = {
        model,
        service: provider.toLowerCase(),
        apikey: apiKey,
        dangerouslyAllowBrowser: true,
      };

      const llm = new LLM(messages, options);
      const response = await llm.send();

      console.log('response=', response);
      setResponse(response);
      
      // 添加新的 assistant 消息
      if (response && currentProject) {
        addMessage(currentProject.uid, {
          role: 'assistant',
          content: response
        });
      }
    } catch (error: any) {
      console.error("生成错误:", error);
      alert("生成错误: " + (error.message || "未知错误"));
    } finally {
      setIsGenerating(false);
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
            <h2 className="mb-4">Prompt Template</h2>

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
                        />
                    </li>
                  ))}
                </ul>
                <Button
                  className="cursor-pointer mt-4"
                  variant="outline"
                  onClick={() => handleAdd('prompt')}
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
            {
              currentProject?.variables?.length && currentProject.variables.length > 0 ? (
                <>
                  <div className="flex flex-col gap-4">
                    <h2 className="mb-4">Variables</h2>
                    <p>TODO: 识别左侧的variables，用户可以给每个variable填充值</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg mb-4">
                  <p className="text-gray-500">
                    Prompt Template 中没有 variables
                  </p>
                </div>
              )
            }            

            <div className="flex flex-col gap-4">
              <h2 className="mb-4">Response</h2>
              
              {currentProject ? (
              <>
                <ul>
                  {currentProject.messages.map((message) => (
                    <li key={message.id}>
                        <PromptTextarea
                          role={message.role}
                          content={message.content}
                          onChange={(content) =>
                            handleValueChange(content, message.id, 'message')
                          }
                          onTypeChange={(role) =>
                            handleTypeChange(role, message.id, 'message')
                          }
                          onCopy={() => handleCopy(message.id, 'message')}
                          onDelete={() => handleDelete(message.id, 'message')}
                        />
                    </li>
                  ))}
                </ul>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  onClick={() => handleAdd('message')}
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
                  className="cursor-pointer flex-1"
                  onClick={handleGenerate}
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

              <Alert>
              <ListTodo className="h-4 w-4" />
                <AlertTitle>Todo List</AlertTitle>
                <AlertDescription>
                  <ol>
                    <li>实现draggable list</li>
                    <li>实现prompt template的variables</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
