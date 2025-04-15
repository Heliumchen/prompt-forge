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

// 获取所有项目
export const getProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const projects = JSON.parse(data);
    return projects.map((project: unknown) => {
      // 检查是否需要迁移
      if (typeof project === 'object' && project !== null && !('versions' in project)) {
        return migrateProject(project as Omit<Project, 'versions'>);
      }
      return project as Project;
    });
  } catch (error) {
    console.error('Error getting projects:', error);
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