"use client"

import { Project } from "@/lib/storage";
import { useProjects } from "@/contexts/ProjectContext";
import { useState } from "react";
import { toast } from "sonner";
import { Save, MoreHorizontal, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface VersionSelectProps {
  project: Project;
}

export function VersionSelect({ project }: VersionSelectProps) {
  const { createNewVersion, switchToVersion, updateProject } = useProjects();
  const [isVersionInfoDialogOpen, setIsVersionInfoDialogOpen] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  
  // 获取当前版本
  const currentVersion = project.versions.find(v => v.id === project.currentVersion);

  // 直接创建新版本
  const handleCreateNewVersion = () => {
    if (project) {
      createNewVersion(project.uid, '');
      toast.success("New version #" + (project.versions.length + 1) + " created");
    }
  };

  // 处理版本切换
  const handleVersionChange = (versionId: string) => {
    if (project) {
      switchToVersion(project.uid, parseInt(versionId, 10));
      toast.success("Switched to #" + versionId);
    }
  };

  // 打开版本信息对话框
  const handleOpenVersionInfo = () => {
    if (currentVersion) {
      setEditedDescription(currentVersion.description);
      setIsVersionInfoDialogOpen(true);
    }
  };

  // 更新版本描述
  const handleUpdateDescription = () => {
    if (project && currentVersion) {
      const updatedVersions = project.versions.map(version => {
        if (version.id === project.currentVersion) {
          return { ...version, description: editedDescription.trim() };
        }
        return version;
      });
      
      const updatedProject = { ...project, versions: updatedVersions };
      updateProject(updatedProject);
      setIsVersionInfoDialogOpen(false);
      toast.success("Version description updated");
    }
  };

  // 删除当前版本
  const handleDeleteVersion = () => {
    if (project && currentVersion && project.currentVersion !== 1) {
      const updatedVersions = project.versions.filter(version => version.id !== project.currentVersion);
      
      // 找到剩余版本中ID最大的版本
      const newCurrentVersion = updatedVersions.reduce(
        (maxId, version) => Math.max(maxId, version.id), 
        0
      );
      
      const updatedProject = { 
        ...project, 
        versions: updatedVersions,
        currentVersion: newCurrentVersion // 切换到剩余版本中ID最大的版本
      };
      
      updateProject(updatedProject);
      setIsVersionInfoDialogOpen(false);
      toast.success("Version deleted");
    } else if (project.currentVersion === 1) {
      toast.error("Cannot delete version #1");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={String(project.currentVersion)}
        onValueChange={handleVersionChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Version" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {project.versions
              .slice()
              .sort((a, b) => b.id - a.id)
              .map(version => (
              <SelectItem key={version.id} value={String(version.id)}>
                #{version.id}{version.description ? ` - ${version.description}` : ''}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" onClick={handleCreateNewVersion}>
              <Save />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Create New Version</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={isVersionInfoDialogOpen} onOpenChange={setIsVersionInfoDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleOpenVersionInfo}>
            <MoreHorizontal />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version Information</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="version-number">Version Number</Label>
              <div className="text-sm py-2">#{currentVersion?.id}</div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="created-date">Created Date</Label>
              <div className="text-sm py-2">
                {currentVersion ? format(new Date(currentVersion.createdAt), 'yyyy-MM-dd HH:mm:ss') : ''}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="updated-date">Updated Date</Label>
              <div className="text-sm py-2">
                {currentVersion ? format(new Date(currentVersion.updatedAt), 'yyyy-MM-dd HH:mm:ss') : ''}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Version Description</Label>
              <Input
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Enter version description..."
              />
            </div>
            
            <div className="flex justify-between">
              <Button onClick={handleUpdateDescription}>
                Update
              </Button>
              
              {project.currentVersion !== 1 && (
                <Button variant="destructive" onClick={handleDeleteVersion}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Version
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
