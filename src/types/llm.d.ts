declare module '@/lib/llmjs' {
  interface Tool {
    type: string;
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }
  
  interface Stream extends AsyncIterable<string> {
    [Symbol.asyncIterator](): AsyncIterator<string>;
  }
  
  interface LLMOptions {
    model?: string;
    service?: string;
    apikey?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    tools?: Tool[];
    stream_handler?: (chunk: string) => void;
    parser?: (response: unknown) => unknown;
  }

  interface Message {
    role: 'user' | 'system' | 'assistant';
    content: string;
  }

  class LLM {
    messages: Message[];
    options: LLMOptions;
    
    constructor(input: string | Message[], options?: LLMOptions);
    send(opts?: LLMOptions): Promise<Stream>;
    chat(content: string, options?: LLMOptions): Promise<unknown>;
    user(content: string): void;
    system(content: string): void;
    assistant(content: string): void;
    abort(): void;
  }

  const LLAMAFILE: string;
  const OPENAI: string;
  const ANTHROPIC: string;
  const MISTRAL: string;
  const GOOGLE: string;
  const OLLAMA: string;
  const GROQ: string;
  const TOGETHER: string;
  const PERPLEXITY: string;
  const DEEPSEEK: string;

  function LLM(input: string | Message[], options?: LLMOptions): Promise<Stream>;
  
  namespace LLM {
    export { LLAMAFILE, OPENAI, ANTHROPIC, MISTRAL, GOOGLE, OLLAMA, GROQ, TOGETHER, PERPLEXITY, DEEPSEEK };
    export function serviceForModel(model: string): string;
    export function modelForService(service: string): string | null;
  }

  export default LLM;
} 