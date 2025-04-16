import { LLAMAFILE, OPENAI, ANTHROPIC, MISTRAL, GOOGLE, OLLAMA, PERPLEXITY } from "./services.js";
import SchemaConverter from "./jsonschema-to-gbnf.js";

export function serviceForModel(model) {
    model = model.toLowerCase();

    if (typeof model !== "string") { return null }

    if (model.indexOf("llamafile") === 0) {
        return LLAMAFILE;
    } else if (model.indexOf("gpt-") === 0 || model.indexOf("o1-") === 0) {
        return OPENAI;
    } else if (model.indexOf("claude-") === 0) {
        return ANTHROPIC;
    } else if (model.indexOf("gemini") === 0) {
        return GOOGLE;
    } else if (model.indexOf("mistral") === 0) {
        return MISTRAL;
    } else if (model.indexOf("-sonar-") !== -1 && model.indexOf("-online") !== -1) {
        return PERPLEXITY;
    } else if (model.indexOf("llama2") === 0) {
        return OLLAMA;
    } else if (model.indexOf("deepseek") === 0) {
        return DEEPSEEK;
    }

    return null;
}

export function jsonSchemaToBFNS(schema) {
    const converter = new SchemaConverter();
    converter.visit(schema, "");
    return converter.formatGrammar();
}

export async function* stream_response(response) {
    for await (const chunk of response.body) {

        let data = chunk.toString("utf-8");

        if (!data.includes("data: ")) { continue; }

        const lines = data.split("\n");
        for (let line of lines) {
            // remove data: if it exists
            if (!line.indexOf("data: ")) { line = line.slice(6); }
            line = line.trim();

            if (line.length == 0) continue;

            const obj = JSON.parse(line);
            yield obj.content;
        }
    }
}

export async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const IMAGE_CACHE_PREFIX = "prompt_forge_img_cache_";
const DEFAULT_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
const MAX_CACHE_ITEMS = 10; // Maximum number of images to cache

/**
 * Fetches an image from a URL, converts it to a Base64 data URL, and caches the result in localStorage.
 * Designed for browser environments.
 * @param {string} imageUrl The URL of the image to fetch.
 * @param {object} [options] Optional settings.
 * @param {number} [options.cacheTTL=3600000] Cache time-to-live in milliseconds (default: 1 hour).
 * @param {number} [options.maxCacheItems=50] Maximum number of items in the cache.
 * @returns {Promise<string>} A promise that resolves with the Base64 data URL (e.g., "data:image/jpeg;base64,...").
 * @throws {Error} If fetching or conversion fails.
 */
export async function imageUrlToBase64(imageUrl, options = {}) {
    if (typeof window === 'undefined' || !window.localStorage) {
        console.warn("localStorage is not available. Image caching is disabled.");
        // Fallback or error? For now, proceed without cache if localStorage is unavailable.
         return fetchAndConvertToBase64(imageUrl);
    }

    const cacheTTL = options.cacheTTL || DEFAULT_CACHE_TTL;
    const maxItems = options.maxCacheItems || MAX_CACHE_ITEMS;
    const cacheKey = IMAGE_CACHE_PREFIX + imageUrl;

    try {
        // 1. Check cache
        const cachedItem = localStorage.getItem(cacheKey);
        if (cachedItem) {
            const { base64, timestamp } = JSON.parse(cachedItem);
            if (Date.now() - timestamp < cacheTTL) {
                // Cache hit and valid
                return base64;
            } else {
                // Cache expired
                localStorage.removeItem(cacheKey);
            }
        }

        // 2. Fetch and convert if not cached or expired
        const base64DataUrl = await fetchAndConvertToBase64(imageUrl);

        // 3. Manage cache size before adding
        manageCacheSize(maxItems);

        // 4. Store in cache
        const newItem = { base64: base64DataUrl, timestamp: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(newItem));

        return base64DataUrl;

    } catch (error) {
        console.error(`Error processing image URL ${imageUrl}:`, error);
        // Optionally remove from cache if fetching failed after being expired
        localStorage.removeItem(cacheKey);
        throw error; // Re-throw the error to be handled by the caller
    }
}

// Helper function to fetch and convert image
async function fetchAndConvertToBase64(imageUrl) {
     const response = await fetch(imageUrl);
     if (!response.ok) {
         throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
     }
     const blob = await response.blob();

     return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onloadend = () => resolve(reader.result);
         reader.onerror = (error) => reject(new Error(`Failed to read image blob: ${error}`));
         reader.readAsDataURL(blob);
     });
}


// Helper function to manage cache size (simple LRU based on timestamp)
function manageCacheSize(maxItems) {
     if (typeof window === 'undefined' || !window.localStorage) return;

    const keys = Object.keys(localStorage)
        .filter(key => key.startsWith(IMAGE_CACHE_PREFIX));

    if (keys.length >= maxItems) {
        let oldestKey = null;
        let oldestTimestamp = Infinity;

        keys.forEach(key => {
            try {
                const item = JSON.parse(localStorage.getItem(key));
                if (item && item.timestamp < oldestTimestamp) {
                    oldestTimestamp = item.timestamp;
                    oldestKey = key;
                }
            } catch {
                // Invalid item in cache, remove it
                localStorage.removeItem(key);
            }
        });

        if (oldestKey) {
            localStorage.removeItem(oldestKey);
        }
    }
}