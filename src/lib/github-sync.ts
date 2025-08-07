/**
 * GitHub Gist同步服务
 * 用于将用户数据备份到GitHub Gist并从Gist恢复数据
 */

export interface GistFile {
  filename: string;
  content: string;
  type?: string;
}

export interface GistData {
  id: string;
  url: string;
  files: Record<string, {
    filename: string;
    type: string;
    language: string;
    raw_url: string;
    size: number;
    content?: string;
  }>;
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string;
}

export interface CreateGistRequest {
  description: string;
  public: boolean;
  files: Record<string, { content: string }>;
}

export interface UpdateGistRequest {
  description?: string;
  files: Record<string, { content: string }>;
}

export interface GitHubSyncConfig {
  token: string;
  gistId?: string;
}

export class GitHubSyncService {
  private token: string;
  private gistId: string | null = null;
  private readonly baseUrl = 'https://api.github.com';
  private readonly gistDescription = 'Prompt Forge Data Backup';
  private readonly dataFileName = 'prompt-forge-backup.json';

  constructor(config: GitHubSyncConfig) {
    this.token = config.token;
    this.gistId = config.gistId || null;
  }

  /**
   * 设置Gist ID
   */
  setGistId(gistId: string): void {
    this.gistId = gistId;
  }

  /**
   * 获取当前Gist ID
   */
  getGistId(): string | null {
    return this.gistId;
  }

  /**
   * 创建新的Gist
   */
  async createGist(data: string): Promise<GistData> {
    const requestBody: CreateGistRequest = {
      description: this.gistDescription,
      public: false, // 私有Gist
      files: {
        [this.dataFileName]: {
          content: data
        }
      }
    };

    const response = await this.makeRequest('POST', '/gists', requestBody);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Gist: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const gistData: GistData = await response.json();
    this.gistId = gistData.id;
    
    return gistData;
  }

  /**
   * 更新现有Gist
   */
  async updateGist(data: string, gistId?: string): Promise<GistData> {
    const targetGistId = gistId || this.gistId;
    
    if (!targetGistId) {
      throw new Error('No Gist ID provided for update');
    }

    const requestBody: UpdateGistRequest = {
      files: {
        [this.dataFileName]: {
          content: data
        }
      }
    };

    const response = await this.makeRequest('PATCH', `/gists/${targetGistId}`, requestBody);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update Gist: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
  }

  /**
   * 获取Gist数据
   */
  async getGist(gistId?: string): Promise<GistData> {
    const targetGistId = gistId || this.gistId;
    
    if (!targetGistId) {
      throw new Error('No Gist ID provided for retrieval');
    }

    const response = await this.makeRequest('GET', `/gists/${targetGistId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Gist not found. It may have been deleted or the ID is incorrect.');
      }
      const errorText = await response.text();
      throw new Error(`Failed to get Gist: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
  }

  /**
   * 获取Gist中的备份数据内容
   */
  async getBackupData(gistId?: string): Promise<string> {
    const gist = await this.getGist(gistId);
    const file = gist.files[this.dataFileName];
    
    if (!file) {
      throw new Error(`Backup file '${this.dataFileName}' not found in Gist`);
    }

    // 如果content不存在，需要从raw_url获取
    if (!file.content && file.raw_url) {
      const response = await fetch(file.raw_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch backup data from raw URL: ${response.status}`);
      }
      return await response.text();
    }

    return file.content || '';
  }

  /**
   * 上传或更新备份数据
   */
  async uploadBackup(data: string): Promise<GistData> {
    if (this.gistId) {
      // 尝试更新现有Gist
      try {
        return await this.updateGist(data);
      } catch (error) {
        // 如果Gist不存在（可能被删除），创建新的
        if (error instanceof Error && error.message.includes('404')) {
          console.log('Existing Gist not found, creating new one');
          this.gistId = null;
          return await this.createGist(data);
        }
        throw error;
      }
    } else {
      // 创建新Gist
      return await this.createGist(data);
    }
  }

  /**
   * 验证GitHub token是否有效
   */
  async validateToken(): Promise<{ valid: boolean; user?: string; scopes?: string[] }> {
    try {
      const response = await this.makeRequest('GET', '/user');
      
      if (!response.ok) {
        return { valid: false };
      }

      const userData = await response.json();
      const scopes = response.headers.get('X-OAuth-Scopes')?.split(', ') || [];
      
      return {
        valid: true,
        user: userData.login,
        scopes
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false };
    }
  }

  /**
   * 检查token是否有gist权限
   */
  async hasGistPermission(): Promise<boolean> {
    const validation = await this.validateToken();
    return validation.valid && (validation.scopes?.includes('gist') || false);
  }

  /**
   * 删除Gist（谨慎使用）
   */
  async deleteGist(gistId?: string): Promise<void> {
    const targetGistId = gistId || this.gistId;
    
    if (!targetGistId) {
      throw new Error('No Gist ID provided for deletion');
    }

    const response = await this.makeRequest('DELETE', `/gists/${targetGistId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete Gist: ${response.status} ${response.statusText}\n${errorText}`);
    }

    if (targetGistId === this.gistId) {
      this.gistId = null;
    }
  }

  /**
   * 获取用户的所有Gist（用于查找现有备份）
   */
  async listUserGists(): Promise<GistData[]> {
    const response = await this.makeRequest('GET', '/gists');
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list Gists: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const gists: GistData[] = await response.json();
    
    // 过滤出Prompt Forge的备份Gist
    return gists.filter(gist => 
      gist.description === this.gistDescription &&
      gist.files[this.dataFileName]
    );
  }

  /**
   * 自动发现现有的备份Gist
   */
  async discoverBackupGist(): Promise<string | null> {
    try {
      const backupGists = await this.listUserGists();
      
      if (backupGists.length > 0) {
        // 返回最近更新的备份Gist
        const latestGist = backupGists.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];
        
        this.gistId = latestGist.id;
        return latestGist.id;
      }
      
      return null;
    } catch (error) {
      console.error('Error discovering backup Gist:', error);
      return null;
    }
  }

  /**
   * 发送HTTP请求的通用方法
   */
  private async makeRequest(
    method: string, 
    endpoint: string, 
    body?: unknown
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Prompt-Forge-Backup-Client'
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * 获取API使用情况（调试用）
   */
  async getApiRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  }> {
    const response = await this.makeRequest('GET', '/rate_limit');
    
    if (!response.ok) {
      throw new Error(`Failed to get rate limit: ${response.status}`);
    }

    const data = await response.json();
    return data.rate;
  }
}