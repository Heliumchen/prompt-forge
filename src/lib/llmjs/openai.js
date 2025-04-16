import { OpenAI as OpenAIClient } from "openai";
import { imageUrlToBase64 } from "./utils.js";

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

    // 异步处理 messages 包含 image_urls 的情况
    const processedMessagesPromises = messages.map(async (message) => {
        if (message.image_urls && Array.isArray(message.image_urls) && message.image_urls.length > 0) {
            const imageContentPromises = message.image_urls.map(async (url) => {
                try {
                    // Call the utility function to get base64 data URL
                    const base64DataUrl = await imageUrlToBase64(url);
                    return {
                        type: "image_url",
                        image_url: { url: base64DataUrl } // Use the base64 data URL
                    };
                } catch (error) {
                    // Log error and return null for failed images
                    console.error(`Skipping image due to error processing URL ${url}:`, error);
                    return null;
                }
            });

            // Wait for all image conversions for this message
            const imageContents = (await Promise.all(imageContentPromises)).filter(content => content !== null); // Filter out nulls (errors)

            // Construct the content array
            const content = [];
            if (message.content) { // Add text part if it exists
                content.push({ type: "text", text: message.content });
            }

            // Add successfully processed images
            content.push(...imageContents);

            // If content is empty (no text and all images failed), return null to filter out this message
            if (content.length === 0) {
                 console.warn(`Message has no content after image processing failures:`, message);
                 return null;
            }
             // If only text remains (all images failed), return the simplified text message structure
             if (content.length === 1 && content[0].type === "text" && imageContents.length === 0) {
                 return { role: message.role, content: content[0].text };
             }


            return { role: message.role, content }; // Return message with mixed content
        }

        // Keep messages that don't need image processing as they are
        // (Assuming text-only messages have content as string,
        // and already processed/complex messages have content as array)
        if (typeof message.content === 'string' || Array.isArray(message.content)) {
             return message;
         }

         // Warn about unexpected format and return it as is (or could throw an error)
         console.warn("Unexpected message format encountered, passing through:", message);
         return message;
    });

    // Wait for all message processing promises and filter out nulls (failed messages)
    const processedMessages = (await Promise.all(processedMessagesPromises)).filter(msg => msg !== null);

    // Check if all messages failed processing
    if (processedMessages.length === 0 && messages.length > 0) {
        throw new Error("All messages failed processing (likely due to image fetching/conversion errors).");
    }
    // Check if messages array is empty before sending
    if (processedMessages.length === 0) {
        throw new Error("No valid messages remaining to send after processing.");
    }


    // 构建OpenAI选项 (using the processed messages)
    const openaiOptions = { model, messages: processedMessages };
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
        // Ensure it's the correct object structure expected by OpenAI
        if (typeof response_format === 'object' && response_format !== null && response_format.type) {
             openaiOptions.response_format = response_format;
             if (response_format.type === 'json_object') {
                 isJSONFormat = true;
             }
        } else {
             console.warn("Invalid response_format provided, expected an object like { type: 'json_object' } or { type: 'text' }.");
             // Decide if you want to throw an error or ignore it. Ignoring for now.
        }

    }

    // Schema 和 Tools 互斥检查
    if (schema && tools) {
        throw new Error("Cannot specify both schema and tools");
    }
    
    // Schema 处理 (now correctly sets isJSONFormat if schema is provided)
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
            // Check if the response object and controller exist before aborting
            if (response && response.controller && typeof response.controller.abort === 'function') {
                 response.controller.abort();
                 console.log("OpenAI request aborted by eventEmitter.");
                 // Decide if throwing an error here is appropriate or if the caller handles the abort event
                 // throw new Error("Request aborted"); // Maybe not throw here, let caller handle
            } else {
                 console.warn("Could not abort OpenAI request: controller not available.");
            }
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