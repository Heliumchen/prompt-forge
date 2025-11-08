// 定义数据类型
export interface Prompt {
  id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  image_urls?: string[]; // 存储上传图片的URL
}

export interface Variable {
  name: string;
  value: string;
}

export interface Message {
  id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  image_urls?: string[]; // 存储上传图片的URL
}

export interface ModelConfig {
  provider: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_p?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
}

// 版本数据接口
export interface VersionData {
  prompts: Prompt[];
  messages: Message[];
  variables: Variable[];
  modelConfig?: ModelConfig;
}

// 版本信息接口
export interface Version {
  id: number;          // 版本ID，数字1,2,3...
  createdAt: string;   // 创建时间，ISO格式
  updatedAt: string;   // 最后修改时间，ISO格式
  description: string; // 版本备注
  data: VersionData;
}

// Test Set types (embedded in Project)
export interface TestResult {
  id: string;
  content: string;
  timestamp: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
  executionTime?: number;
}

export interface TestCase {
  id: string;
  variableValues: Record<string, string>;
  messages?: Array<{role: 'user' | 'assistant', content: string}>;
  results: Record<string, TestResult>; // version identifier -> result
}

export interface TestSetUIState {
  selectedComparisonVersion?: string;
}

export interface TestSet {
  uid: string;
  name: string;
  variableNames: string[];
  testCases: TestCase[];
  uiState?: TestSetUIState;
  createdAt: string;
  updatedAt: string;
}

// 修改后的Project接口
export interface Project {
  uid: string;
  name: string;
  icon?: string;
  currentVersion: number;  // 当前使用的版本ID
  versions: Version[];     // 所有版本历史
  testSet?: TestSet;       // 嵌入的测试集（可选）
}

import { dataManager } from './data-manager';

// 本地存储键名
const STORAGE_KEY = 'prompt-forge-projects';

// 项目验证器
const isValidProject = (data: unknown): data is Project => {
  const p = data as Record<string, unknown>;
  return typeof p?.uid === 'string' && 
         typeof p?.name === 'string' && 
         typeof p?.currentVersion === 'number' &&
         Array.isArray(p?.versions);
};

// 将旧格式项目转换为新格式
const migrateProject = (oldProject: Omit<Project, 'currentVersion' | 'versions'> & { prompts?: Prompt[], messages?: Message[], variables?: Variable[], modelConfig?: ModelConfig }): Project => {
  const now = dataManager.getCurrentTimestamp();
  const version: Version = {
    id: 1,
    createdAt: now,
    updatedAt: now,
    description: '',
    data: {
      prompts: oldProject.prompts || [],
      messages: oldProject.messages || [],
      variables: oldProject.variables || [],
      modelConfig: oldProject.modelConfig
    }
  };

  return {
    uid: oldProject.uid,
    name: oldProject.name,
    icon: (oldProject.icon && oldProject.icon !== 'Frame') ? oldProject.icon : '⚪',
    currentVersion: 1,
    versions: [version]
  };
};

// 创建新版本
export const createNewVersion = (project: Project, description: string): Project => {
  const now = dataManager.getCurrentTimestamp();
  const currentVersion = project.versions.find(v => v.id === project.currentVersion);
  if (!currentVersion) throw new Error('Current version not found');

  const newVersionNumber = project.versions.length + 1;
  const newVersion: Version = {
    id: newVersionNumber,
    createdAt: now,
    updatedAt: now,
    description,
    data: dataManager.deepClone(currentVersion.data)
  };

  return {
    ...project,
    currentVersion: newVersion.id,
    versions: [...project.versions, newVersion]
  };
};

// 切换版本
export const switchVersion = (project: Project, versionId: number): Project => {
  const versionExists = project.versions.some(v => v.id === versionId);
  if (!versionExists) throw new Error('Version not found');

  return {
    ...project,
    currentVersion: versionId
  };
};

// 更新当前版本数据
export const updateCurrentVersion = (project: Project, data: Partial<VersionData>): Project => {
  const now = dataManager.getCurrentTimestamp();
  const versionIndex = project.versions.findIndex(v => v.id === project.currentVersion);
  if (versionIndex === -1) throw new Error('Current version not found');

  const updatedVersions = [...project.versions];
  updatedVersions[versionIndex] = {
    ...updatedVersions[versionIndex],
    updatedAt: now,
    data: {
      ...updatedVersions[versionIndex].data,
      ...data
    }
  };

  return {
    ...project,
    versions: updatedVersions
  };
};

