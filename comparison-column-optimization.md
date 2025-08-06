# TestSet 对比列交互优化

## 优化内容

将TestSet的对比列配置从独立的控制区域移动到表头，提供更直观的交互体验。

## 主要变更

### 1. 移除独立的对比控制区域
- 删除了 `ComparisonControls` 组件的使用
- 简化了 `test-set-view.tsx` 的布局结构

### 2. 在表头集成对比列配置
- 在 `test-set-table.tsx` 的表头添加了对比列下拉选择器
- 下拉框包含 "None" 选项和所有可用版本
- 默认选择 "None"，此时对比列为空

### 3. 动态对比列生成
- 根据用户选择的版本动态创建对比列
- 自动过滤掉当前目标版本，避免重复对比
- 支持版本描述显示

## 用户体验改进

1. **更直观的配置方式**: 对比列的配置直接在表头进行，用户可以清楚地看到配置的位置和效果
2. **简化的界面**: 移除了额外的控制区域，界面更加简洁
3. **即时反馈**: 选择版本后立即显示对比列，无需额外的添加步骤

## 技术实现

### 核心逻辑
```typescript
// 动态创建对比列
const dynamicComparisonColumn: ComparisonColumn | null = comparisonVersion ? {
  id: `comparison-${comparisonVersion}`,
  versionId: comparisonVersion,
  versionIdentifier: `v${comparisonVersion}`,
  label: `#${comparisonVersion}${version.description ? ` - ${version.description}` : ''}`,
} : null;
```

### 表头集成
- 在表头添加了包含下拉选择器的对比列
- 使用 `Select` 组件提供版本选择
- 支持 "None" 选项来隐藏对比列

### 数据传递
- 将动态生成的对比列传递给 `TestCaseRow` 组件
- 保持了原有的结果显示逻辑

## 兼容性

- 保持了原有的 `ComparisonColumn` 接口
- `TestCaseRow` 组件无需修改
- 结果显示逻辑保持不变

这个优化提供了更直观、更简洁的对比列配置体验，符合用户的使用习惯。