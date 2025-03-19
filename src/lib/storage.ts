// 定义数据类型
export interface Prompt {
  id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Variable {
  name: string;
  value: string;
}

export interface Message {
  id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelConfig {
  provider: string;
  model: string;
}

export interface Project {
  uid: string;
  name: string;
  icon?: string; // 图标名称，用于侧边栏显示
  prompts: Prompt[];
  messages: Message[];
  variables: Variable[];
  modelConfig?: ModelConfig; // 模型配置
}

// 本地存储键名
const STORAGE_KEY = 'prompt-forge-projects';

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
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取项目失败:', error);
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