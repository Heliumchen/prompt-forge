import { useState, useCallback } from "react";
import { LLMClient } from "@/lib/openrouter";
import { toast } from "sonner";
import { Project, Prompt, Message } from "@/lib/storage";

export function useEvaluation() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluatingRound, setEvaluatingRound] = useState<number>(0);
  const [evaluatingTotal, setEvaluatingTotal] = useState<number>(0);
  const [selectedEvaluationProject, setSelectedEvaluationProject] = useState<string>("");
  const [selectedEvaluationRound, setSelectedEvaluationRound] = useState<number>(5);

  const validateEvaluation = useCallback((
    currentProject: Project | null,
    selectedEvaluationProject: string,
    selectedModel: string,
    projects: Project[]
  ) => {
    if (!currentProject) {
      toast.error("请选择一个主项目");
      return false;
    }

    if (!selectedEvaluationProject) {
      toast.error("请选择一个评估项目");
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

    const evaluationProject = projects.find((p: Project) => p.uid === selectedEvaluationProject);
    if (!evaluationProject) {
      toast.error("评估项目不存在");
      return false;
    }

    const evaluationVersion = evaluationProject.versions.find(
      (v) => v.id === evaluationProject.currentVersion
    );
    if (!evaluationVersion) {
      toast.error("评估项目版本不存在");
      return false;
    }

    return { apiKey, evaluationProject, evaluationVersion };
  }, []);

  const handleEvaluate = useCallback(
    async (
      rounds: number,
      currentProject: Project | null,
      selectedModel: string,
      projects: Project[],
      addMessage: (projectUid: string, data?: Partial<Message>) => number,
      updateMessage: (projectUid: string, messageId: number, data: Partial<Message>) => void,
      processPromptsWithVariables: (projectUid: string) => Prompt[],
      setStreamingMessageId: (id: number | null) => void,
      setStreamingContent: (content: string) => void
    ) => {
      const validationResult = validateEvaluation(
        currentProject,
        selectedEvaluationProject,
        selectedModel,
        projects
      );
      
      if (!validationResult) return;

      const { apiKey, evaluationVersion } = validationResult;

      setIsEvaluating(true);
      setEvaluatingTotal(rounds);

      try {
        const currentVersion = currentProject!.versions.find(
          (v) => v.id === currentProject!.currentVersion
        );
        if (!currentVersion) {
          toast.error("当前版本不存在");
          return;
        }

        const localMessages = [...currentVersion.data.messages];

        for (let i = 0; i < rounds; i++) {
          setEvaluatingRound(i + 1);

          try {
            const processedPrompts = processPromptsWithVariables(currentProject!.uid);
            const currentProjectMessages = [
              ...processedPrompts.map((p: Prompt) => ({
                role: p.role,
                content: p.content,
              })),
              ...localMessages.map((m: Message) => ({
                role: m.role,
                content: m.content,
                image_urls: m.image_urls,
              })),
            ];

            const client = new LLMClient(apiKey);

            // Generate assistant reply
            const assistantMessageId = addMessage(currentProject!.uid, {
              role: "assistant",
              content: "",
            });

            setStreamingMessageId(assistantMessageId);

            let assistantContent = "";
            const assistantOptions = {
              model: selectedModel,
              stream: true,
              temperature: currentVersion.data.modelConfig?.temperature || 1.0,
              max_tokens: currentVersion.data.modelConfig?.max_tokens || 1024,
            };

            const assistantStream = await client.chat(
              currentProjectMessages,
              assistantOptions
            );

            for await (const chunk of assistantStream) {
              assistantContent += chunk;
              setStreamingContent(assistantContent);
              updateMessage(currentProject!.uid, assistantMessageId, {
                content: assistantContent,
              });
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
            setStreamingMessageId(null);
            setStreamingContent("");

            const assistantMessage = {
              id: Date.now(),
              role: "assistant" as const,
              content: assistantContent,
            };
            localMessages.push(assistantMessage);

            // Build reversed messages for user response
            const reversedMessages = [
              ...evaluationVersion.data.prompts.map((p: Prompt) => ({
                role: p.role,
                content: p.content,
              })),
              ...localMessages.map((m: Message) => {
                const reversedRole =
                  m.role === "assistant"
                    ? "user"
                    : m.role === "user"
                    ? "assistant"
                    : m.role;
                return {
                  role: reversedRole as "system" | "user" | "assistant",
                  content: m.content,
                  image_urls: m.image_urls,
                };
              }),
            ];

            // Generate user reply
            const userOptions = {
              model: selectedModel,
              stream: true,
              temperature: currentVersion.data.modelConfig?.temperature || 1.0,
              max_tokens: currentVersion.data.modelConfig?.max_tokens || 1024,
            };

            const userMessageId = addMessage(currentProject!.uid, {
              role: "user",
              content: "",
            });

            setStreamingMessageId(userMessageId);

            let userContent = "";
            const userStream = await client.chat(reversedMessages, userOptions);

            for await (const chunk of userStream) {
              userContent += chunk;
              setStreamingContent(userContent);
              updateMessage(currentProject!.uid, userMessageId, {
                content: userContent,
              });
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
            setStreamingMessageId(null);
            setStreamingContent("");

            const userMessage = {
              id: Date.now() + 1,
              role: "user" as const,
              content: userContent,
            };
            localMessages.push(userMessage);
          } catch (roundError: Error | unknown) {
            console.error(`轮次 ${i + 1} 评估错误:`, roundError);
            toast.error(
              `轮次 ${i + 1} 评估错误: ${roundError instanceof Error ? roundError.message : "未知错误"}`
            );

            setStreamingMessageId(null);
            setStreamingContent("");
            continue;
          }
        }

        toast.success(`评估完成，共进行了 ${rounds} 轮对话模拟`);
      } catch (error: Error | unknown) {
        console.error("评估错误:", error);
        toast.error(
          "评估错误: " + (error instanceof Error ? error.message : "未知错误")
        );
      } finally {
        setIsEvaluating(false);
        setEvaluatingRound(0);
        setEvaluatingTotal(0);
        setStreamingMessageId(null);
        setStreamingContent("");
      }
    },
    [selectedEvaluationProject, validateEvaluation]
  );

  return {
    isEvaluating,
    evaluatingRound,
    evaluatingTotal,
    selectedEvaluationProject,
    selectedEvaluationRound,
    setSelectedEvaluationProject,
    setSelectedEvaluationRound,
    handleEvaluate,
  };
}