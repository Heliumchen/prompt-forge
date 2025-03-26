"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getProjects, 
  saveProjects, 
  Project, 
  Prompt, 
  Message,
  createNewVersion as createNewVersionUtil,
  switchVersion as switchVersionUtil,
  updateCurrentVersion
} from '@/lib/storage';
import { generateUid } from '@/lib/utils';

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (name: string, icon?: string, projectData?: Partial<Project>) => void;
  updateProject: (project: Project) => void;
  deleteProject: (uid: string) => void;
  addPrompt: (projectUid: string) => void;
  updatePrompt: (projectUid: string, promptId: number, data: Partial<Prompt>) => void;
  deletePrompt: (projectUid: string, promptId: number) => void;
  addMessage: (projectUid: string, data?: Partial<Message>) => number;
  updateMessage: (projectUid: string, messageId: number, data: Partial<Message>) => void;
  deleteMessage: (projectUid: string, messageId: number) => void;
  clearMessages: (projectUid: string) => void;
  clearPrompts: (projectUid: string) => void;
  createNewVersion: (projectUid: string, description: string) => void;
  switchToVersion: (projectUid: string, versionId: number) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // 初始化加载数据
  useEffect(() => {
    const loadedProjects = getProjects();
    setProjects(loadedProjects);
    
    // 如果有项目，默认选择第一个
    if (loadedProjects.length > 0) {
      setCurrentProject(loadedProjects[0]);
    }
  }, []);

  // 保存数据到本地存储
  useEffect(() => {
    if (projects.length > 0) {
      saveProjects(projects);
    }
  }, [projects]);

  // 添加新项目
  const addProject = (name: string, icon?: string, projectData?: Partial<Project>) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      uid: generateUid(),
      name,
      icon,
      currentVersion: 1,
      versions: [{
        id: 1,
        createdAt: now,
        updatedAt: now,
        description: '',
        data: {
          prompts: projectData?.versions?.[0]?.data?.prompts || [{id: 1, role: 'system', content: ''}],
          messages: projectData?.versions?.[0]?.data?.messages || [],
          variables: projectData?.versions?.[0]?.data?.variables || [],
          modelConfig: projectData?.versions?.[0]?.data?.modelConfig
        }
      }]
    };
    
    setProjects(prev => [...prev, newProject]);
    setCurrentProject(newProject);
  };

  // 更新项目
  const updateProject = (updatedProject: Project) => {
    setProjects(prev => 
      prev.map(project => 
        project.uid === updatedProject.uid ? updatedProject : project
      )
    );
    
    if (currentProject?.uid === updatedProject.uid) {
      setCurrentProject(updatedProject);
    }
  };

  // 删除项目
  const deleteProject = (uid: string) => {
    setProjects(prev => prev.filter(project => project.uid !== uid));
    
    if (currentProject?.uid === uid) {
      const remainingProjects = projects.filter(project => project.uid !== uid);
      setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
    }
  };

  // 获取当前版本数据
  const getCurrentVersionData = (project: Project) => {
    const currentVersion = project.versions.find(v => v.id === project.currentVersion);
    if (!currentVersion) throw new Error('Current version not found');
    return currentVersion.data;
  };

  // 添加提示
  const addPrompt = (projectUid: string) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const currentData = getCurrentVersionData(project);
          const newId = currentData.prompts.length > 0 
            ? Math.max(...currentData.prompts.map(p => p.id)) + 1 
            : 1;
          
          const newPrompt: Prompt = {
            id: newId, 
            role: 'user', 
            content: ''
          };
          
          const updatedProject = updateCurrentVersion(project, {
            prompts: [...currentData.prompts, newPrompt]
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 更新提示
  const updatePrompt = (projectUid: string, promptId: number, data: Partial<Prompt>) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const currentData = getCurrentVersionData(project);
          const updatedPrompts = currentData.prompts.map(prompt => 
            prompt.id === promptId ? {...prompt, ...data} : prompt
          );
          
          const updatedProject = updateCurrentVersion(project, {
            prompts: updatedPrompts
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 删除提示
  const deletePrompt = (projectUid: string, promptId: number) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const currentData = getCurrentVersionData(project);
          const updatedPrompts = currentData.prompts.filter(prompt => prompt.id !== promptId);
          
          const updatedProject = updateCurrentVersion(project, {
            prompts: updatedPrompts
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 添加消息
  const addMessage = (projectUid: string, data?: Partial<Message>): number => {
    let newMessageId = 0;
    
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const currentData = getCurrentVersionData(project);
          const newId = currentData.messages.length > 0 
            ? Math.max(...currentData.messages.map(m => m.id)) + 1 
            : 1;
          
          newMessageId = newId;
          
          const newMessage: Message = {
            id: newId, 
            role: data?.role || 'user', 
            content: data?.content || ''
          };
          
          const updatedProject = updateCurrentVersion(project, {
            messages: [...currentData.messages, newMessage]
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
    
    return newMessageId;
  };

  // 更新消息
  const updateMessage = (projectUid: string, messageId: number, data: Partial<Message>) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const currentData = getCurrentVersionData(project);
          const updatedMessages = currentData.messages.map(message => 
            message.id === messageId ? {...message, ...data} : message
          );
          
          const updatedProject = updateCurrentVersion(project, {
            messages: updatedMessages
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 删除消息
  const deleteMessage = (projectUid: string, messageId: number) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const currentData = getCurrentVersionData(project);
          const updatedMessages = currentData.messages.filter(message => message.id !== messageId);
          
          const updatedProject = updateCurrentVersion(project, {
            messages: updatedMessages
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 清空消息
  const clearMessages = (projectUid: string) => {   
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const updatedProject = updateCurrentVersion(project, {
            messages: []
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 清空提示
  const clearPrompts = (projectUid: string) => {    
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const updatedProject = updateCurrentVersion(project, {
            prompts: []
          });
          
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 创建新版本
  const createNewVersion = (projectUid: string, description: string) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const updatedProject = createNewVersionUtil(project, description);
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          return updatedProject;
        }
        return project;
      })
    );
  };

  // 切换版本
  const switchToVersion = (projectUid: string, versionId: number) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.uid === projectUid) {
          const updatedProject = switchVersionUtil(project, versionId);
          if (currentProject?.uid === projectUid) {
            setCurrentProject(updatedProject);
          }
          return updatedProject;
        }
        return project;
      })
    );
  };

  const value = {
    projects,
    currentProject,
    setCurrentProject,
    addProject,
    updateProject,
    deleteProject,
    addPrompt,
    updatePrompt,
    deletePrompt,
    clearPrompts,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    createNewVersion,
    switchToVersion
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}; 