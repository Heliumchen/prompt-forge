import { OpenRouterService } from './service';
import { ChatMessage, ChatCompletionOptions, StreamChunk, ReasoningConfig } from './types';

export interface LLMOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: { type: 'json_object' | 'text' };
  reasoning?: ReasoningConfig;
}

export interface ChatResult {
  content: string;
  reasoning?: string;
}

export interface StreamChunkResult {
  type: 'reasoning' | 'content';
  text: string;
}

export class LLMClient {
  private service: OpenRouterService;

  constructor(apiKey: string) {
    this.service = new OpenRouterService(apiKey);
  }

  /**
   * 发送聊天消息
   */
  async chat(messages: ChatMessage[], options: LLMOptions): Promise<ChatResult | AsyncIterable<StreamChunkResult>> {
    const requestOptions: ChatCompletionOptions = {
      model: options.model,
      messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
      seed: options.seed,
      stream: options.stream,
      tools: options.tools,
      tool_choice: options.tool_choice,
      response_format: options.response_format,
      reasoning: options.reasoning,
    };

    const response = await this.service.createChatCompletion(requestOptions);

    if (options.stream) {
      return this.parseStreamResponse(response as AsyncIterable<StreamChunk>);
    } else {
      const completionResponse = response as { choices: Array<{ message?: { content?: string; reasoning?: string } }> };
      const message = completionResponse.choices[0]?.message;
      return {
        content: message?.content || '',
        reasoning: message?.reasoning,
      };
    }
  }

  /**
   * 解析流式响应，处理reasoning tokens和普通内容
   */
  private async* parseStreamResponse(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunkResult> {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // 处理reasoning tokens (如果存在)
      if (delta.reasoning) {
        yield { type: 'reasoning', text: delta.reasoning };
      }

      // 处理普通内容
      if (delta.content) {
        yield { type: 'content', text: delta.content };
      }

      // 检查是否完成
      const finishReason = chunk.choices[0]?.finish_reason;
      if (finishReason === 'stop' || finishReason === 'length') {
        break;
      }
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels() {
    return this.service.getModels();
  }

  /**
   * 获取按提供商分组的模型列表
   */
  async getGroupedModels() {
    return this.service.getGroupedModels();
  }

  /**
   * 清除模型缓存
   */
  static clearCache() {
    OpenRouterService.clearCache();
  }
}
