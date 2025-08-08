import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Play, MessageCircleOff, Settings2 } from "lucide-react";
import PromptTextarea from "@/components/prompt-textarea";
import { ModelSelect } from "@/components/model-select";
import { VariablesBanner } from "@/components/variables-banner";
import { SimulationSection } from "@/components/simulation-section";
import { Project } from "@/lib/storage";

interface GenerationsSectionProps {
  currentProject: Project | null;
  selectedModel: string;
  isGenerating: boolean;
  generatingMessageId: number | null;
  streamingContent: string;
  streamingMessageId: number | null;
  // Evaluation props
  selectedEvaluationProject: string;
  selectedEvaluationRound: number;
  isEvaluating: boolean;
  evaluatingRound: number;
  evaluatingTotal: number;
  // Functions
  onModelChange: (value: string) => void;
  onGenerate: () => void;
  onModelSettingsOpen: () => void;
  onValueChange: (value: string, id: number, type: "message") => void;
  onTypeChange: (roleType: "system" | "user" | "assistant", id: number, type: "message") => void;
  onCopy: (id: number, type: "message") => void;
  onDelete: (id: number, type: "message") => void;
  onRegenerate: (messageId: number) => void;
  onImageAdd: (id: number, type: "message", urls: string[]) => void;
  onImageRemove: (id: number, type: "message", url: string) => void;
  onAdd: (type: "message") => void;
  onClearAll: (type: "message") => void;
  // Variables
  getDetectedVariables: (projectUid: string) => string[];
  updateVariable: (projectUid: string, name: string, value: string) => void;
  // Evaluation
  onEvaluationProjectChange: (value: string) => void;
  onEvaluationRoundChange: (value: number) => void;
  onEvaluate: (rounds: number) => void;
}

export function GenerationsSection({
  currentProject,
  selectedModel,
  isGenerating,
  generatingMessageId,
  streamingContent,
  streamingMessageId,
  selectedEvaluationProject,
  selectedEvaluationRound,
  isEvaluating,
  evaluatingRound,
  evaluatingTotal,
  onModelChange,
  onGenerate,
  onModelSettingsOpen,
  onValueChange,
  onTypeChange,
  onCopy,
  onDelete,
  onRegenerate,
  onImageAdd,
  onImageRemove,
  onAdd,
  onClearAll,
  getDetectedVariables,
  updateVariable,
  onEvaluationProjectChange,
  onEvaluationRoundChange,
  onEvaluate,
}: GenerationsSectionProps) {
  const lastUserMessageRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col gap-4 w-full">
      <VariablesBanner
        currentProject={currentProject}
        isGenerating={isGenerating}
        getDetectedVariables={getDetectedVariables}
        updateVariable={updateVariable}
      />

      <ul>
        {currentProject?.versions
          .find((v) => v.id === currentProject.currentVersion)
          ?.data.messages.map((message, index, array) => (
            <li key={message.id}>
              <PromptTextarea
                role={message.role}
                content={message.content}
                isStreaming={streamingMessageId === message.id}
                streamingContent={
                  streamingMessageId === message.id
                    ? streamingContent
                    : undefined
                }
                onChange={(content) =>
                  onValueChange(content, message.id, "message")
                }
                onTypeChange={(role) =>
                  onTypeChange(role, message.id, "message")
                }
                onCopy={() => onCopy(message.id, "message")}
                onDelete={() => onDelete(message.id, "message")}
                onRegenerate={
                  message.role === "assistant"
                    ? () => onRegenerate(message.id)
                    : undefined
                }
                imageUrls={message.image_urls || []}
                onImageAdd={
                  message.role === "user"
                    ? (urls) => onImageAdd(message.id, "message", urls)
                    : undefined
                }
                onImageRemove={
                  message.role === "user"
                    ? (url) => onImageRemove(message.id, "message", url)
                    : undefined
                }
                isGenerating={
                  isGenerating &&
                  (generatingMessageId === message.id ||
                    generatingMessageId === null)
                }
                ref={
                  message.role === "user" && index === array.length - 1
                    ? lastUserMessageRef
                    : undefined
                }
              />
            </li>
          ))}
      </ul>

      <div className="flex gap-4">
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => onAdd("message")}
          disabled={isGenerating}
        >
          <Plus /> Add
        </Button>
        <Button
          variant="outline"
          onClick={() => onClearAll("message")}
          disabled={isGenerating}
        >
          <MessageCircleOff />
        </Button>
      </div>

      <div className="flex gap-4">
        <ModelSelect
          value={selectedModel}
          onChange={onModelChange}
        />
        <Button
          variant="outline"
          onClick={onModelSettingsOpen}
          disabled={isGenerating}
          className="w-[70px]"
        >
          <Settings2 />
        </Button>
        <Button
          className="flex-1"
          onClick={onGenerate}
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

      <SimulationSection
        selectedEvaluationProject={selectedEvaluationProject}
        selectedEvaluationRound={selectedEvaluationRound}
        isEvaluating={isEvaluating}
        evaluatingRound={evaluatingRound}
        evaluatingTotal={evaluatingTotal}
        onProjectChange={onEvaluationProjectChange}
        onRoundChange={onEvaluationRoundChange}
        onEvaluate={onEvaluate}
      />
    </div>
  );
}