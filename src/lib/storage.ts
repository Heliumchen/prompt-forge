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

// 修改后的Project接口
export interface Project {
  uid: string;
  name: string;
  icon?: string;
  currentVersion: number;  // 当前使用的版本ID
  versions: Version[];     // 所有版本历史
}

// 本地存储键名
const STORAGE_KEY = 'prompt-forge-projects';

// 将旧格式项目转换为新格式
const migrateProject = (oldProject: Omit<Project, 'currentVersion' | 'versions'> & { prompts?: Prompt[], messages?: Message[], variables?: Variable[], modelConfig?: ModelConfig }): Project => {
  const now = new Date().toISOString();
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
    icon: oldProject.icon,
    currentVersion: 1,
    versions: [version]
  };
};

// 创建新版本
export const createNewVersion = (project: Project, description: string): Project => {
  const now = new Date().toISOString();
  const currentVersion = project.versions.find(v => v.id === project.currentVersion);
  if (!currentVersion) throw new Error('Current version not found');

  const newVersionNumber = project.versions.length + 1;
  const newVersion: Version = {
    id: newVersionNumber,
    createdAt: now,
    updatedAt: now,
    description,
    data: { ...currentVersion.data }
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
  const now = new Date().toISOString();
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
export const saveProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('保存项目失败:', error);
  }
};

// 数据验证和修复函数
const validateAndFixProject = (project: unknown): Project | null => {
  try {
    // 基本字段验证
    if (!project || typeof project !== 'object') return null;
    const proj = project as Record<string, unknown>;
    if (!proj.uid || typeof proj.uid !== 'string') return null;
    if (!proj.name || typeof proj.name !== 'string') return null;

    // 检查是否需要迁移旧格式
    if (!('versions' in proj)) {
      return migrateProject(proj as Omit<Project, 'versions'>);
    }

    if (!Array.isArray(proj.versions) || proj.versions.length === 0) return null;

    // 修复版本数据
    const fixedVersions = (proj.versions as unknown[]).map((version: unknown) => {
      if (!version || typeof version !== 'object') return null;
      
      // 确保版本ID是数字
      const ver = version as Record<string, unknown>;
      const versionId = typeof ver.id === 'number' ? ver.id : parseInt(String(ver.id), 10);
      if (isNaN(versionId)) return null;

      // 修复prompts和messages中的ID，确保它们是数字
      const versionData = (version as Record<string, unknown>).data as Record<string, unknown>;
      const fixedPrompts = Array.isArray(versionData?.prompts) ? 
        (versionData.prompts as unknown[]).map((prompt: unknown, index: number) => {
          const p = prompt as Record<string, unknown>;
          return {
            id: typeof p.id === 'number' && !isNaN(p.id) ? p.id : index + 1,
            role: (p.role as 'system' | 'user' | 'assistant') || 'user',
            content: (p.content as string) || '',
            image_urls: p.image_urls as string[] || undefined
          };
        }) : [];

      const fixedMessages = Array.isArray(versionData?.messages) ? 
        (versionData.messages as unknown[]).map((message: unknown, index: number) => {
          const m = message as Record<string, unknown>;
          return {
            id: typeof m.id === 'number' && !isNaN(m.id) ? m.id : index + 1,
            role: (m.role as 'system' | 'user' | 'assistant') || 'user',
            content: (m.content as string) || '',
            image_urls: m.image_urls as string[] || undefined
          };
        }) : [];

      const fixedVariables = Array.isArray(versionData?.variables) ? versionData.variables as Variable[] : [];

      return {
        ...version,
        id: versionId,
        createdAt: ver.createdAt as string || new Date().toISOString(),
        updatedAt: ver.updatedAt as string || new Date().toISOString(),
        description: ver.description as string || '',
        data: {
          ...versionData,
          prompts: fixedPrompts,
          messages: fixedMessages,
          variables: fixedVariables,
          modelConfig: (versionData?.modelConfig as ModelConfig) || { provider: '', model: '' }
        }
      };
    }).filter(v => v !== null) as Version[];

    if (fixedVersions.length === 0) return null;

    // 确保currentVersion是有效的版本ID
    const currentVersion = typeof proj.currentVersion === 'number' ? 
      proj.currentVersion : 
      parseInt(String(proj.currentVersion), 10);
    
    const validCurrentVersion = fixedVersions.find(v => v.id === currentVersion) ? 
      currentVersion : fixedVersions[0].id;

    return {
      uid: proj.uid as string,
      name: proj.name as string,
      icon: (proj.icon as string) || '📝',
      currentVersion: validCurrentVersion,
      versions: fixedVersions
    };
  } catch (error) {
    console.warn('项目数据修复失败:', error);
    return null;
  }
};

// 获取所有项目
export const getProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const rawProjects = JSON.parse(data);
    if (!Array.isArray(rawProjects)) return [];

    // 验证和修复每个项目
    const validatedProjects = rawProjects
      .map(validateAndFixProject)
      .filter(Boolean) as Project[];

    // 如果有项目被修复或删除，保存修复后的数据
    if (validatedProjects.length !== rawProjects.length) {
      console.log(`数据验证完成：修复了 ${rawProjects.length - validatedProjects.length} 个损坏的项目`);
      saveProjects(validatedProjects);
    }

    return validatedProjects;
  } catch (error) {
    console.error('加载项目失败:', error);
    return [];
  }
};

// 根据UID获取特定项目
export const getProjectByUid = (uid: string): Project | undefined => {
  const projects = getProjects();
  return projects.find(project => project.uid === uid);
};

// 保存单个项目
export const saveProject = (project: Project): void => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.uid === project.uid);
  
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  saveProjects(projects);
};

// 删除项目
export const deleteProject = (uid: string): void => {
  const projects = getProjects();
  const filteredProjects = projects.filter(project => project.uid !== uid);
  saveProjects(filteredProjects);
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