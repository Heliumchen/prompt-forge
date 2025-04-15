const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/[MODEL]:[ACTION]?key=[APIKEY]";
const MODEL = "gemini-2.0-flash-lite";

export default async function Google(messages, options = {}) {
    if (!messages || messages.length === 0) { throw new Error("No messages provided") }

    const model = options.model || MODEL;
    const apikey = options.apikey || process.env.GOOGLE_API_KEY;
    if (!apikey) { throw new Error("No Google API key provided") }

    const action = options.stream ? "streamGenerateContent" : "generateContent"

    const endpoint = ENDPOINT
        .replace("[MODEL]", model)
        .replace("[APIKEY]", apikey)
        .replace("[ACTION]", action);

    // 提取 system instruction
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    let systemInstruction = null;
    if (systemMessages.length > 0) {
        // 通常使用最后一条系统消息
        const lastSystemMessage = systemMessages[systemMessages.length - 1];
        systemInstruction = {
            parts: [{ text: lastSystemMessage.content }]
        };
    }

    // 使用 await Promise.all 等待 toGoogle 返回的 Promise 数组
    const contents = await Promise.all(toGoogle(otherMessages));
    const body = {
        contents: contents, // 使用解析后的 contents
        generationConfig: {},
    };
    
    // 添加 system_instruction (如果存在)
    if (systemInstruction) {
        body.system_instruction = systemInstruction;
    }


    if (typeof options.max_tokens === "number") { body.generationConfig.maxOutputTokens = options.max_tokens }
    if (typeof options.temperature === "number") { body.generationConfig.temperature = options.temperature }

    // log(`sending to Google endpoint with body ${JSON.stringify(body)}`);

    const signal = new AbortController();
    if (options.eventEmitter) {
        options.eventEmitter.on('abort', () => signal.abort());
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: signal.signal,
    });

    if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`) }

    if (options.stream) {
        return stream_response(response);
    } else {
        const data = await response.json();
        // console.log(data.candidates[0].content.parts[0].text);

        return data.candidates[0].content.parts[0].text;
    }
}


Google.defaultModel = MODEL;

// Google does not stream back JSON in a reasonable way
// very hacky :( but it works, Google will likely change this in the future and we'll fix it then
export async function* stream_response(response) {
    const textDecoder = new TextDecoder();
    let buffer = "";
    
    for await (const chunk of response.body) {
        let data = textDecoder.decode(chunk);
        buffer += data;
        
        // 清理开头的 [ 和 ,
        if (buffer.startsWith("[")) buffer = buffer.slice(1);
        if (buffer.startsWith(",")) buffer = buffer.slice(1);
        
        // 按正确的分隔符分割
        const parts = buffer.split(/}\r?\n,\r?\n{/);
        buffer = "";

        for (const part of parts) {
            try {
                let cleanPart = part.trim();
                // 清理结尾的 ]
                if (cleanPart.endsWith("]")) {
                    cleanPart = cleanPart.slice(0, -1);
                }
                // 确保JSON格式完整
                if (!cleanPart.startsWith("{")) cleanPart = "{" + cleanPart;
                if (!cleanPart.endsWith("}")) cleanPart = cleanPart + "}";
                
                const obj = JSON.parse(cleanPart);
                if (obj.candidates?.[0]?.content?.parts?.[0]?.text) {
                    yield obj.candidates[0].content.parts[0].text;
                }
            } catch {
                buffer += part;
            }
        }
    }

    // 处理剩余的buffer
    if (buffer.trim().length > 0) {
        try {
            let finalBuffer = buffer.trim();
            // 移除开头和结尾的方括号
            if (finalBuffer.startsWith("[")) finalBuffer = finalBuffer.slice(1);
            if (finalBuffer.endsWith("]")) finalBuffer = finalBuffer.slice(0, -1);
            
            // 尝试直接解析清理后的JSON
            const obj = JSON.parse(finalBuffer);
            if (obj.candidates?.[0]?.content?.parts?.[0]?.text) {
                yield obj.candidates[0].content.parts[0].text;
            }
        } catch (e) {
            // 如果解析失败，记录错误但不抛出异常
            console.error("无法解析最终的JSON数据，错误:", e.message);
            console.debug("问题数据:", buffer);
        }
    }
}

function toGoogleRole(role) {
    switch (role) {
        case "user":
        case "model":
            return role;
        case "assistant":
            // Google API 需要将 assistant 映射为 model
            return "model";
        // system role 在 Google 函数中单独处理，不应传递到这里
        // case "system":
        //     return "model"; 
        default:
            // 如果遇到未知的非 system role，抛出错误
            throw new Error(`unknown Google role ${role}`);
    }
}

// 将 toGoogle 声明为 async 函数
async function _createImagePart(url) {
    try {
        // console.log(`Fetching image from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch image from ${url}: ${response.statusText}`);
            return null; // 跳过无法获取的图片
        }
        let mimeType = response.headers.get("content-type");
        if (!mimeType || !mimeType.startsWith('image/')) {
            if (url.endsWith(".png")) mimeType = "image/png";
            else if (url.endsWith(".webp")) mimeType = "image/webp";
            else if (url.endsWith(".gif")) mimeType = "image/gif";
            else mimeType = "image/jpeg";
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        return {
            inline_data: {
                mime_type: mimeType,
                data: base64Data
            }
        };
    } catch (error) {
        console.error(`Error processing image URL ${url}:`, error);
        return null; // 出错时跳过此图片
    }
}

function toGoogle(messages) {
    return messages.map(async (message) => {
        const parts = [];
        if (message.image_urls && Array.isArray(message.image_urls) && message.image_urls.length > 0) {
            const imagePartsPromises = message.image_urls.map(_createImagePart); // 使用辅助函数
            const resolvedImageParts = await Promise.all(imagePartsPromises);
            parts.push(...resolvedImageParts.filter(part => part !== null));
        }

         if (message.content) {
             parts.push({ text: message.content });
         }

        return {
            role: toGoogleRole(message.role),
            parts: parts
        };
    });
}

