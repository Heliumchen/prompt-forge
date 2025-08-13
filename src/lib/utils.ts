import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID - 使用 DataManager 的实现
export function generateUid(): string {
  return 'id_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
}
