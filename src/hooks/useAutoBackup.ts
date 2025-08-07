import { useEffect, useRef, useCallback } from 'react';
import { getBackupManager } from '@/lib/backup-manager';

/**
 * 自动备份Hook
 * 监听localStorage变化，自动触发备份
 */
export function useAutoBackup() {
  const backupManager = getBackupManager();
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBackupDataRef = useRef<string | null>(null);

  // 防抖备份函数
  const debouncedBackup = useCallback(() => {
    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
    }

    backupTimeoutRef.current = setTimeout(async () => {
      const syncStatus = backupManager.getSyncStatus();
      
      // 检查是否配置了GitHub同步
      if (!syncStatus.isEnabled || syncStatus.isInProgress) {
        return;
      }

      try {
        // 检查数据是否实际发生变化
        const currentData = JSON.stringify(backupManager.exportLocalData());
        if (currentData === lastBackupDataRef.current) {
          return; // 数据没有变化，跳过备份
        }

        await backupManager.backupToGitHub();
        lastBackupDataRef.current = currentData;
        console.log('Auto backup completed');
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, 5 * 60 * 1000); // 5分钟延迟
  }, [backupManager]);

  // 监听localStorage变化
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // 只监听我们关心的存储键
      const watchedKeys = [
        'prompt-forge-projects',
        'prompt-forge-test-sets'
      ];

      if (event.key && watchedKeys.includes(event.key)) {
        console.log(`Storage changed: ${event.key}`);
        debouncedBackup();
      }
    };

    // 监听storage事件（跨标签页变化）
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
    };
  }, [debouncedBackup]);

  // 手动触发备份检查的函数
  const triggerBackupCheck = useCallback(() => {
    debouncedBackup();
  }, [debouncedBackup]);

  return {
    triggerBackupCheck
  };
}