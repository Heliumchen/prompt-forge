import { OpenAI as OpenAIClient } from "openai";

const MODEL = "gpt-4o-mini";

export default async function OpenAI(messages, options = {}, LLM = null) {
    // 参数验证和初始化
    if (!messages || messages.length === 0) {
        throw new Error("No messages provided");
    }
    
    const { 
        apikey, 
        model = MODEL, 
        dangerouslyAllowBrowser = false,
        stream,
        temperature,
        max_tokens,
        seed,
        response_format,
        schema,
        tool,
        tools,
        tool_choice,
        eventEmitter
    } = options;

    // API密钥处理
    const apiKey = (typeof apikey === "string") ? apikey : process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("No OpenAI API key provided");
    }

    // 初始化客户端
    const openai = new OpenAIClient({ apiKey, dangerouslyAllowBrowser });

    // 构建OpenAI选项
    const openaiOptions = { model, messages };
    let isJSONFormat = false;
    
    // 网络选项
    const networkOptions = stream ? { responseType: "stream" } : {};

    // 流式处理
    if (stream) {
        openaiOptions.stream = true;
    }

    // 温度参数处理
    if (typeof temperature !== "undefined") {
        openaiOptions.temperature = Math.max(0, Math.min(temperature, 2));
    }

    // 其他基本参数
    if (typeof max_tokens !== "undefined") openaiOptions.max_tokens = max_tokens;
    if (typeof seed !== "undefined") openaiOptions.seed = seed;

    // 响应格式处理
    if (typeof response_format !== "undefined") {
        isJSONFormat = true;
        openaiOptions.response_format = response_format;
    }

    // Schema 和 Tools 互斥检查
    if (schema && tools) {
        throw new Error("Cannot specify both schema and tools");
    }
    
    // Schema 处理
    if (schema) {
        openaiOptions.response_format = { "type": "json_object" };
        isJSONFormat = true;
    }

    // Tools 处理
    if (tool) {
        openaiOptions.tools = [{ "type": "function", "function": tool }];
        if (tool_choice) openaiOptions.tool_choice = tool_choice;
    } else if (tools) {
        openaiOptions.tools = tools;
        if (tool_choice) openaiOptions.tool_choice = tool_choice;
    }

    // 发送请求
    const response = await openai.chat.completions.create(openaiOptions, networkOptions);
    
    // 事件监听器处理
    if (eventEmitter) {
        eventEmitter.on('abort', () => {
            response.controller.abort();
            throw new Error("Request aborted");
        });
    }

    // 处理工具调用响应
    if (openaiOptions.tools && response.choices[0].message.tool_calls) {
        try {
            return await OpenAI.parseTool(response, LLM);
        } catch (e) {
            // 直接抛出错误
            throw e;
        }
    }

    // 处理流式响应
    if (stream) {
        return OpenAI.parseStream(response);
    }

    // 处理普通响应
    const message = response.choices[0].message;
    if (!message) throw new Error(`Invalid message from OpenAI`);

    const content = message.content.trim();
    return isJSONFormat ? OpenAI.parseJSONFormat(content) : content;
}

OpenAI.parseJSONFormat = function (content) {
    try {
        return JSON.parse(content);
    } catch {
        throw new Error(`Expected JSON response from OpenAI, got ${content}`);
    }
};

OpenAI.parseStream = async function* (response) {
    for await (const chunk of response) {
        if (chunk.choices[0].finish_reason) break;
        if (chunk.choices[0].delta.tool_calls) {
            yield chunk.choices[0].delta.tool_calls[0].function.arguments;
        }
        if (chunk.choices[0].delta.content) {
            yield chunk.choices[0].delta.content;
        }
    }
};

OpenAI.parseTool = async function (response, LLM) {
    // 验证响应
    if (!response) throw new Error(`Invalid response from OpenAI`);
    if (!response.choices || response.choices.length === 0) throw new Error(`Invalid choices from OpenAI`);

    const message = response.choices[0].message;
    if (!message) throw new Error(`Invalid message from OpenAI`);

    // 更新消息历史
    if (LLM && LLM.messages) {
        LLM.messages.push(message);
    }

    // 验证工具调用
    if (!message.tool_calls) throw new Error(`Invalid tool calls from OpenAI`);
    
    // 处理工具调用
    const responses = [];
    for (const tool of message.tool_calls) {
        if (!tool.function) throw new Error(`Invalid function from OpenAI`);
        if (!tool.function.arguments) throw new Error(`Expected function call response from OpenAI`);
        responses.push(tool);
    }

    // 返回结果
    if (responses.length === 0) throw new Error(`No valid responses from OpenAI`);
    return responses.length === 1 ? responses[0] : responses;
};

OpenAI.defaultModel = MODEL;