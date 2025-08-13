/**
 * 备份数据管理器
 * 负责数据的序列化、反序列化、冲突检测和解决
 */

import { Project, getProjects, saveProjects } from './storage';
import { TestSet, getTestSets, saveTestSets } from './testSetStorage';
import { GitHubSyncService } from './github-sync';

// 备份数据结构
export interface BackupData {
  version: string;
  timestamp: string;
  projects: Project[];
  testSets: TestSet[];
}

// 备份配置
export interface BackupConfig {
  githubToken: string;
  gistId?: string;
  autoBackup: boolean;
  backupInterval: number; // 分钟
}

// 同步状态
export interface SyncStatus {
  isEnabled: boolean;
  lastBackupTime: string | null;
  lastSyncTime: string | null;
  isInProgress: boolean;
  error: string | null;
}

// 冲突信息
export interface ConflictInfo {
  hasConflict: boolean;
  localTimestamp: string;
  remoteTimestamp: string;
  conflictDetails: {
    projects: {
      localOnly: Project[];
      remoteOnly: Project[];
      modified: { local: Project; remote: Project }[];
    };
    testSets: {
      localOnly: TestSet[];
      remoteOnly: TestSet[];
      modified: { local: TestSet; remote: TestSet }[];
    };
  };
}

// 存储键名
const BACKUP_CONFIG_KEY = 'prompt-forge-backup-config';
const SYNC_STATUS_KEY = 'prompt-forge-sync-status';
const LAST_BACKUP_DATA_KEY = 'prompt-forge-last-backup-data';

export class BackupManager {
  private syncService: GitHubSyncService | null = null;
  private syncStatusListeners: ((status: SyncStatus) => void)[] = [];
  private autoBackupTimer: NodeJS.Timeout | null = null;
  private readonly currentVersion = '1.0.0';

  constructor() {
    this.initializeFromConfig();
  }

  /**
   * 从配置初始化服务
   */
  private initializeFromConfig(): void {
    // 只在浏览器环境中初始化
    if (typeof window === 'undefined') return;
    
    const config = this.getConfig();
    if (config?.githubToken) {
      this.syncService = new GitHubSyncService({
        token: config.githubToken,
        gistId: config.gistId
      });
      
      if (config.autoBackup) {
        this.startAutoBackup(config.backupInterval);
      }
    }
  }

  /**
   * 配置GitHub同步
   */
  async configureGitHubSync(config: BackupConfig): Promise<void> {
    // 验证token
    const tempService = new GitHubSyncService({ token: config.githubToken });
    const hasPermission = await tempService.hasGistPermission();
    
    if (!hasPermission) {
      throw new Error('GitHub token does not have gist permission');
    }

    // 保存配置
    this.saveConfig(config);
    
    // 初始化服务
    this.syncService = new GitHubSyncService({
      token: config.githubToken,
      gistId: config.gistId
    });

    // 尝试发现现有备份
    if (!config.gistId) {
      const discoveredGistId = await this.syncService.discoverBackupGist();
      if (discoveredGistId) {
        config.gistId = discoveredGistId;
        this.saveConfig(config);
      }
    }

    // 启动自动备份
    if (config.autoBackup) {
      this.startAutoBackup(config.backupInterval);
    } else {
      this.stopAutoBackup();
    }

    this.updateSyncStatus({
      isEnabled: true,
      isInProgress: false,
      error: null
    });
  }

