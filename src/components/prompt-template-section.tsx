import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PromptTextarea from "@/components/prompt-textarea";
import { Project } from "@/lib/storage";

interface PromptTemplateSectionProps {
  currentProject: Project | null;
  isGenerating: boolean;
  onValueChange: (value: string, id: number, type: "prompt") => void;
  onTypeChange: (roleType: "system" | "user" | "assistant", id: number, type: "prompt") => void;
  onCopy: (id: number, type: "prompt") => void;
  onDelete: (id: number, type: "prompt") => void;
  onImageAdd: (id: number, type: "prompt", urls: string[]) => void;
  onImageRemove: (id: number, type: "prompt", url: string) => void;
  onAdd: (type: "prompt") => void;
}

export function PromptTemplateSection({
  currentProject,
  isGenerating,
  onValueChange,
  onTypeChange,
  onCopy,
  onDelete,
  onImageAdd,
  onImageRemove,
  onAdd,
}: PromptTemplateSectionProps) {
  return (
    <div className="flex flex-col rounded-xl w-1/2 p-4">
      <h2 className="mb-4 font-semibold">Prompt Template</h2>

      {currentProject ? (
        <>
          <ul>
            {(() => {
              const currentVersion = currentProject.versions.find(
                (v) => v.id === currentProject.currentVersion,
              );
              if (!currentVersion) return null;
              return currentVersion.data.prompts.map((prompt) => (
                <li key={prompt.id}>
                  <PromptTextarea
                    role={prompt.role}
                    content={prompt.content}
                    imageUrls={prompt.image_urls || []}
                    onChange={(content) =>
                      onValueChange(content, prompt.id, "prompt")
                    }
                    onTypeChange={(type) =>
                      onTypeChange(type, prompt.id, "prompt")
                    }
                    onCopy={() => onCopy(prompt.id, "prompt")}
                    onDelete={() => onDelete(prompt.id, "prompt")}
                    onImageAdd={(urls) =>
                      onImageAdd(prompt.id, "prompt", urls)
                    }
                    onImageRemove={(url) =>
                      onImageRemove(prompt.id, "prompt", url)
                    }
                    isGenerating={isGenerating}
                  />
                </li>
              ));
            })()}
          </ul>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => onAdd("prompt")}
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
  );
}