// 保存所有项目
export const saveProjects = async (projects: Project[]): Promise<void> => {
  // 验证项目数据
  const validation = dataManager.validateArray(projects, isValidProject);
  if (!validation.isValid) {
    console.warn('Project validation warnings:', validation.error);
  }

  try {
    await dataManager.safeSetItem(STORAGE_KEY, JSON.stringify(validation.data), { debounceMs: 200 });
  } catch (error) {
    console.error('保存项目失败:', error);
    throw error;
  }
};

// 简化的数据验证和修复函数
export const validateAndFixProject = (project: unknown): Project | null => {
  const validation = dataManager.validateData(project, (data): data is Project => {
    const proj = data as Record<string, unknown>;
    return !!(
      proj?.uid && typeof proj.uid === 'string' &&
      proj?.name && typeof proj.name === 'string' &&
      (Array.isArray(proj?.versions) || !('versions' in proj))
    );
  });

  if (!validation.isValid || !validation.data) {
    return null;
  }

  const proj = validation.data as Project;

  // 检查是否需要迁移旧格式
  if (!('versions' in proj) || !Array.isArray(proj.versions)) {
    return migrateProject(proj as unknown as Omit<Project, 'versions'> & { prompts?: Prompt[], messages?: Message[], variables?: Variable[], modelConfig?: ModelConfig });
  }

  // 简化版本修复 - 只修复基本结构
  const fixedVersions = proj.versions
    .filter(v => v && typeof v.id === 'number')
    .map(version => ({
      ...version,
      createdAt: version.createdAt || dataManager.getCurrentTimestamp(),
      updatedAt: version.updatedAt || dataManager.getCurrentTimestamp(),
      description: version.description || '',
      data: {
        prompts: Array.isArray(version.data?.prompts) ? version.data.prompts : [],
        messages: Array.isArray(version.data?.messages) ? version.data.messages : [],
        variables: Array.isArray(version.data?.variables) ? version.data.variables : [],
        modelConfig: version.data?.modelConfig || { provider: '', model: '' }
      }
    }));

  if (fixedVersions.length === 0) return null;

  // 确保currentVersion是有效的版本ID
  const validCurrentVersion = fixedVersions.find(v => v.id === proj.currentVersion) ? 
    proj.currentVersion : fixedVersions[0].id;

  return {
    uid: proj.uid,
    name: proj.name,
    icon: (proj.icon && proj.icon !== 'Frame') ? proj.icon : '⚪',
    currentVersion: validCurrentVersion,
    versions: fixedVersions,
    testSet: proj.testSet
  };
};

// 获取所有项目
export const getProjects = (): Project[] => {
  const data = dataManager.safeGetItem(STORAGE_KEY);
  if (!data) return [];
  
  const parseResult = dataManager.parseJSON<Project[]>(data, () => []);
  if (!parseResult.isValid) {
    console.error('解析项目数据失败:', parseResult.error);
    return [];
  }

  const validation = dataManager.validateArray(parseResult.data || [], isValidProject);
  
  // 修复损坏的项目
  const validatedProjects = (validation.data || [])
    .map(project => {
      try {
        return validateAndFixProject(project) || null;
      } catch {
        return null;
      }
    })
    .filter((project): project is Project => project !== null);

  // 如果有项目被修复或删除，异步保存修复后的数据
  if (parseResult.data && validatedProjects.length !== parseResult.data.length) {
    console.log(`数据验证完成：修复了 ${parseResult.data.length - validatedProjects.length} 个损坏的项目`);
    // 使用 setTimeout 避免阻塞当前操作
    setTimeout(() => saveProjects(validatedProjects), 0);
  }

  return validatedProjects;
};

// 根据UID获取特定项目
export const getProjectByUid = (uid: string): Project | undefined => {
  const projects = getProjects();
  return projects.find(project => project.uid === uid);
};

// 保存单个项目
export const saveProject = async (project: Project): Promise<void> => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.uid === project.uid);
  
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  await saveProjects(projects);
};

