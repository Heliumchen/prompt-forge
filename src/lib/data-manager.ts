/**
 * 统一数据管理器
 * 提供通用的数据验证、序列化、错误处理功能
 */

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

export interface StorageOptions {
  validateOnRead?: boolean;
  retryCount?: number;
  debounceMs?: number;
}

export class DataManager {
  private static instance: DataManager | null = null;
  private saveOperations = new Map<string, NodeJS.Timeout>();

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * 安全的localStorage读取
   */
  safeGetItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return null;
    }
  }

  /**
   * 安全的localStorage写入（带防抖）
   */
  safeSetItem(key: string, value: string, options: StorageOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window object not available'));
        return;
      }

      const debounceMs = options.debounceMs || 100;
      
      // 清除之前的保存操作
      if (this.saveOperations.has(key)) {
        clearTimeout(this.saveOperations.get(key)!);
      }

      // 设置防抖保存
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(key, value);
          this.saveOperations.delete(key);
          resolve();
        } catch (error) {
          this.saveOperations.delete(key);
          console.error(`Error writing to localStorage (${key}):`, error);
          reject(error);
        }
      }, debounceMs);

      this.saveOperations.set(key, timeoutId);
    });
  }

  /**
   * 通用数据验证器
   */
  validateData<T>(
    data: unknown, 
    validator: (data: unknown) => data is T,
    fallback?: () => T
  ): ValidationResult<T> {
    try {
      if (validator(data)) {
        return { isValid: true, data };
      } else {
        const fallbackData = fallback?.();
        return {
          isValid: false,
          data: fallbackData,
          error: 'Data validation failed'
        };
      }
    } catch (error) {
      const fallbackData = fallback?.();
      return {
        isValid: false,
        data: fallbackData,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * 通用JSON解析
   */
  parseJSON<T>(jsonString: string, fallback?: () => T): ValidationResult<T> {
    try {
      const parsed = JSON.parse(jsonString);
      return { isValid: true, data: parsed };
    } catch (error) {
      const fallbackData = fallback?.();
      return {
        isValid: false,
        data: fallbackData,
        error: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 通用数组验证器
   */
  validateArray<T>(
    data: unknown,
    itemValidator: (item: unknown) => item is T
  ): ValidationResult<T[]> {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        data: [],
        error: 'Data is not an array'
      };
    }

    const validItems: T[] = [];
    const errors: string[] = [];

    data.forEach((item, index) => {
      if (itemValidator(item)) {
        validItems.push(item);
      } else {
        errors.push(`Invalid item at index ${index}`);
      }
    });

    if (errors.length > 0) {
      console.warn('Array validation warnings:', errors);
    }

    return {
      isValid: errors.length === 0,
      data: validItems,
      error: errors.length > 0 ? `${errors.length} invalid items found` : undefined
    };
  }

  /**
   * 深度克隆优化
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as T;
    }

    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * 生成唯一ID
   */
  generateUid(): string {
    return 'id_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }

  /**
   * 获取当前时间戳
   */
  getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 批量操作包装器
   */
  async batchOperation<T>(
    operations: (() => Promise<T>)[],
    maxConcurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 错误恢复机制
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 清除所有防抖操作
    for (const timeoutId of this.saveOperations.values()) {
      clearTimeout(timeoutId);
    }
    this.saveOperations.clear();
  }
}

// 导出单例实例
export const dataManager = DataManager.getInstance();