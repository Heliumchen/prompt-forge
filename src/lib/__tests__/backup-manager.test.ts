import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackupManager, getBackupManager } from '../backup-manager';
import { Project } from '../storage';
import { TestSet } from '../testSetStorage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch for GitHub API calls
global.fetch = vi.fn();

describe('BackupManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up global state
    vi.restoreAllMocks();
  });

  describe('创建备份数据', () => {
    it('should create backup data with projects and test sets', () => {
      const manager = new BackupManager();
      
      // Mock getProjects and getTestSets
      const mockProjects: Project[] = [{
        uid: 'project-1',
        name: 'Test Project',
        currentVersion: 1,
        versions: [{
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          description: 'Initial version',
          data: {
            prompts: [],
            messages: [],
            variables: []
          }
        }]
      }];

      const mockTestSets: TestSet[] = [{
        uid: 'testset-1',
        name: 'Test Set',
        associatedProjectUid: 'project-1',
        variableNames: ['var1'],
        testCases: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }];

      // Mock the storage functions
      vi.doMock('../storage', () => ({
        getProjects: () => mockProjects
      }));

      vi.doMock('../testSetStorage', () => ({
        getTestSets: () => mockTestSets
      }));

      const backupData = manager.createBackupData();

      expect(backupData.version).toBe('1.0.0');
      expect(backupData.timestamp).toBeDefined();
      expect(backupData.projects).toBeDefined();
      expect(backupData.testSets).toBeDefined();
    });
  });

  describe('数据导出导入', () => {
    it('should export and import local data', () => {
      const manager = new BackupManager();
      
      const mockBackupData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        projects: [],
        testSets: []
      };

      // Test export
      const exportedData = manager.exportLocalData();
      expect(exportedData.version).toBe('1.0.0');

      // Test import
      expect(() => {
        manager.importLocalData(mockBackupData, false);
      }).not.toThrow();
    });

    it('should reject incompatible backup versions', () => {
      const manager = new BackupManager();
      
      const incompatibleBackup = {
        version: '2.0.0', // Incompatible major version
        timestamp: '2024-01-01T00:00:00.000Z',
        projects: [],
        testSets: []
      };

      expect(() => {
        manager.importLocalData(incompatibleBackup, false);
      }).toThrow('not compatible');
    });
  });

  describe('配置管理', () => {
    it('should handle backup config correctly', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const manager = new BackupManager();
      
      // Should return null when no config exists
      expect(manager.getConfig()).toBeNull();
      
      // Should return false when not configured
      expect(manager.isConfigured()).toBeFalsy();
    });

    it('should return default sync status in browser environment', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const manager = new BackupManager();
      const status = manager.getSyncStatus();
      
      expect(status.isEnabled).toBeFalsy();
      expect(status.lastBackupTime).toBeNull();
      expect(status.lastSyncTime).toBeNull();
      expect(status.isInProgress).toBeFalsy();
      expect(status.error).toBeNull();
    });
  });

  describe('单例模式', () => {
    it('should return the same instance', () => {
      const manager1 = getBackupManager();
      const manager2 = getBackupManager();
      
      expect(manager1).toBe(manager2);
    });
  });

  describe('SSR兼容性', () => {
    it('should handle server environment gracefully', () => {
      // Mock server environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing server environment
      delete global.window;

      const manager = new BackupManager();
      
      // Should not throw in server environment
      expect(manager.getConfig()).toBeNull();
      expect(manager.getSyncStatus().isEnabled).toBeFalsy();
      
      // Restore window
      global.window = originalWindow;
    });
  });
});