// 删除项目
export const deleteProject = async (uid: string): Promise<void> => {
  const projects = getProjects();
  const filteredProjects = projects.filter(project => project.uid !== uid);
  await saveProjects(filteredProjects);
};

// 清除所有项目数据
export const clearProjects = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// Variable management functions

/**
 * Extracts unique variable names from all prompts in the given array
 * @param prompts - Array of prompts to scan for variables
 * @returns Array of unique variable names found across all prompts
 */
export const extractVariablesFromPrompts = (prompts: Prompt[]): string[] => {
  if (!prompts || prompts.length === 0) {
    return [];
  }

  const variableNames = new Set<string>();
  const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  prompts.forEach(prompt => {
    if (prompt && prompt.content && typeof prompt.content === 'string') {
      let match;
      variablePattern.lastIndex = 0;
      
      while ((match = variablePattern.exec(prompt.content)) !== null) {
        variableNames.add(match[1]);
      }
    }
  });

  return Array.from(variableNames).sort();
};

/**
 * Merges detected variable names with existing variable values
 * Preserves existing variable values and adds new variables with empty values
 * @param detectedNames - Array of variable names detected in prompts
 * @param existingVariables - Array of existing Variable objects
 * @returns Array of merged Variable objects
 */
export const mergeVariables = (detectedNames: string[], existingVariables: Variable[]): Variable[] => {
  if (!detectedNames) {
    detectedNames = [];
  }
  if (!existingVariables) {
    existingVariables = [];
  }

  // Create a map of existing variables for quick lookup
  const existingMap = new Map<string, string>();
  existingVariables.forEach(variable => {
    if (variable && typeof variable.name === 'string') {
      existingMap.set(variable.name, variable.value || '');
    }
  });

  // Create merged variables array
  const mergedVariables: Variable[] = [];
  const processedNames = new Set<string>();

  // Add all detected variables (preserve existing values or use empty string)
  detectedNames.forEach(name => {
    if (name && typeof name === 'string' && !processedNames.has(name)) {
      mergedVariables.push({
        name,
        value: existingMap.get(name) || ''
      });
      processedNames.add(name);
    }
  });

  return mergedVariables.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Updates variables in the current version of a project while maintaining immutability
 * @param project - The project to update
 * @param variables - Array of Variable objects to set
 * @returns Updated project with new variables in current version
 */
export const updateVariables = (project: Project, variables: Variable[]): Project => {
  if (!project) {
    throw new Error('Project is required');
  }

  if (!variables) {
    variables = [];
  }

  // Validate variables array
  const validVariables = variables.filter(variable => 
    variable && 
    typeof variable.name === 'string' && 
    variable.name.length > 0 &&
    typeof variable.value === 'string'
  );

  return updateCurrentVersion(project, { variables: validVariables });
};

/**
 * Updates a single variable value in the current version of a project
 * @param project - The project to update
 * @param variableName - Name of the variable to update
 * @param variableValue - New value for the variable
 * @returns Updated project with the variable value changed
 */
export const updateVariable = (project: Project, variableName: string, variableValue: string): Project => {
  if (!project) {
    throw new Error('Project is required');
  }

  if (!variableName || typeof variableName !== 'string') {
    throw new Error('Variable name is required and must be a string');
  }

  if (typeof variableValue !== 'string') {
    variableValue = '';
  }

  const currentVersion = project.versions.find(v => v.id === project.currentVersion);
  if (!currentVersion) {
    throw new Error('Current version not found');
  }

  const existingVariables = currentVersion.data.variables || [];
  const updatedVariables = [...existingVariables];
  
  // Find existing variable or add new one
  const existingIndex = updatedVariables.findIndex(v => v.name === variableName);
  
  if (existingIndex >= 0) {
    // Update existing variable
    updatedVariables[existingIndex] = {
      ...updatedVariables[existingIndex],
      value: variableValue
    };
  } else {
    // Add new variable
    updatedVariables.push({
      name: variableName,
      value: variableValue
    });
  }

  return updateCurrentVersion(project, { variables: updatedVariables });
};

/**
 * Synchronizes variables in a project by detecting variables from prompts and merging with existing values
 * @param project - The project to synchronize variables for
 * @returns Updated project with synchronized variables
 */
export const synchronizeVariables = (project: Project): Project => {
  if (!project) {
    throw new Error('Project is required');
  }

  const currentVersion = project.versions.find(v => v.id === project.currentVersion);
  if (!currentVersion) {
    throw new Error('Current version not found');
  }

  const detectedNames = extractVariablesFromPrompts(currentVersion.data.prompts || []);
  const existingVariables = currentVersion.data.variables || [];
  const mergedVariables = mergeVariables(detectedNames, existingVariables);

  return updateCurrentVersion(project, { variables: mergedVariables });
};

// ========== TestSet Management Functions ==========

/**
 * Creates an empty test set for a project
 * @param projectName - Name of the project to base the test set name on
 * @returns New empty TestSet object
 */
export const createEmptyTestSet = (projectName: string): TestSet => {
  const now = dataManager.getCurrentTimestamp();
  // Dynamic import to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { generateUid } = require('./utils');

  return {
    uid: generateUid(),
    name: `${projectName} Tests`,
    variableNames: [],
    testCases: [],
    uiState: {},
    createdAt: now,
    updatedAt: now
  };
};

/**
 * Migrates legacy TestSet data structure to new embedded format
 * This function is called during data loading to ensure backward compatibility
 * @returns void
 */
export const migrateProjectsWithTestSets = (): void => {
  try {
    // Get legacy test sets if they exist
    const legacyTestSetsData = localStorage.getItem('prompt-forge-test-sets');
    if (!legacyTestSetsData) {
      console.log('[Migration] No legacy test sets found, skipping migration');
      return;
    }

    console.log('[Migration] Found legacy test sets data, starting migration...');

    // Get current projects
    const projects = getProjects();
    console.log(`[Migration] Found ${projects.length} projects`);

    // Parse legacy test sets
    const parseResult = dataManager.parseJSON<Array<{
      uid: string;
      name: string;
      associatedProjectUid: string;
      variableNames: string[];
      testCases: TestCase[];
      uiState?: TestSetUIState;
      createdAt: string;
      updatedAt: string;
    }>>(legacyTestSetsData, () => []);

    if (!parseResult.isValid || !parseResult.data) {
      console.warn('Failed to parse legacy test sets data');
      return;
    }

    const legacyTestSets = parseResult.data;

    // Group test sets by project
    const testSetsByProject = new Map<string, typeof legacyTestSets>();
    legacyTestSets.forEach(ts => {
      if (!testSetsByProject.has(ts.associatedProjectUid)) {
        testSetsByProject.set(ts.associatedProjectUid, []);
      }
      testSetsByProject.get(ts.associatedProjectUid)!.push(ts);
    });

    // Migrate projects
    const migratedProjects = projects.map(project => {
      // Skip if already has embedded test set
      if (project.testSet) {
        return project;
      }

      const projectTestSets = testSetsByProject.get(project.uid) || [];

      if (projectTestSets.length === 0) {
        // No test set found, create empty one
        return {
          ...project,
          testSet: createEmptyTestSet(project.name)
        };
      }

      // Take the first test set and remove associatedProjectUid
      const firstTestSet = projectTestSets[0];
      const { associatedProjectUid, ...cleanTestSet } = firstTestSet;

      if (projectTestSets.length > 1) {
        console.warn(`Project "${project.name}" has ${projectTestSets.length} test sets. Only keeping the first one: "${firstTestSet.name}"`);
      }

      return {
        ...project,
        testSet: cleanTestSet as TestSet
      };
    });

    // Count how many projects were actually migrated
    const migratedCount = migratedProjects.filter((p, i) => p !== projects[i]).length;
    console.log(`[Migration] Migrated ${migratedCount} projects from legacy test sets`);

    // Save migrated projects
    saveProjects(migratedProjects);

    // Remove legacy test sets from localStorage
    localStorage.removeItem('prompt-forge-test-sets');
    console.log('[Migration] Removed legacy test sets from localStorage');

    console.log(`[Migration] Completed: ${migratedProjects.length} projects now have test sets`);
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

/**
 * Updates the test set for a project
 * @param project - Project to update
 * @param testSet - New test set data
 * @returns Updated project
 */
export const updateProjectTestSet = (project: Project, testSet: TestSet): Project => {
  return {
    ...project,
    testSet: {
      ...testSet,
      updatedAt: dataManager.getCurrentTimestamp()
    }
  };
}; 