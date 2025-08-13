/**
 * 安全工具模块 - 用于API Key的混淆加密
 * 使用固定盐值和简单的可逆混淆算法来保护存储的API Key
 */

const SALT = 'PromptForge2024Security'; // 固定盐值
const VERSION = 'v1'; // 加密版本标识

/**
 * 将字符串转换为字节数组
 */
function stringToBytes(str: string): number[] {
  return Array.from(str, (char) => char.charCodeAt(0));
}

/**
 * 将字节数组转换为字符串
 */
function bytesToString(bytes: number[]): string {
  return String.fromCharCode(...bytes);
}

/**
 * XOR 加密/解密（对称操作）
 */
function xorCrypt(data: number[], key: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * 基于盐值生成密钥
 */
function generateKey(): number[] {
  const saltBytes = stringToBytes(SALT);
  // 简单的密钥扩展：重复盐值并添加索引
  const key: number[] = [];
  for (let i = 0; i < 256; i++) {
    key[i] = saltBytes[i % saltBytes.length] ^ (i % 256);
  }
  return key;
}

/**
 * 加密API Key
 * @param apiKey 原始API Key
 * @returns 加密后的字符串，包含版本标识
 */
export function encryptApiKey(apiKey: string): string {
  if (!apiKey || apiKey.trim() === '') {
    return '';
  }

  try {
    const key = generateKey();
    const dataBytes = stringToBytes(apiKey);
    const encryptedBytes = xorCrypt(dataBytes, key);
    
    // 转换为Base64并添加版本前缀
    const encryptedBase64 = btoa(bytesToString(encryptedBytes));
    return `${VERSION}:${encryptedBase64}`;
  } catch (error) {
    console.error('Error encrypting API key:', error);
    return apiKey; // 失败时返回原始值
  }
}

/**
 * 解密API Key
 * @param encryptedApiKey 加密的API Key字符串
 * @returns 解密后的API Key
 */
export function decryptApiKey(encryptedApiKey: string): string {
  if (!encryptedApiKey || encryptedApiKey.trim() === '') {
    return '';
  }

  // 如果没有版本前缀，视为未加密的原始数据
  if (!encryptedApiKey.startsWith('v1:')) {
    return encryptedApiKey;
  }

  try {
    // 提取加密数据部分
    const encryptedBase64 = encryptedApiKey.substring(3); // 移除 "v1:" 前缀
    
    const key = generateKey();
    const encryptedBytes = stringToBytes(atob(encryptedBase64));
    const decryptedBytes = xorCrypt(encryptedBytes, key);
    
    return bytesToString(decryptedBytes);
  } catch (error) {
    console.error('Error decrypting API key:', error);
    // 解密失败时返回原始值，保证向后兼容
    return encryptedApiKey;
  }
}

/**
 * 检查字符串是否为加密的API Key
 */
export function isEncryptedApiKey(value: string): boolean {
  return value.startsWith(`${VERSION}:`);
}

/**
 * 安全地获取API Key（自动处理加密/未加密情况）
 * @param storageKey localStorage中的键名
 * @param providerId API提供商ID（如 'OpenRouter'）
 * @returns 解密后的API Key
 */
export function getSecureApiKey(storageKey: string, providerId: string): string | null {
  try {
    const apiKeysStr = localStorage.getItem(storageKey);
    if (!apiKeysStr) {
      return null;
    }

    const apiKeys = JSON.parse(apiKeysStr);
    const encryptedKey = apiKeys[providerId];
    
    if (!encryptedKey) {
      return null;
    }

    return decryptApiKey(encryptedKey);
  } catch (error) {
    console.error('Error getting secure API key:', error);
    return null;
  }
}

/**
 * 安全地保存API Key（自动加密）
 * @param storageKey localStorage中的键名
 * @param providerId API提供商ID
 * @param apiKey 要保存的API Key
 */
export function setSecureApiKey(storageKey: string, providerId: string, apiKey: string): void {
  try {
    const apiKeysStr = localStorage.getItem(storageKey) || '{}';
    const apiKeys = JSON.parse(apiKeysStr);
    
    // 加密并保存
    apiKeys[providerId] = encryptApiKey(apiKey);
    
    localStorage.setItem(storageKey, JSON.stringify(apiKeys));
  } catch (error) {
    console.error('Error setting secure API key:', error);
    throw error;
  }
}

/**
 * 迁移现有的明文API Key到加密格式
 * @param storageKey localStorage中的键名
 * @returns 是否进行了迁移
 */
export function migrateApiKeys(storageKey: string): boolean {
  try {
    const apiKeysStr = localStorage.getItem(storageKey);
    if (!apiKeysStr) {
      return false;
    }

    const apiKeys = JSON.parse(apiKeysStr);
    let hasPlaintextKeys = false;

    // 检查并加密所有明文API Key
    for (const [providerId, key] of Object.entries(apiKeys)) {
      if (typeof key === 'string' && key && !isEncryptedApiKey(key)) {
        apiKeys[providerId] = encryptApiKey(key);
        hasPlaintextKeys = true;
      }
    }

    // 如果有明文密钥被加密，更新存储
    if (hasPlaintextKeys) {
      localStorage.setItem(storageKey, JSON.stringify(apiKeys));
      console.log('API keys have been migrated to encrypted format');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error migrating API keys:', error);
    return false;
  }
}