import { useState, useCallback } from "react";
import { LLMClient } from "@/lib/openrouter";
import { toast } from "sonner";
import { Project } from "@/lib/storage";

export function useGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);

  const validateGeneration = useCallback((currentProject: Project | null, selectedModel: string) => {
    if (!currentProject) {
      toast.error("请选择一个项目");
      return false;
    }

    if (!selectedModel) {
      toast.error("请选择一个模型");
      return false;
    }

    const apiKeysStr = localStorage.getItem("apiKeys");
    if (!apiKeysStr) {
      toast.error("请在设置中配置OpenRouter API密钥");
      return false;
    }

    const apiKeys = JSON.parse(apiKeysStr);
    const apiKey = apiKeys.OpenRouter;

    if (!apiKey) {
      toast.error("请在设置中配置OpenRouter API密钥");
      return false;
    }

    return apiKey;
  }, []);

  const handleGenerate = useCallback(
    async (
      currentProject: Project | null,
      selectedModel: string,
      addMessage: (projectUid: string, data?: Partial<import("@/lib/storage").Message>) => number,
      updateMessage: (projectUid: string, messageId: number, data: Partial<import("@/lib/storage").Message>) => void,
      processPromptsWithVariables: (projectUid: string) => import("@/lib/storage").Prompt[],
      messageId?: number
    ) => {
      const apiKey = validateGeneration(currentProject, selectedModel);
      if (!apiKey) return;

      const currentVersion = currentProject!.versions.find(
        (v) => v.id === currentProject!.currentVersion
      );
      if (!currentVersion) {
        toast.error("当前版本不存在");
        return;
      }

      let messages;

      if (messageId !== undefined) {
        const allMessages = [...currentVersion.data.messages];
        const messageIndex = allMessages.findIndex((m) => m.id === messageId);

        if (messageIndex === -1) {
          console.error(`Message with id ${messageId} not found`);
          return;
        }

        const processedPrompts = processPromptsWithVariables(currentProject!.uid);
        messages = [
          ...processedPrompts.map((p) => ({
            role: p.role,
            content: p.content,
            image_urls: p.image_urls,
          })),
          ...allMessages.slice(0, messageIndex).map((m) => ({
            role: m.role,
            content: m.content,
            image_urls: m.image_urls || [],
          })),
        ];
      } else {
        const processedPrompts = processPromptsWithVariables(currentProject!.uid);
        messages = [
          ...processedPrompts.map((p) => ({
            role: p.role,
            content: p.content,
            image_urls: p.image_urls,
          })),
          ...currentVersion.data.messages.map((m) => ({
            role: m.role,
            content: m.content,
            image_urls: m.image_urls || [],
          })),
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

        let generatedText = "";
        let newMessageId: number | undefined;

        if (messageId !== undefined) {
          newMessageId = messageId;
          updateMessage(currentProject!.uid, messageId, { content: "" });
        } else {
          newMessageId = addMessage(currentProject!.uid, {
            role: "assistant",
            content: "",
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

        for await (const chunk of stream) {
          generatedText += chunk;
          setStreamingContent(generatedText);

          if (newMessageId !== undefined) {
            updateMessage(currentProject!.uid, newMessageId, {
              content: generatedText,
            });
          }
        }

        setStreamingContent(generatedText);

        setTimeout(() => {
          setStreamingMessageId(null);
          setStreamingContent("");
        }, 100);

        if (messageId === undefined) {
          addMessage(currentProject!.uid, {
            role: "user",
            content: "",
          });
        }
      } catch (error: Error | unknown) {
        console.error("生成错误:", error);
        toast.error(
          "生成错误: " + (error instanceof Error ? error.message : "未知错误")
        );
      } finally {
        setIsGenerating(false);
        setGeneratingMessageId(null);
      }
    },
    [validateGeneration]
  );

  return {
    isGenerating,
    generatingMessageId,
    streamingContent,
    streamingMessageId,
    handleGenerate,
    setStreamingContent,
    setStreamingMessageId,
  };
}