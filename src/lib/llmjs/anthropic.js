import fetch from "cross-fetch";
import { imageUrlToBase64 } from "./utils.js";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-sonnet-latest";
const ANTHROPIC_VERSION = "2023-06-01";

export default async function Anthropic(messages, options = {}) {
    let apiKey = null;
    if (typeof options.apikey === "string") {
        apiKey = options.apikey
    } else {
        apiKey = process.env.ANTHROPIC_API_KEY;
    }

    if (!apiKey) { throw new Error("No Anthropic API key provided") }

    if (!messages || messages.length === 0) { throw new Error("No messages provided") }
    const model = options.model || MODEL;
    const anthropicVersion = options.anthropicVersion || ANTHROPIC_VERSION;

    if (options.schema || options.tools || options.tool) {
        console.warn("Anthropic does not support schema/tools in the same way as OpenAI. Ignoring these options.");
    }

    let systemInstruction = null;
    if (messages.length > 0 && messages[0].role === "system") {
        if (typeof messages[0].content === 'string' && messages[0].content.trim() !== '') {
            systemInstruction = messages.shift().content.trim();
        } else {
            console.warn("System message found but content is empty or not a string. Ignoring.");
            messages.shift();
        }
    }

    if (!messages || messages.length === 0) { throw new Error("At least one message is required (except for system messages)") }

    const processedMessagesPromises = messages.map(async (message) => {
        if (!message || !message.role || (typeof message.content !== 'string' && !Array.isArray(message.image_urls))) {
            console.warn("Skipping invalid message structure:", message);
            return null;
        }

        const role = message.role === 'assistant' ? 'assistant' : 'user';
        let content = [];
        let hasContent = false;

        if (message.image_urls && Array.isArray(message.image_urls) && message.image_urls.length > 0) {
            const imagePartPromises = message.image_urls
                .filter(url => typeof url === 'string' && url.trim() !== '')
                .map(async (url) => {
                    try {
                        const base64DataUrl = await imageUrlToBase64(url);
                        const match = base64DataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.*)$/);
                        if (!match) {
                            console.error(`Failed to parse Base64 Data URL for ${url}`);
                            return null;
                        }
                        return {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: match[1],
                                data: match[2],
                            },
                        };
                    } catch (error) {
                        console.error(`Error processing image URL ${url} for Anthropic:`, error);
                        return null;
                    }
                });

            const resolvedImageParts = (await Promise.all(imagePartPromises)).filter(part => part !== null);
            if (resolvedImageParts.length > 0) {
                content.push(...resolvedImageParts);
                hasContent = true;
            }
        }

        if (typeof message.content === 'string' && message.content.trim() !== '') {
            content.push({ type: "text", text: message.content.trim() });
            hasContent = true;
        }

        if (!hasContent) {
            console.warn(`Skipping message with role '${message.role}' as it resulted in empty content.`);
            return null;
        }

        if (content.length === 1 && content[0].type === "text") {
            return { role, content: content[0].text };
        } else {
            return { role, content };
        }
    });

    const processedMessages = (await Promise.all(processedMessagesPromises)).filter(msg => msg !== null);

    if (processedMessages.length === 0) {
        throw new Error("No valid messages remaining after processing.");
    }

    const anthropicOptions = {
        model: model,
        messages: processedMessages,
        max_tokens: options.max_tokens || 4096,
    };

    if (systemInstruction) {
        anthropicOptions.system = systemInstruction;
    }

    if (typeof options.temperature === "number") {
        anthropicOptions.temperature = Math.max(0.0, Math.min(options.temperature, 1.0));
    }

    if (options.top_p !== undefined) anthropicOptions.top_p = options.top_p;
    if (options.top_k !== undefined) anthropicOptions.top_k = options.top_k;
    if (Array.isArray(options.stop) && options.stop.length > 0) {
        anthropicOptions.stop_sequences = options.stop;
    } else if (typeof options.stop === 'string' && options.stop.trim() !== '') {
        anthropicOptions.stop_sequences = [options.stop];
    }

    if (options.stream) {
        anthropicOptions.stream = true;
    }

    const signal = new AbortController();
    if (options.eventEmitter) {
        options.eventEmitter.on('abort', () => signal.abort());
    }

    let response;
    try {
        response = await fetch(options.endpoint || ENDPOINT, {
            method: "POST",
            headers: {
                "anthropic-version": anthropicVersion,
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
                "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify(anthropicOptions),
            signal: signal.signal,
        });

        if (!response.ok) {
            let errorBody = await response.text();
            try { errorBody = JSON.parse(errorBody); } catch { /* Keep as text */ }
            console.error("Anthropic API Error Response:", errorBody);
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error("Anthropic request aborted.");
        }
        console.error("Fetch error calling Anthropic API:", error);
        throw error;
    }

    if (options.stream) {
        return Anthropic.parseStream(response.body);
    } else {
        try {
            const data = await response.json();
            if (!data || !data.content || !Array.isArray(data.content) || data.content.length === 0) {
                console.error("Invalid response structure from Anthropic (no content):", data);
                throw new Error("Invalid response structure from Anthropic: No content found.");
            }
            const textBlock = data.content.find(block => block.type === 'text');
            if (!textBlock || typeof textBlock.text !== 'string') {
                console.warn("Anthropic response content does not contain expected text block:", data.content);
                return "";
            }
            return textBlock.text.trim();
        } catch (e) {
            console.error("Error parsing Anthropic JSON response:", e);
            throw new Error(`Failed to parse JSON response from Anthropic: ${e.message}`);
        }
    }
}

Anthropic.parseStream = async function* (responseBody) {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        const reader = responseBody.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                const line = buffer.substring(0, newlineIndex).trim();
                buffer = buffer.substring(newlineIndex + 1);

                if (line.startsWith('data:')) {
                    const dataString = line.substring(5).trim();
                    if (dataString === '[DONE]') {
                        break;
                    }
                    try {
                        const json = JSON.parse(dataString);

                        if (json.type === "message_start") {
                        } else if (json.type === "content_block_start" && json.content_block?.type === "text") {
                        } else if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
                            if (json.delta.text) {
                                yield json.delta.text;
                            }
                        } else if (json.type === "content_block_stop") {
                        } else if (json.type === "message_delta") {
                        } else if (json.type === "message_stop") {
                            reader.cancel();
                            return;
                        } else if (json.type === "ping") {
                        } else if (json.type === "error") {
                            console.error("Anthropic stream error event:", json.error);
                            throw new Error(`Anthropic stream error: ${json.error?.type} - ${json.error?.message}`);
                        }

                    } catch {
                    }
                }
            }
        }

        buffer += decoder.decode(undefined, { stream: false });
        if (buffer.startsWith('data:')) {
            const dataString = buffer.substring(5).trim();
            try {
                const json = JSON.parse(dataString);
                if (json.type === "content_block_delta" && json.delta?.type === "text_delta" && json.delta.text) {
                    yield json.delta.text;
                }
            } catch {
            }
        }

    } catch (error) {
        console.error("Error reading or decoding Anthropic stream:", error);
        throw error;
    }
};

Anthropic.defaultModel = MODEL;
