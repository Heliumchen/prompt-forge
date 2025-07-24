import { 
  OpenRouterModel, 
  OpenRouterModelsResponse, 
  ChatCompletionOptions, 
  ChatCompletionResponse,
  StreamChunk,
  ModelGroup,
  ChatMessage
} from './types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODELS_CACHE_KEY = 'openrouter_models_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 配置要显示的模型提供商分组
const ALLOWED_PROVIDERS = [
  'openai',
  'anthropic', 
  'google',
  'meta-llama',
  'mistralai',
  'qwen',
  'deepseek',
  'cohere',
  'perplexity',
  'x-ai'
];

interface CachedModels {
  data: OpenRouterModel[];
  timestamp: number;
}

export class OpenRouterService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 获取模型列表，优先从缓存读取
   */
  async getModels(): Promise<OpenRouterModel[]> {
    try {
      // 尝试从缓存读取
      const cached = this.getCachedModels();
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log('Using cached models');
        return cached.data;
      }

      // 缓存无效或不存在，从API获取
      console.log('Fetching models from API');
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data: OpenRouterModelsResponse = await response.json();
      
      // 缓存结果
      this.cacheModels(data.data);
      
      return data.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      
      // 如果API调用失败，尝试使用过期的缓存
      const cached = this.getCachedModels();
      if (cached) {
        console.log('Using expired cache due to API error');
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * 获取按提供商分组的模型列表
   */
  async getGroupedModels(): Promise<ModelGroup[]> {
    const models = await this.getModels();
    
    // 按提供商分组
    const groups: { [key: string]: OpenRouterModel[] } = {};
    
    models.forEach(model => {
      const provider = model.id.split('/')[0];
      
      // 只包含允许的提供商
      if (ALLOWED_PROVIDERS.includes(provider)) {
        if (!groups[provider]) {
          groups[provider] = [];
        }
        groups[provider].push(model);
      }
    });

    // 转换为数组格式并排序
    return Object.entries(groups)
      .map(([provider, models]) => ({
        provider,
        models: models.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => {
        // 按照ALLOWED_PROVIDERS的顺序排序
        const aIndex = ALLOWED_PROVIDERS.indexOf(a.provider);
        const bIndex = ALLOWED_PROVIDERS.indexOf(b.provider);
        return aIndex - bIndex;
      });
  }

  /**
   * 发送聊天完成请求
   */
  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse | AsyncIterable<StreamChunk>> {
    const { stream, ...requestOptions } = options;
    
    // 处理消息中的图片URL
    const processedMessages = await this.processMessages(options.messages);
    
    const requestBody = {
      ...requestOptions,
      messages: processedMessages,
      stream: stream || false,
    };

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : '',
        'X-Title': 'Prompt Forge',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    if (stream) {
      return this.parseStreamResponse(response);
    } else {
      return await response.json() as ChatCompletionResponse;
    }
  }

  /**
   * 处理消息中的图片URL，转换为base64格式
   */
  private async processMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
    return Promise.all(messages.map(async (message) => {
      if (message.image_urls && message.image_urls.length > 0) {
        const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];
        
        // 添加文本内容
        if (typeof message.content === 'string' && message.content) {
          content.push({ type: 'text', text: message.content });
        }
        
        // 处理图片
        for (const imageUrl of message.image_urls) {
          try {
            const base64Url = await this.imageUrlToBase64(imageUrl);
            content.push({
              type: 'image_url',
              image_url: { url: base64Url }
            });
          } catch (error) {
            console.error(`Failed to process image ${imageUrl}:`, error);
          }
        }
        
        return {
          ...message,
          content: content.length > 0 ? content : message.content,
        };
      }
      
      return message;
    }));
  }

  /**
   * 将图片URL转换为base64格式
   */
  private async imageUrlToBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 解析流式响应
   */
  private async* parseStreamResponse(response: Response): AsyncIterable<StreamChunk> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const chunk: StreamChunk = JSON.parse(data);
              yield chunk;
            } catch (error) {
              console.error('Error parsing stream chunk:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 从localStorage获取缓存的模型
   */
  private getCachedModels(): CachedModels | null {
    try {
      const cached = localStorage.getItem(MODELS_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading models cache:', error);
      return null;
    }
  }

  /**
   * 缓存模型到localStorage
   */
  private cacheModels(models: OpenRouterModel[]): void {
    try {
      const cacheData: CachedModels = {
        data: models,
        timestamp: Date.now(),
      };
      localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching models:', error);
    }
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_DURATION;
  }

  /**
   * 清除模型缓存
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(MODELS_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing models cache:', error);
    }
  }
}