import { useState, useCallback } from "react";
import { LLMClient } from "@/lib/openrouter";
import type { StreamChunkResult } from "@/lib/openrouter";
import { toast } from "sonner";
import { Project } from "@/lib/storage";
import { getSecureApiKey } from "@/lib/security";

export function usePromptReview() {
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedReviewModel, setSelectedReviewModel] = useState<string>(
    "google/gemini-2.5-pro",
  );
  const [reviewContent, setReviewContent] = useState<string>("");
  const [isStreamingReview, setIsStreamingReview] = useState(false);

  const validateReview = useCallback(
    (currentProject: Project | null, selectedReviewModel: string) => {
      if (!currentProject) {
        toast.error("请选择一个项目");
        return false;
      }

      if (!selectedReviewModel) {
        toast.error("请选择一个模型");
        return false;
      }

      const apiKey = getSecureApiKey("apiKeys", "OpenRouter");
      if (!apiKey) {
        toast.error("请在设置中配置OpenRouter API密钥");
        return false;
      }

      return apiKey;
    },
    [],
  );

  const handlePromptReview = useCallback(
    async (currentProject: Project | null) => {
      const apiKey = validateReview(currentProject, selectedReviewModel);
      if (!apiKey) return;

      const currentVersion = currentProject!.versions.find(
        (v) => v.id === currentProject!.currentVersion,
      );
      if (!currentVersion) {
        toast.error("当前版本不存在");
        return;
      }

      // 使用原始的prompts（带placeholder），而不是填充变量后的prompts
      const originalPrompts = currentVersion.data.prompts || [];
      if (originalPrompts.length === 0) {
        toast.error("没有可评估的提示词模板");
        return;
      }

      const promptTemplateContent = originalPrompts
        .map((prompt) => {
          return `**${prompt.role.toUpperCase()}:**\n${prompt.content}`;
        })
        .join("\n\n");

      setIsReviewing(true);
      setIsStreamingReview(true);
      setReviewContent("");

      try {
        const client = new LLMClient(apiKey);

        const messages = [
          {
            role: "system" as const,
            content: `你是一个System Prompt大师。

用户会给你发送一段System Prompt，你需要帮助用户分析System Prompt的现状，并给出合理的、可操作的优化建议。

## 价值取向
惜字如金，能用一个字讲清楚的事情，绝不用更多字；用词的准确非常重要
逻辑清晰，主次分明，能敏锐洞察到system prompt中矛盾冲突的地方
深谙大模型工作原理，对大模型的能力边界有深刻理解

## 输出方式
覆盖以下内容给出你的分析反馈
- 整体评价 (Overall Assessment)
- 可优化建议 (Suggestions for Improvement)
建议尽可能具体可操作，比如指明把原句中的\`\`\`XXX\`\`\`改成\`\`\`YYY\`\`\``,
          },
          {
            role: "user" as const,
            content: promptTemplateContent,
          },
        ];

        const options = {
          model: selectedReviewModel,
          stream: true,
          temperature: 0.7,
          max_tokens: 20480,
        };

        const isGeminiReasoning =
          selectedReviewModel.includes("gemini-2.5-pro");

        const stream = await client.chat(messages, options);

        let generatedText = "";
        let hasReceivedContent = false;
        let thinkingTimeout: NodeJS.Timeout | null = null;

        if (isGeminiReasoning) {
          thinkingTimeout = setTimeout(() => {
            if (!hasReceivedContent) {
              setReviewContent(
                "🤔 Reasoning models take longer time to generate a response, please wait...",
              );
            }
          }, 5000);
        }

        for await (const chunk of stream as AsyncIterable<StreamChunkResult>) {
          if (chunk.type === 'content' && chunk.text) {
            if (!hasReceivedContent) {
              hasReceivedContent = true;
              if (thinkingTimeout) {
                clearTimeout(thinkingTimeout);
                thinkingTimeout = null;
              }
              if (isGeminiReasoning) {
                setReviewContent("");
                generatedText = "";
              }
            }
            generatedText += chunk.text;
            setReviewContent(generatedText);
          }
        }

        if (thinkingTimeout) {
          clearTimeout(thinkingTimeout);
        }

        if (!hasReceivedContent) {
          setReviewContent(
            "⚠️ 未收到模型响应，可能是reasoning model还在处理中。\n\n请稍后重试或尝试其他模型。",
          );
          toast.warning("未收到模型响应，请重试");
        } else {
          toast.success("提示词评估完成");
        }
      } catch (error: Error | unknown) {
        console.error("评估错误:", error);
        toast.error(
          "评估错误: " + (error instanceof Error ? error.message : "未知错误"),
        );
      } finally {
        setIsReviewing(false);
        setIsStreamingReview(false);
      }
    },
    [selectedReviewModel, validateReview],
  );

  const clearReviewContent = useCallback(() => {
    setReviewContent("");
  }, []);

  return {
    isReviewing,
    selectedReviewModel,
    reviewContent,
    isStreamingReview,
    setSelectedReviewModel,
    handlePromptReview,
    clearReviewContent,
  };
}
