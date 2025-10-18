import { useState, useCallback } from "react";
import { LLMClient } from "@/lib/openrouter";
import { toast } from "sonner";
import { Project } from "@/lib/storage";
import { getSecureApiKey } from "@/lib/security";

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

    const apiKey = getSecureApiKey("apiKeys", "OpenRouter");
    if (!apiKey) {
      toast.error("请在设置中配置OpenRouter API密钥");
      return false;
    }

    return apiKey;
  }, []);

  // Helper function to safely convert messageId to number
  const safeParseMessageId = (id: unknown): number | null => {
    if (id === undefined || id === null) return null;
    
    // If it's already a number, return it
    if (typeof id === 'number' && !isNaN(id)) return Math.floor(id);
    
    // If it's an object, try to extract id property
    if (typeof id === 'object' && id !== null) {
      const obj = id as Record<string, unknown>;
      if (typeof obj.id === 'number') return Math.floor(obj.id);
      if (typeof obj.id === 'string') {
        const parsed = parseInt(obj.id, 10);
        return !isNaN(parsed) ? parsed : null;
      }
      // Try to convert the object to string and parse
      const stringified = String(id);
      if (stringified !== '[object Object]') {
        const parsed = parseInt(stringified, 10);
        return !isNaN(parsed) ? parsed : null;
      }
    }
    
    // If it's a string, try to parse it
    if (typeof id === 'string') {
      const parsed = parseInt(id, 10);
      return !isNaN(parsed) ? parsed : null;
    }
    
    console.warn('Unable to parse messageId:', { id, type: typeof id });
    return null;
  };

  const handleGenerate = useCallback(
    async (
      currentProject: Project | null,
      selectedModel: string,
      addMessage: (projectUid: string, data?: Partial<import("@/lib/storage").Message>) => number,
      updateMessage: (projectUid: string, messageId: number, data: Partial<import("@/lib/storage").Message>) => void,
      processPromptsWithVariables: (projectUid: string) => import("@/lib/storage").Prompt[],
      messageId?: unknown // Change type to unknown to accept potentially corrupted data
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

      // Parse and validate messageId
      const parsedMessageId = safeParseMessageId(messageId);
      
      if (messageId !== undefined) {
        if (parsedMessageId === null) {
          console.error('Invalid messageId provided:', { messageId, type: typeof messageId });
          toast.error('无效的消息ID，请刷新页面重试');
          return;
        }

        const allMessages = [...currentVersion.data.messages];
        const messageIndex = allMessages.findIndex((m) => m.id === parsedMessageId);

        if (messageIndex === -1) {
          console.error(`Message with id ${parsedMessageId} not found in messages:`, 
            allMessages.map(m => ({ id: m.id, type: typeof m.id })));
          toast.error('未找到指定的消息，请刷新页面重试');
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
      setGeneratingMessageId(parsedMessageId || null);

      try {
        const client = new LLMClient(apiKey);

        let generatedText = "";
        let newMessageId: number | undefined;

        if (parsedMessageId !== null) {
          newMessageId = parsedMessageId;
          updateMessage(currentProject!.uid, parsedMessageId, { content: "" });
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
          reasoning: currentVersion.data.modelConfig?.reasoning_effort
            ? { effort: currentVersion.data.modelConfig.reasoning_effort }
            : undefined,
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

        if (parsedMessageId === null) {
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