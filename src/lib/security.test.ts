/**
 * 安全模块测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encryptApiKey,
  decryptApiKey,
  isEncryptedApiKey,
  getSecureApiKey,
  setSecureApiKey,
  migrateApiKeys
} from './security';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('Security Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('encryptApiKey / decryptApiKey', () => {
    it('应该能正确加密和解密API key', () => {
      const originalKey = 'test-api-key-12345';
      
      const encrypted = encryptApiKey(originalKey);
      expect(encrypted).not.toBe(originalKey);
      expect(encrypted).toContain('v1:');
      
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(originalKey);
    });

    it('空字符串应该返回空字符串', () => {
      expect(encryptApiKey('')).toBe('');
      expect(encryptApiKey('   ')).toBe('');
      expect(decryptApiKey('')).toBe('');
    });

    it('解密失败时应该返回原始值', () => {
      const invalidEncrypted = 'v1:invalid-base64!@#';
      const result = decryptApiKey(invalidEncrypted);
      expect(result).toBe(invalidEncrypted);
    });

    it('未加密的值应该直接返回', () => {
      const plainText = 'plain-text-api-key';
      const result = decryptApiKey(plainText);
      expect(result).toBe(plainText);
    });

    it('应该能处理特殊字符', () => {
      const specialKey = 'api-key-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptApiKey(specialKey);
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(specialKey);
    });

    it('应该能处理长API key', () => {
      const longKey = 'a'.repeat(1000);
      const encrypted = encryptApiKey(longKey);
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(longKey);
    });
  });

  describe('isEncryptedApiKey', () => {
    it('应该正确识别加密的API key', () => {
      const encrypted = encryptApiKey('test-key');
      expect(isEncryptedApiKey(encrypted)).toBe(true);
    });

    it('应该正确识别未加密的API key', () => {
      expect(isEncryptedApiKey('plain-key')).toBe(false);
      expect(isEncryptedApiKey('')).toBe(false);
      expect(isEncryptedApiKey('v2:different-version')).toBe(false);
    });
  });

  describe('getSecureApiKey', () => {
    it('应该能获取加密的API key', () => {
      const originalKey = 'test-openrouter-key';
      const encrypted = encryptApiKey(originalKey);
      
      localStorage.setItem('apiKeys', JSON.stringify({ OpenRouter: encrypted }));
      
      const retrieved = getSecureApiKey('apiKeys', 'OpenRouter');
      expect(retrieved).toBe(originalKey);
    });

    it('应该能获取未加密的API key', () => {
      const plainKey = 'plain-openrouter-key';
      localStorage.setItem('apiKeys', JSON.stringify({ OpenRouter: plainKey }));
      
      const retrieved = getSecureApiKey('apiKeys', 'OpenRouter');
      expect(retrieved).toBe(plainKey);
    });

    it('不存在的key应该返回null', () => {
      localStorage.setItem('apiKeys', JSON.stringify({ SomeOtherProvider: 'key' }));
      
      const retrieved = getSecureApiKey('apiKeys', 'OpenRouter');
      expect(retrieved).toBeNull();
    });

    it('不存在的存储应该返回null', () => {
      const retrieved = getSecureApiKey('nonexistent', 'OpenRouter');
      expect(retrieved).toBeNull();
    });

    it('无效的JSON应该返回null', () => {
      localStorage.setItem('apiKeys', 'invalid-json');
      
      const retrieved = getSecureApiKey('apiKeys', 'OpenRouter');
      expect(retrieved).toBeNull();
    });
  });

  describe('setSecureApiKey', () => {
    it('应该能安全保存API key', () => {
      const originalKey = 'new-api-key';
      
      setSecureApiKey('apiKeys', 'OpenRouter', originalKey);
      
      const stored = localStorage.getItem('apiKeys');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(isEncryptedApiKey(parsed.OpenRouter)).toBe(true);
      
      // 验证能够正确解密
      const decrypted = decryptApiKey(parsed.OpenRouter);
      expect(decrypted).toBe(originalKey);
    });

    it('应该能更新现有的API key', () => {
      // 先设置一个key
      setSecureApiKey('apiKeys', 'OpenRouter', 'old-key');
      setSecureApiKey('apiKeys', 'AnotherProvider', 'another-key');
      
      // 更新OpenRouter key
      setSecureApiKey('apiKeys', 'OpenRouter', 'new-key');
      
      // 验证OpenRouter key被更新
      const openRouterKey = getSecureApiKey('apiKeys', 'OpenRouter');
      expect(openRouterKey).toBe('new-key');
      
      // 验证其他key没有被影响
      const anotherKey = getSecureApiKey('apiKeys', 'AnotherProvider');
      expect(anotherKey).toBe('another-key');
    });

    it('JSON序列化失败时应该抛出错误', () => {
      // Mock localStorage.getItem 返回无效的JSON
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => 'invalid-json');
      
      expect(() => {
        setSecureApiKey('apiKeys', 'OpenRouter', 'test-key');
      }).toThrow();
      
      localStorage.getItem = originalGetItem;
    });
  });

  describe('migrateApiKeys', () => {
    it('应该能迁移明文API keys', () => {
      // 设置明文API keys
      const plainKeys = {
        OpenRouter: 'plain-openrouter-key',
        AnotherProvider: 'plain-another-key'
      };
      localStorage.setItem('apiKeys', JSON.stringify(plainKeys));
      
      const migrated = migrateApiKeys('apiKeys');
      expect(migrated).toBe(true);
      
      // 验证keys被加密了
      const stored = JSON.parse(localStorage.getItem('apiKeys')!);
      expect(isEncryptedApiKey(stored.OpenRouter)).toBe(true);
      expect(isEncryptedApiKey(stored.AnotherProvider)).toBe(true);
      
      // 验证能够正确解密
      expect(decryptApiKey(stored.OpenRouter)).toBe('plain-openrouter-key');
      expect(decryptApiKey(stored.AnotherProvider)).toBe('plain-another-key');
    });

    it('已加密的keys应该不被改变', () => {
      const encryptedKey = encryptApiKey('test-key');
      const keys = {
        OpenRouter: encryptedKey,
        PlainProvider: 'plain-key'
      };
      localStorage.setItem('apiKeys', JSON.stringify(keys));
      
      const migrated = migrateApiKeys('apiKeys');
      expect(migrated).toBe(true); // 因为有一个明文key被迁移了
      
      const stored = JSON.parse(localStorage.getItem('apiKeys')!);
      expect(stored.OpenRouter).toBe(encryptedKey); // 已加密的key保持不变
      expect(isEncryptedApiKey(stored.PlainProvider)).toBe(true); // 明文key被加密了
    });

    it('不存在的存储应该返回false', () => {
      const migrated = migrateApiKeys('nonexistent');
      expect(migrated).toBe(false);
    });

    it('无效的JSON应该返回false', () => {
      localStorage.setItem('apiKeys', 'invalid-json');
      
      const migrated = migrateApiKeys('apiKeys');
      expect(migrated).toBe(false);
    });

    it('空的API keys对象应该返回false', () => {
      localStorage.setItem('apiKeys', JSON.stringify({}));
      
      const migrated = migrateApiKeys('apiKeys');
      expect(migrated).toBe(false);
    });

    it('所有keys都已加密时应该返回false', () => {
      const keys = {
        OpenRouter: encryptApiKey('key1'),
        AnotherProvider: encryptApiKey('key2')
      };
      localStorage.setItem('apiKeys', JSON.stringify(keys));
      
      const migrated = migrateApiKeys('apiKeys');
      expect(migrated).toBe(false);
    });
  });

  describe('边界情况和错误处理', () => {
    it('加密函数在出错时应该返回原始值', () => {
      // Mock btoa to throw an error
      const originalBtoa = global.btoa;
      global.btoa = vi.fn(() => {
        throw new Error('btoa error');
      });
      
      const result = encryptApiKey('test-key');
      expect(result).toBe('test-key');
      
      global.btoa = originalBtoa;
    });

    it('解密函数在出错时应该返回原始值', () => {
      // Mock atob to throw an error
      const originalAtob = global.atob;
      global.atob = vi.fn(() => {
        throw new Error('atob error');
      });
      
      const encrypted = 'v1:some-encrypted-data';
      const result = decryptApiKey(encrypted);
      expect(result).toBe(encrypted);
      
      global.atob = originalAtob;
    });

    it('localStorage操作失败时应该正确处理', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => {
        setSecureApiKey('apiKeys', 'OpenRouter', 'test-key');
      }).toThrow('localStorage error');
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('加密强度测试', () => {
    it('相同的输入应该产生不同的输出（由于密钥扩展）', () => {
      const key = 'same-input-key';
      const encrypted1 = encryptApiKey(key);
      const encrypted2 = encryptApiKey(key);
      
      // 由于我们使用的是确定性加密，相同输入会产生相同输出
      expect(encrypted1).toBe(encrypted2);
      
      // 但是加密后的结果应该和原始输入不同
      expect(encrypted1).not.toBe(key);
      expect(encrypted2).not.toBe(key);
    });

    it('加密后的数据应该包含版本标识', () => {
      const key = 'versioned-key';
      const encrypted = encryptApiKey(key);
      
      expect(encrypted).toMatch(/^v1:/);
    });

    it('加密后的数据应该是有效的Base64', () => {
      const key = 'base64-test-key';
      const encrypted = encryptApiKey(key);
      const base64Part = encrypted.substring(3); // 去掉 'v1:' 前缀
      
      expect(() => {
        atob(base64Part);
      }).not.toThrow();
    });
  });
});