# Export Buttons Migration

## 概述
将 Test Set 页面中的 Export JSON 和 Export CSV 按钮从主控制栏迁移到左侧边栏每个 Test Set 条目的三个点菜单中，使界面更加简洁清晰。

## 修改内容

### 1. 移除主控制栏中的导出按钮
**文件**: `src/components/test-set-controls.tsx`

- 移除了 Export JSON 和 Export CSV 按钮及其相关的 Tooltip
- 移除了 `handleExportResults` 和 `handleExportCSV` 函数
- 移除了不再使用的 `Download` 图标导入

### 2. 在左侧边栏菜单中添加导出选项
**文件**: `src/components/nav-test-sets.tsx`

- 在每个 Test Set 的三个点菜单中添加了两个新的菜单项：
  - Export JSON (使用 Download 图标)
  - Export CSV (使用 FileText 图标)
- 利用了已存在的 `handleExportJSON` 和 `handleExportCSV` 函数
- 在 Rename 和 Delete 之间添加了分隔符来组织菜单结构

## 菜单结构
现在每个 Test Set 的三个点菜单包含：
1. Rename
2. ---- (分隔符) ----
3. Export JSON
4. Export CSV  
5. ---- (分隔符) ----
6. Delete

## 功能保持不变
- Export JSON: 导出包含测试集数据和所有结果的 JSON 文件
- Export CSV: 导出包含测试用例和结果的 CSV 文件
- 所有导出功能的错误处理和成功提示保持不变

## 用户体验改进
- Test Set 主页面更加简洁，减少了按钮数量
- 导出功能更符合直觉，直接在对应的 Test Set 上操作
- 菜单结构清晰，功能分组合理