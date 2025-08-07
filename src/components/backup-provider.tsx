"use client";

import React, { useEffect } from 'react';
import { useAutoBackup } from '@/hooks/useAutoBackup';

/**
 * 备份提供者组件
 * 负责初始化自动备份功能并监听数据变化
 */
export function BackupProvider({ children }: { children: React.ReactNode }) {
  const { triggerBackupCheck } = useAutoBackup();

  useEffect(() => {
    // 监听自定义事件来触发备份检查
    const handleDataChange = () => {
      triggerBackupCheck();
    };

    // 创建自定义事件监听器
    window.addEventListener('promptforge:datachange', handleDataChange);
    
    return () => {
      window.removeEventListener('promptforge:datachange', handleDataChange);
    };
  }, [triggerBackupCheck]);

  return <>{children}</>;
}

/**
 * 触发数据变更事件的工具函数
 * 在数据发生变化时调用，通知备份系统
 */
export function triggerDataChangeEvent() {
  // 延迟触发，确保数据已经保存到localStorage
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('promptforge:datachange'));
  }, 100);
}