  /**
   * 禁用GitHub同步
   */
  disableGitHubSync(): void {
    this.syncService = null;
    this.stopAutoBackup();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BACKUP_CONFIG_KEY);
    }
    
    this.updateSyncStatus({
      isEnabled: false,
      lastBackupTime: null,
      lastSyncTime: null,
      isInProgress: false,
      error: null
    });
  }

  /**
   * 创建备份数据
   */
  createBackupData(): BackupData {
    const projects = getProjects();
    const testSets = getTestSets();
    
    return {
      version: this.currentVersion,
      timestamp: new Date().toISOString(),
      projects,
      testSets
    };
  }

  /**
   * 执行备份到GitHub
   */
  async backupToGitHub(): Promise<void> {
    if (!this.syncService) {
      throw new Error('GitHub sync not configured');
    }

    this.updateSyncStatus({ isInProgress: true, error: null });

    try {
      const backupData = this.createBackupData();
      const backupJson = JSON.stringify(backupData, null, 2);
      
      const gistData = await this.syncService.uploadBackup(backupJson);
      
      // 更新配置中的gistId
      const config = this.getConfig();
      if (config && gistData.id !== config.gistId) {
        config.gistId = gistData.id;
        this.saveConfig(config);
        this.syncService.setGistId(gistData.id);
      }
      
      // 保存本地备份副本用于冲突检测
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_BACKUP_DATA_KEY, backupJson);
      }
      
      this.updateSyncStatus({
        isInProgress: false,
        lastBackupTime: new Date().toISOString(),
        error: null
      });
    } catch (error) {
      this.updateSyncStatus({
        isInProgress: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 从GitHub恢复数据
   */
  async restoreFromGitHub(resolveConflicts: boolean = false): Promise<ConflictInfo> {
    if (!this.syncService) {
      throw new Error('GitHub sync not configured');
    }

    this.updateSyncStatus({ isInProgress: true, error: null });

    try {
      const backupJson = await this.syncService.getBackupData();
      const backupData: BackupData = JSON.parse(backupJson);
      
      // 检查版本兼容性
      if (!this.isVersionCompatible(backupData.version)) {
        throw new Error(`Backup version ${backupData.version} is not compatible with current version ${this.currentVersion}`);
      }
      
      // 检测冲突
      const conflictInfo = this.detectConflicts(backupData);
      
      if (conflictInfo.hasConflict && !resolveConflicts) {
        this.updateSyncStatus({ isInProgress: false, error: null });
        return conflictInfo;
      }
      
      // 恢复数据
      this.restoreData(backupData, resolveConflicts);
      
      // 保存本地备份副本
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_BACKUP_DATA_KEY, backupJson);
      }
      
      this.updateSyncStatus({
        isInProgress: false,
        lastSyncTime: new Date().toISOString(),
        error: null
      });
      
      return { hasConflict: false } as ConflictInfo;
    } catch (error) {
      this.updateSyncStatus({
        isInProgress: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 检测冲突
   */
  private detectConflicts(remoteData: BackupData): ConflictInfo {
    const localProjects = getProjects();
    const localTestSets = getTestSets();
    const lastBackupJson = typeof window !== 'undefined' ? localStorage.getItem(LAST_BACKUP_DATA_KEY) : null;
    const lastBackupData: BackupData | null = lastBackupJson ? JSON.parse(lastBackupJson) : null;
    
    const conflictDetails = {
      projects: {
        localOnly: [] as Project[],
        remoteOnly: [] as Project[],
        modified: [] as { local: Project; remote: Project }[]
      },
      testSets: {
        localOnly: [] as TestSet[],
        remoteOnly: [] as TestSet[],
        modified: [] as { local: TestSet; remote: TestSet }[]
      }
    };

    // 检测项目冲突
    const localProjectMap = new Map(localProjects.map(p => [p.uid, p]));
    const remoteProjectMap = new Map(remoteData.projects.map(p => [p.uid, p]));
    const lastBackupProjectMap = lastBackupData ? new Map(lastBackupData.projects.map(p => [p.uid, p])) : new Map();

    // 本地独有的项目
    for (const [uid, localProject] of localProjectMap) {
      if (!remoteProjectMap.has(uid)) {
        conflictDetails.projects.localOnly.push(localProject);
      }
    }

    // 远程独有的项目
    for (const [uid, remoteProject] of remoteProjectMap) {
      if (!localProjectMap.has(uid)) {
        conflictDetails.projects.remoteOnly.push(remoteProject);
      }
    }

    // 修改冲突的项目
    for (const [uid, localProject] of localProjectMap) {
      const remoteProject = remoteProjectMap.get(uid);
      if (remoteProject) {
        const lastBackupProject = lastBackupProjectMap.get(uid);
        const localModified = !lastBackupProject || JSON.stringify(localProject) !== JSON.stringify(lastBackupProject);
        const remoteModified = !lastBackupProject || JSON.stringify(remoteProject) !== JSON.stringify(lastBackupProject);
        
        if (localModified && remoteModified && JSON.stringify(localProject) !== JSON.stringify(remoteProject)) {
          conflictDetails.projects.modified.push({ local: localProject, remote: remoteProject });
        }
      }
    }

    // 检测测试集冲突（类似逻辑）
    const localTestSetMap = new Map(localTestSets.map(ts => [ts.uid, ts]));
    const remoteTestSetMap = new Map(remoteData.testSets.map(ts => [ts.uid, ts]));
    const lastBackupTestSetMap = lastBackupData ? new Map(lastBackupData.testSets.map(ts => [ts.uid, ts])) : new Map();

    for (const [uid, localTestSet] of localTestSetMap) {
      if (!remoteTestSetMap.has(uid)) {
        conflictDetails.testSets.localOnly.push(localTestSet);
      }
    }

    for (const [uid, remoteTestSet] of remoteTestSetMap) {
      if (!localTestSetMap.has(uid)) {
        conflictDetails.testSets.remoteOnly.push(remoteTestSet);
      }
    }

    for (const [uid, localTestSet] of localTestSetMap) {
      const remoteTestSet = remoteTestSetMap.get(uid);
      if (remoteTestSet) {
        const lastBackupTestSet = lastBackupTestSetMap.get(uid);
        const localModified = !lastBackupTestSet || JSON.stringify(localTestSet) !== JSON.stringify(lastBackupTestSet);
        const remoteModified = !lastBackupTestSet || JSON.stringify(remoteTestSet) !== JSON.stringify(lastBackupTestSet);
        
        if (localModified && remoteModified && JSON.stringify(localTestSet) !== JSON.stringify(remoteTestSet)) {
          conflictDetails.testSets.modified.push({ local: localTestSet, remote: remoteTestSet });
        }
      }
    }

    const hasConflict = 
      conflictDetails.projects.localOnly.length > 0 ||
      conflictDetails.projects.remoteOnly.length > 0 ||
      conflictDetails.projects.modified.length > 0 ||
      conflictDetails.testSets.localOnly.length > 0 ||
      conflictDetails.testSets.remoteOnly.length > 0 ||
      conflictDetails.testSets.modified.length > 0;

    return {
      hasConflict,
      localTimestamp: lastBackupData?.timestamp || new Date().toISOString(),
      remoteTimestamp: remoteData.timestamp,
      conflictDetails
    };
  }

  /**
   * 恢复数据
   * @param backupData 备份数据
   * @param mergeConflicts true=合并数据保留本地独有项, false=完全替换本地数据
   */
  private restoreData(backupData: BackupData, mergeConflicts: boolean): void {
    if (mergeConflicts) {
      // 合并策略：保留所有数据，对于重复的UID使用远程版本
      const localProjects = getProjects();
      const localTestSets = getTestSets();
      
      const mergedProjects = [...backupData.projects];
      const remoteProjectUids = new Set(backupData.projects.map(p => p.uid));
      
      // 添加本地独有的项目
      for (const localProject of localProjects) {
        if (!remoteProjectUids.has(localProject.uid)) {
          mergedProjects.push(localProject);
        }
      }
      
      const mergedTestSets = [...backupData.testSets];
      const remoteTestSetUids = new Set(backupData.testSets.map(ts => ts.uid));
      
      // 添加本地独有的测试集
      for (const localTestSet of localTestSets) {
        if (!remoteTestSetUids.has(localTestSet.uid)) {
          mergedTestSets.push(localTestSet);
        }
      }
      
      console.log(`Merging data: ${mergedProjects.length} projects, ${mergedTestSets.length} test sets`);
      // Note: saveProjects and saveTestSets are now async, but we don't await here to avoid blocking
      // The save operations will complete in the background
      saveProjects(mergedProjects).catch(console.error);
      saveTestSets(mergedTestSets).catch(console.error);
    } else {
      // 完全替换本地数据
      console.log(`Replacing local data with backup: ${backupData.projects.length} projects, ${backupData.testSets.length} test sets`);
      // Note: saveProjects and saveTestSets are now async, but we don't await here to avoid blocking
      // The save operations will complete in the background
      saveProjects(backupData.projects).catch(console.error);
      saveTestSets(backupData.testSets).catch(console.error);
    }
  }

  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(backupVersion: string): boolean {
    // 简单的版本检查，可以根据需要扩展
    const [backupMajor] = backupVersion.split('.').map(Number);
    const [currentMajor] = this.currentVersion.split('.').map(Number);
    
    return backupMajor === currentMajor;
  }

  /**
   * 启动自动备份
   */
  private startAutoBackup(intervalMinutes: number): void {
    this.stopAutoBackup();
    
    this.autoBackupTimer = setInterval(async () => {
      try {
        await this.backupToGitHub();
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 停止自动备份
   */
  private stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
  }

  /**
   * 获取配置
   */
  getConfig(): BackupConfig | null {
    // 只在浏览器环境中访问localStorage
    if (typeof window === 'undefined') return null;
    
    try {
      const configJson = localStorage.getItem(BACKUP_CONFIG_KEY);
      return configJson ? JSON.parse(configJson) : null;
    } catch (error) {
      console.error('Error reading backup config:', error);
      return null;
    }
  }

  /**
   * 保存配置
   */
  private saveConfig(config: BackupConfig): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    if (typeof window === 'undefined') {
      return {
        isEnabled: false,
        lastBackupTime: null,
        lastSyncTime: null,
        isInProgress: false,
        error: null
      };
    }
    
    try {
      const statusJson = localStorage.getItem(SYNC_STATUS_KEY);
      return statusJson ? JSON.parse(statusJson) : {
        isEnabled: false,
        lastBackupTime: null,
        lastSyncTime: null,
        isInProgress: false,
        error: null
      };
    } catch (error) {
      console.error('Error reading sync status:', error);
      return {
        isEnabled: false,
        lastBackupTime: null,
        lastSyncTime: null,
        isInProgress: false,
        error: null
      };
    }
  }

  /**
   * 更新同步状态
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    if (typeof window === 'undefined') return;
    
    const currentStatus = this.getSyncStatus();
    const newStatus = { ...currentStatus, ...updates };
    
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(newStatus));
    
    // 通知监听器
    this.syncStatusListeners.forEach(listener => listener(newStatus));
  }

  /**
   * 添加同步状态监听器
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusListeners.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const index = this.syncStatusListeners.indexOf(callback);
      if (index > -1) {
        this.syncStatusListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取GitHub服务实例（用于UI）
   */
  getGitHubService(): GitHubSyncService | null {
    return this.syncService;
  }

  /**
   * 检查是否配置了GitHub同步
   */
  isConfigured(): boolean {
    return this.syncService !== null;
  }

  /**
   * 导出本地数据（不通过GitHub）
   */
  exportLocalData(): BackupData {
    return this.createBackupData();
  }

  /**
   * 导入本地数据（不通过GitHub）
   */
  importLocalData(backupData: BackupData, mergeConflicts: boolean = false): void {
    if (!this.isVersionCompatible(backupData.version)) {
      throw new Error(`Backup version ${backupData.version} is not compatible with current version ${this.currentVersion}`);
    }
    
    this.restoreData(backupData, mergeConflicts);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopAutoBackup();
    this.syncStatusListeners.length = 0;
  }
}

// 全局单例实例
let backupManagerInstance: BackupManager | null = null;

export const getBackupManager = (): BackupManager => {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager();
  }
  return backupManagerInstance;
};