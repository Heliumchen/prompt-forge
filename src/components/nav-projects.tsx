"use client";

import {
  FolderPen,
  MoreHorizontal,
  Trash2,
  Plus,
  FileText,
  Copy,
  Download,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useProjects } from "@/contexts/ProjectContext";
import { Project } from "@/lib/storage";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NavProjects() {
  const { isMobile } = useSidebar();
  const {
    projects,
    currentProject,
    setCurrentProject,
    addProject,
    deleteProject,
    updateProject,
  } = useProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectIcon, setNewProjectIcon] = useState("Frame");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameProjectName, setRenameProjectName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const handleProjectClick = (projectUid: string) => {
    const project = projects.find((p) => p.uid === projectUid);
    if (project) {
      setCurrentProject(project);
    }
  };

  const openRenameDialog = (projectUid: string) => {
    const project = projects.find((p) => p.uid === projectUid);
    if (project) {
      // 延迟打开dialog，确保dropdown先关闭
      setTimeout(() => {
        setProjectToRename(project);
        setRenameProjectName(project.name);
        setIsRenameDialogOpen(true);
      }, 100);
    }
  };

  const submitRenameProject = () => {
    if (projectToRename && renameProjectName.trim()) {
      const updatedProject = {
        ...projectToRename,
        name: renameProjectName.trim(),
      };

      // 先关闭对话框，然后更新项目
      setIsRenameDialogOpen(false);
      setProjectToRename(null);
      setRenameProjectName("");

      // 使用 setTimeout 确保对话框完全关闭后再更新项目
      setTimeout(() => {
        updateProject(updatedProject);
      }, 100);
    }
  };

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      addProject(newProjectName.trim(), newProjectIcon);
      setNewProjectName("");
      setNewProjectIcon("Frame");
      setIsDialogOpen(false);
    }
  };

  const handleDeleteProject = (uid: string) => {
    if (confirm("确定要删除此项目吗？")) {
      deleteProject(uid);
    }
  };

  const handleDuplicateProject = (projectUid: string) => {
    const project = projects.find((p) => p.uid === projectUid);
    if (project) {
      const { uid: _uid, name, ...projectData } = project;
      addProject(`${name} (Copy)`, project.icon, projectData);
    }
  };

  const handleExportProject = (projectUid: string) => {
    const project = projects.find((p) => p.uid === projectUid);
    if (project) {
      const projectData = JSON.stringify(project, null, 2);
      const blob = new Blob([projectData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/[<>:"/\\|?*]/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string);
        // 验证项目数据格式
        if (
          !projectData.name ||
          !projectData.versions ||
          !projectData.currentVersion ||
          !Array.isArray(projectData.versions) ||
          projectData.versions.length === 0
        ) {
          throw new Error("无效的项目数据格式或缺少版本信息");
        }
        // 验证第一个版本的数据结构
        const firstVersionData = projectData.versions[0]?.data;
        if (
          !firstVersionData ||
          !firstVersionData.prompts ||
          !firstVersionData.messages
        ) {
          throw new Error("无效的项目版本数据格式");
        }

        // 移除uid，让系统生成新的
        const { uid, ...projectWithoutUid } = projectData;
        addProject(projectData.name, projectData.icon, projectWithoutUid);
        setIsDialogOpen(false);
        setImportError(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : "导入失败");
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {projects.map((project) => {
            return (
              <SidebarMenuItem key={project.uid}>
                <SidebarMenuButton
                  onClick={() => handleProjectClick(project.uid)}
                  className={
                    currentProject?.uid === project.uid ? "bg-accent" : ""
                  }
                >
                  <FileText />
                  <span>{project.name}</span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem
                      onClick={() => openRenameDialog(project.uid)}
                    >
                      <FolderPen className="text-muted-foreground" />
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateProject(project.uid)}
                    >
                      <Copy className="text-muted-foreground" />
                      <span>Duplicate</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExportProject(project.uid)}
                    >
                      <Download className="text-muted-foreground" />
                      <span>Export</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteProject(project.uid)}
                    >
                      <Trash2 className="text-muted-foreground" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-muted-foreground text-xs"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus />
              <span>New Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project or import an existing project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-file">Import Project File (*.json)</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImportProject}
                className="cursor-pointer"
              />
              {importError && (
                <div className="text-sm text-red-500">{importError}</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProject}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRenameDialogOpen}
        onOpenChange={(open) => {
          setIsRenameDialogOpen(open);
          if (!open) {
            setProjectToRename(null);
            setRenameProjectName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription className="hidden">
              Rename Project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name">Project Name</Label>
              <Input
                id="rename-name"
                value={renameProjectName}
                onChange={(e) => setRenameProjectName(e.target.value)}
                placeholder="Enter new project name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={submitRenameProject}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
