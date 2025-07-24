import { OpenRouterService } from './service';
import { ChatMessage, ChatCompletionOptions, StreamChunk } from './types';

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
}

export class LLMClient {
  private service: OpenRouterService;

  constructor(apiKey: string) {
    this.service = new OpenRouterService(apiKey);
  }

  /**
   * 发送聊天消息
   */
  async chat(messages: ChatMessage[], options: LLMOptions): Promise<string | AsyncIterable<string>> {
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
    };

    const response = await this.service.createChatCompletion(requestOptions);

    if (options.stream) {
      return this.parseStreamResponse(response as AsyncIterable<StreamChunk>);
    } else {
      const completionResponse = response as { choices: Array<{ message?: { content?: string } }> };
      return completionResponse.choices[0]?.message?.content || '';
    }
  }

  /**
   * 解析流式响应，只返回内容
   */
  private async* parseStreamResponse(stream: AsyncIterable<StreamChunk>): AsyncIterable<string> {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
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