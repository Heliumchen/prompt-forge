import debug from "debug";
const log = debug("llm.js:anthropic");

import fetch from "cross-fetch";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-sonnet-latest";

export default async function Anthropic(messages, options = {}) {
    let apiKey = null;
    if (typeof options.apikey === "string") {
        apiKey = options.apikey
    } else {
        apiKey = process.env.ANTHROPIC_API_KEY;
    }

    // no fallback, either empty apikey string or env, not both
    if (!apiKey) { throw new Error("No Anthropic API key provided") }

    if (!messages || messages.length === 0) { throw new Error("No messages provided") }
    if (!options.model) { options.model = MODEL }

    const isFunctionCall = typeof options.schema !== "undefined";
    if (isFunctionCall) {
        throw new Error(`Anthropic does not support function calls`);
    }

    let system = null;
    if (messages.length > 0 && messages[0].role == "system") {
        system = messages.shift().content;
    }
    if (!messages || messages.length === 0) { throw new Error("At least one message is required (except for system messages)") }

    const anthropicOptions = {
        messages,
        model: options.model,
        max_tokens: 4096,
    };

    if (system) {
        anthropicOptions.system = system;
    }

    if (typeof options.temperature !== "undefined") {
        anthropicOptions.temperature = options.temperature;
        if (anthropicOptions.temperature < 0) anthropicOptions.temperature = 0;
        if (anthropicOptions.temperature > 1) anthropicOptions.temperature = 1;
    }

    if (typeof options.max_tokens !== "undefined") {
        anthropicOptions.max_tokens = options.max_tokens;
    }

    if (options.stream) {
        anthropicOptions.stream = options.stream;
    }

    log(`sending with options ${JSON.stringify(anthropicOptions)}`);

    const signal = new AbortController();
    if (options.eventEmitter) {
        options.eventEmitter.on('abort', () => signal.abort());
    }

    const response = await fetch(options.endpoint || ENDPOINT, {
        method: "POST",
        headers: {
            "anthropic-version": options.anthropicVersion || "2023-06-01",
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(anthropicOptions),
        signal: signal.signal,
    });

    if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`) }

    if (options.stream) {
        return Anthropic.parseStream(response.body);
    }

    const data = await response.json();
    return data.content[0].text;
}

Anthropic.parseStream = async function* (response) {
    // Use TextDecoder to decode the text stream
    const decoder = new TextDecoder();
    let buffer = '';
    
    for await (const chunk of response) {
        // Convert binary data to text
        const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        buffer += text;
        
        // Properly handle SSE format (event: ... and data: ... format)
        const messages = buffer.split(/\r?\n\r?\n/);
        buffer = messages.pop() || '';
        
        for (const message of messages) {
            const lines = message.split(/\r?\n/);
            let dataLine = '';
            
            // Find the line starting with data:
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    dataLine = line.substring(5).trim();
                    break;
                }
            }
            
            if (dataLine) {
                try {
                    const json = JSON.parse(dataLine);
                    
                    if (json.type === "content_block_delta" && 
                        json.delta && 
                        json.delta.type === "text_delta" && 
                        json.delta.text) {
                        yield json.delta.text;
                    }
                } catch {
                    continue;
                }
            }
        }
    }
    
    // Process any remaining data
    if (buffer) {
        const lines = buffer.split(/\r?\n/);
        
        for (const line of lines) {
            if (line.startsWith('data:')) {
                try {
                    const json = JSON.parse(line.substring(5).trim());
                    if (json.type === "content_block_delta" && 
                        json.delta && 
                        json.delta.type === "text_delta" && 
                        json.delta.text) {
                        yield json.delta.text;
                    }
                } catch {
                    continue;
                }
            }
        }
    }
};

Anthropic.defaultModel = MODEL;
