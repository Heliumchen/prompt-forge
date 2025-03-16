"use client";

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
import { Plus, Save, Play } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { ModelSelect } from "@/components/model-select";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";

export default function Page() {
  const {
    currentProject,
    addPrompt,
    updatePrompt,
    deletePrompt,
    restorePrompt,
  } = useProjects();

  const handleValueChange = (value: string, id: number) => {
    if (currentProject) {
      updatePrompt(currentProject.uid, id, { value });
    }
  };

  const handleTypeChange = (
    type: "System" | "User" | "Assistant",
    id: number
  ) => {
    if (currentProject) {
      updatePrompt(currentProject.uid, id, { type });
    }
  };

  const handleCopy = (id: number) => {
    const prompt = currentProject?.prompts.find((p) => p.id === id);
    if (prompt) {
      navigator.clipboard.writeText(prompt.value);
      console.log(`Prompt ${id} copied to clipboard`);
    }
  };

  const handleDelete = (id: number) => {
    if (currentProject) {
      deletePrompt(currentProject.uid, id);
      console.log(`Prompt ${id} deleted`);
    }
  };

  const handleRestore = (id: number) => {
    if (currentProject) {
      restorePrompt(currentProject.uid, id);
    }
  };

  const handleAddPrompt = () => {
    if (currentProject) {
      addPrompt(currentProject.uid);
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
                      {prompt.show ? (
                        <PromptTextarea
                          type={prompt.type}
                          value={prompt.value}
                          onChange={(value) =>
                            handleValueChange(value, prompt.id)
                          }
                          onTypeChange={(type) =>
                            handleTypeChange(type, prompt.id)
                          }
                          onCopy={() => handleCopy(prompt.id)}
                          onDelete={() => handleDelete(prompt.id)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg mb-2">
                          <p className="text-gray-500 mb-2">提示已被删除</p>
                          <Button onClick={() => handleRestore(prompt.id)}>
                            恢复提示
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <Button
                  className="cursor-pointer mt-4"
                  variant="outline"
                  onClick={handleAddPrompt}
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
            <div className="flex flex-col gap-4">
              <h2 className="mb-4">Context</h2>
              <p>TODO: 识别左侧的variables，用户可以给每个variable填充值</p>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-4">
              <h2 className="mb-4">Response</h2>
              <p>TODO: 添加message</p>
              <p>TODO: 实现run</p>
              <Button
                className="cursor-pointer mt-4"
                variant="outline"
                onClick={handleAddPrompt}
              >
                <Plus />
              </Button>
              <div className="flex gap-4">
                <ModelSelect />
                <Button
                  className="cursor-pointer flex-1"
                  onClick={handleAddPrompt}
                >
                  <Play />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
