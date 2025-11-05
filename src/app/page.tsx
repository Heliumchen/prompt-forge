"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/contexts/ProjectContext";
import { useTestSets } from "@/contexts/TestSetContext";
import { IntroBlock } from "@/components/intro-block";
import { DialogModelSettings } from "@/components/dialog-model-settings";
import { VersionSelect } from "@/components/version-select";
import { TestSetView } from "@/components/test-set-view";

// Custom hooks
import { useGeneration } from "@/hooks/useGeneration";
import { useEvaluation } from "@/hooks/useEvaluation";
import { usePromptReview } from "@/hooks/usePromptReview";
import { useItemHandlers } from "@/hooks/useItemHandlers";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Components
import { PromptTemplateSection } from "@/components/prompt-template-section";
import { GenerationsSection } from "@/components/generations-section";
import { PromptReviewSection } from "@/components/prompt-review-section";
import { JSONImportDialog } from "@/components/json-import-dialog";
import { GlobalDropZone } from "@/components/global-drop-zone";

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

  const { setCurrentTestSet } = useTestSets();

  // State
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState(false);
  const [isJSONImportOpen, setIsJSONImportOpen] = useState(false);
  const [jsonImportData, setJSONImportData] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"prompt" | "testset">("prompt");

  // Load tab state from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem("prompt-forge-active-tab");
    if (savedTab === "testset" || savedTab === "prompt") {
      setActiveTab(savedTab);
    }
  }, []);

  // Set currentTestSet when switching to testset tab or when project changes
  useEffect(() => {
    if (currentProject?.testSet && activeTab === "testset") {
      setCurrentTestSet(currentProject.testSet);
    } else if (activeTab === "prompt") {
      setCurrentTestSet(null);
    }
  }, [currentProject, activeTab, setCurrentTestSet]);

  // Save tab state to localStorage
  const handleTabChange = (value: string) => {
    const tab = value as "prompt" | "testset";
    setActiveTab(tab);
    localStorage.setItem("prompt-forge-active-tab", tab);
  };

  // Custom hooks
  const generation = useGeneration();
  const evaluation = useEvaluation();
  const promptReview = usePromptReview();
  const itemHandlers = useItemHandlers();

  // Initialize model from current project
  useEffect(() => {
    if (currentProject) {
      const currentVersion = currentProject.versions.find(
        (v) => v.id === currentProject.currentVersion,
      );
      if (currentVersion?.data.modelConfig?.model) {
        setSelectedModel(currentVersion.data.modelConfig.model);
      }
    }
  }, [currentProject]);

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    if (currentProject) {
      const currentVersion = currentProject.versions.find(
        (v) => v.id === currentProject.currentVersion,
      );
      if (currentVersion) {
        updateProject({
          ...currentProject,
          versions: currentProject.versions.map((v) =>
            v.id === currentVersion.id
              ? {
                  ...v,
                  data: {
                    ...v.data,
                    modelConfig: {
                      provider: "OpenRouter",
                      model: value,
                    },
                  },
                }
              : v,
          ),
        });
      }
    }
  };

  // Generation handler wrapper
  const handleGenerate = (messageId?: number) => {
    generation.handleGenerate(
      currentProject,
      selectedModel,
      addMessage,
      updateMessage,
      processPromptsWithVariables,
      messageId,
    );
  };

  // Evaluation handler wrapper
  const handleEvaluate = (rounds: number) => {
    evaluation.handleEvaluate(
      rounds,
      currentProject,
      selectedModel,
      projects,
      addMessage,
      updateMessage,
      processPromptsWithVariables,
      generation.setStreamingMessageId,
      generation.setStreamingContent,
    );
  };

  // Prompt review handler wrapper
  const handlePromptReview = () => {
    promptReview.handlePromptReview(currentProject);
  };

  // JSON import handlers
  const handleJSONPaste = (jsonData: string) => {
    if (currentProject && activeTab === "prompt") {
      setJSONImportData(jsonData);
      setIsJSONImportOpen(true);
    }
  };

  const handleJSONImport = (
    variableValues: Record<string, string>,
    messages: Array<{ role: string; content: string }>,
  ) => {
    if (!currentProject) return;

    // Update variables with extracted values
    Object.entries(variableValues).forEach(([name, value]) => {
      updateVariable(currentProject.uid, name, value);
    });

    // Add imported messages
    messages.forEach((message) => {
      addMessage(currentProject.uid, {
        role: message.role as "user" | "assistant",
        content: message.content,
      });
    });

    setIsJSONImportOpen(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts(
    generation.isGenerating,
    handleGenerate,
    handleJSONPaste,
  );

  return (
    <GlobalDropZone>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
        {currentProject && (
          <>
            <DialogModelSettings
              open={isModelSettingsOpen}
              onOpenChange={setIsModelSettingsOpen}
              modelConfig={
                currentProject.versions.find(
                  (v) => v.id === currentProject.currentVersion,
                )?.data.modelConfig || { provider: "", model: "" }
              }
              onSave={(config) => {
                if (currentProject) {
                  const currentVersion = currentProject.versions.find(
                    (v) => v.id === currentProject.currentVersion,
                  );
                  if (currentVersion) {
                    updateProject({
                      ...currentProject,
                      versions: currentProject.versions.map((v) =>
                        v.id === currentVersion.id
                          ? {
                              ...v,
                              data: {
                                ...v.data,
                                modelConfig: config,
                              },
                            }
                          : v,
                      ),
                    });
                  }
                }
              }}
            />

            <JSONImportDialog
              isOpen={isJSONImportOpen}
              onClose={() => setIsJSONImportOpen(false)}
              onOpenChange={setIsJSONImportOpen}
              jsonData={jsonImportData}
              project={currentProject}
              onImport={handleJSONImport}
            />
          </>
        )}

        <header className="flex h-16 shrink-0 items-center gap-2 justify-between border-b">
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
            {currentProject && (
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="ml-4"
              >
                <TabsList>
                  <TabsTrigger value="prompt">Prompt</TabsTrigger>
                  <TabsTrigger value="testset">Test Set</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          {currentProject && activeTab === "prompt" ? (
            <div className="flex items-center gap-2 px-4">
              <VersionSelect project={currentProject} />
            </div>
          ) : null}
        </header>

        {currentProject ? (
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex-1 overflow-hidden"
          >
            <TabsContent value="prompt" className="h-full m-0 p-0">
              <div className="flex pl-2 h-full">
                <PromptTemplateSection
                  currentProject={currentProject}
                  isGenerating={generation.isGenerating}
                  onValueChange={(value, id) =>
                    itemHandlers.handleValueChange(
                      value,
                      id,
                      "prompt",
                      currentProject,
                      updatePrompt,
                      updateMessage,
                    )
                  }
                  onTypeChange={(roleType, id) =>
                    itemHandlers.handleTypeChange(
                      roleType,
                      id,
                      "prompt",
                      currentProject,
                      updatePrompt,
                      updateMessage,
                    )
                  }
                  onCopy={(id) =>
                    itemHandlers.handleCopy(id, "prompt", currentProject)
                  }
                  onDelete={(id) =>
                    itemHandlers.handleDelete(
                      id,
                      "prompt",
                      currentProject,
                      deletePrompt,
                      deleteMessage,
                    )
                  }
                  onImageAdd={(id, type, urls) =>
                    itemHandlers.handleImageAdd(
                      id,
                      type,
                      urls,
                      currentProject,
                      updatePrompt,
                      updateMessage,
                    )
                  }
                  onImageRemove={(id, type, url) =>
                    itemHandlers.handleImageRemove(
                      id,
                      type,
                      url,
                      currentProject,
                      updatePrompt,
                      updateMessage,
                    )
                  }
                  onAdd={(type) =>
                    itemHandlers.handleAdd(
                      type,
                      currentProject,
                      addPrompt,
                      addMessage,
                    )
                  }
                />

                <div className="flex-1 flex flex-col rounded-xl p-4 min-w-0">
                  <Tabs defaultValue="generations" className="w-full flex-1">
                    <TabsList>
                      <TabsTrigger value="generations">Generations</TabsTrigger>
                      <TabsTrigger value="prompt-review">
                        Prompt Review
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="generations" className="w-full flex-1">
                      <GenerationsSection
                        currentProject={currentProject}
                        selectedModel={selectedModel}
                        isGenerating={generation.isGenerating}
                        generatingMessageId={generation.generatingMessageId}
                        streamingContent={generation.streamingContent}
                        streamingMessageId={generation.streamingMessageId}
                        selectedEvaluationProject={
                          evaluation.selectedEvaluationProject
                        }
                        selectedEvaluationRound={
                          evaluation.selectedEvaluationRound
                        }
                        isEvaluating={evaluation.isEvaluating}
                        evaluatingRound={evaluation.evaluatingRound}
                        evaluatingTotal={evaluation.evaluatingTotal}
                        onModelChange={handleModelChange}
                        onGenerate={handleGenerate}
                        onModelSettingsOpen={() => setIsModelSettingsOpen(true)}
                        onValueChange={(value, id) =>
                          itemHandlers.handleValueChange(
                            value,
                            id,
                            "message",
                            currentProject,
                            updatePrompt,
                            updateMessage,
                          )
                        }
                        onTypeChange={(roleType, id) =>
                          itemHandlers.handleTypeChange(
                            roleType,
                            id,
                            "message",
                            currentProject,
                            updatePrompt,
                            updateMessage,
                          )
                        }
                        onCopy={(id) =>
                          itemHandlers.handleCopy(id, "message", currentProject)
                        }
                        onDelete={(id) =>
                          itemHandlers.handleDelete(
                            id,
                            "message",
                            currentProject,
                            deletePrompt,
                            deleteMessage,
                          )
                        }
                        onRegenerate={handleGenerate}
                        onImageAdd={(id, type, urls) =>
                          itemHandlers.handleImageAdd(
                            id,
                            type,
                            urls,
                            currentProject,
                            updatePrompt,
                            updateMessage,
                          )
                        }
                        onImageRemove={(id, type, url) =>
                          itemHandlers.handleImageRemove(
                            id,
                            type,
                            url,
                            currentProject,
                            updatePrompt,
                            updateMessage,
                          )
                        }
                        onAdd={(type) =>
                          itemHandlers.handleAdd(
                            type,
                            currentProject,
                            addPrompt,
                            addMessage,
                          )
                        }
                        onClearAll={(type) =>
                          itemHandlers.handleClearAll(
                            type,
                            currentProject,
                            clearPrompts,
                            clearMessages,
                          )
                        }
                        getDetectedVariables={getDetectedVariables}
                        updateVariable={updateVariable}
                        onEvaluationProjectChange={
                          evaluation.setSelectedEvaluationProject
                        }
                        onEvaluationRoundChange={
                          evaluation.setSelectedEvaluationRound
                        }
                        onEvaluate={handleEvaluate}
                      />
                    </TabsContent>
                    <TabsContent
                      value="prompt-review"
                      className="w-full flex-1"
                    >
                      <PromptReviewSection
                        selectedReviewModel={promptReview.selectedReviewModel}
                        reviewContent={promptReview.reviewContent}
                        isReviewing={promptReview.isReviewing}
                        isStreamingReview={promptReview.isStreamingReview}
                        onModelChange={promptReview.setSelectedReviewModel}
                        onReview={handlePromptReview}
                        onClearReview={promptReview.clearReviewContent}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="testset" className="h-full m-0 p-0">
              <TestSetView testSetUid={currentProject.testSet?.uid} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex h-full w-full">
            <IntroBlock />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
    </GlobalDropZone>
  );
}
