import { useCallback } from "react";
import { toast } from "sonner";
import { Project } from "@/lib/storage";

type ItemType = "prompt" | "message";

export function useItemHandlers() {
  const handleImageAdd = useCallback(
    (
      id: number,
      type: ItemType,
      urls: string[],
      currentProject: Project | null,
      updatePrompt: (projectUid: string, promptId: number, data: Partial<import("@/lib/storage").Prompt>) => void,
      updateMessage: (projectUid: string, messageId: number, data: Partial<import("@/lib/storage").Message>) => void
    ) => {
      if (currentProject) {
        const currentVersion = currentProject.versions.find(
          (v) => v.id === currentProject.currentVersion
        );
        if (currentVersion) {
          if (type === "prompt") {
            const prompt = currentVersion.data.prompts.find((p) => p.id === id);
            if (prompt) {
              const newImageUrls = [...(prompt.image_urls || []), ...urls];
              updatePrompt(currentProject.uid, id, { image_urls: newImageUrls });
            }
          } else {
            const message = currentVersion.data.messages.find((m) => m.id === id);
            if (message && message.role === "user") {
              const newImageUrls = [...(message.image_urls || []), ...urls];
              updateMessage(currentProject.uid, id, { image_urls: newImageUrls });
            }
          }
        }
      }
    },
    []
  );

  const handleImageRemove = useCallback(
    (
      id: number,
      type: ItemType,
      urlToRemove: string,
      currentProject: Project | null,
      updatePrompt: (projectUid: string, promptId: number, data: Partial<import("@/lib/storage").Prompt>) => void,
      updateMessage: (projectUid: string, messageId: number, data: Partial<import("@/lib/storage").Message>) => void
    ) => {
      if (currentProject) {
        const currentVersion = currentProject.versions.find(
          (v) => v.id === currentProject.currentVersion
        );
        if (currentVersion) {
          if (type === "prompt") {
            const prompt = currentVersion.data.prompts.find((p) => p.id === id);
            if (prompt && prompt.image_urls) {
              const newImageUrls = prompt.image_urls.filter(
                (url) => url !== urlToRemove
              );
              updatePrompt(currentProject.uid, id, { image_urls: newImageUrls });
            }
          } else {
            const message = currentVersion.data.messages.find((m) => m.id === id);
            if (message && message.role === "user" && message.image_urls) {
              const newImageUrls = message.image_urls.filter(
                (url) => url !== urlToRemove
              );
              updateMessage(currentProject.uid, id, { image_urls: newImageUrls });
            }
          }
        }
      }
    },
    []
  );

  const handleAdd = useCallback(
    (
      type: ItemType,
      currentProject: Project | null,
      addPrompt: (projectUid: string) => void,
      addMessage: (projectUid: string, data?: Partial<import("@/lib/storage").Message>) => number
    ) => {
      if (currentProject) {
        if (type === "prompt") {
          addPrompt(currentProject.uid);
        } else {
          addMessage(currentProject.uid);
        }
      }
    },
    []
  );

  const handleClearAll = useCallback(
    (
      type: ItemType,
      currentProject: Project | null,
      clearPrompts: (projectUid: string) => void,
      clearMessages: (projectUid: string) => void
    ) => {
      if (currentProject) {
        if (type === "prompt") {
          clearPrompts(currentProject.uid);
          toast.success("Prompt templates cleared");
        } else {
          clearMessages(currentProject.uid);
          toast.success("Messages cleared");
        }
      }
    },
    []
  );

  const handleValueChange = useCallback(
    (
      value: string,
      id: number,
      type: ItemType,
      currentProject: Project | null,
      updatePrompt: (projectUid: string, promptId: number, data: Partial<import("@/lib/storage").Prompt>) => void,
      updateMessage: (projectUid: string, messageId: number, data: Partial<import("@/lib/storage").Message>) => void
    ) => {
      if (currentProject) {
        if (type === "prompt") {
          updatePrompt(currentProject.uid, id, { content: value });
        } else {
          updateMessage(currentProject.uid, id, { content: value });
        }
      }
    },
    []
  );

  const handleTypeChange = useCallback(
    (
      roleType: "system" | "user" | "assistant",
      id: number,
      type: ItemType,
      currentProject: Project | null,
      updatePrompt: (projectUid: string, promptId: number, data: Partial<import("@/lib/storage").Prompt>) => void,
      updateMessage: (projectUid: string, messageId: number, data: Partial<import("@/lib/storage").Message>) => void
    ) => {
      if (currentProject) {
        if (type === "prompt") {
          updatePrompt(currentProject.uid, id, { role: roleType });
        } else {
          updateMessage(currentProject.uid, id, { role: roleType });
        }
      }
    },
    []
  );

  const handleCopy = useCallback(
    (id: number, type: ItemType, currentProject: Project | null) => {
      const currentVersion = currentProject?.versions.find(
        (v) => v.id === currentProject.currentVersion
      );
      if (!currentVersion) return;

      const items =
        type === "prompt"
          ? currentVersion.data.prompts
          : currentVersion.data.messages;
      const item = items.find((item) => item.id === id);
      if (item) {
        navigator.clipboard.writeText(item.content);
        console.log(`${type} ${id} copied to clipboard`);
      }
    },
    []
  );

  const handleDelete = useCallback(
    (
      id: number,
      type: ItemType,
      currentProject: Project | null,
      deletePrompt: (projectUid: string, promptId: number) => void,
      deleteMessage: (projectUid: string, messageId: number) => void
    ) => {
      if (currentProject) {
        if (type === "prompt") {
          deletePrompt(currentProject.uid, id);
        } else {
          deleteMessage(currentProject.uid, id);
        }
        console.log(`${type} ${id} deleted`);
      }
    },
    []
  );

  return {
    handleImageAdd,
    handleImageRemove,
    handleAdd,
    handleClearAll,
    handleValueChange,
    handleTypeChange,
    handleCopy,
    handleDelete,
  };
}