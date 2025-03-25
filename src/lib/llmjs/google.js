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

    const body = {
        contents: toGoogle(messages),
        generationConfig: {},
    };


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
        console.log(data.candidates[0].content.parts[0].text);

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
            } catch (e) {
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
        case "system":
            return "model";
        default:
            throw new Error(`unknown Google role ${role}`);
    }
}
function toGoogle(messages) {
    return messages.map((message) => {
        return {
            role: toGoogleRole(message.role),
            parts: [{ text: message.content }]
        }
    });
}

