"use client";

import {
  FolderPen,
  MoreHorizontal,
  Trash2,
  Plus,
  Copy,
  Download,
  GripVertical,
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
import { EmojiPicker } from "@/components/emoji-picker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable project item component
function SortableProjectItem({
  project,
  isMobile,
  onProjectClick,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
  onIconChange,
}: {
  project: Project;
  isMobile: boolean;
  onProjectClick: (uid: string) => void;
  onRename: (uid: string) => void;
  onDuplicate: (uid: string) => void;
  onExport: (uid: string) => void;
  onDelete: (uid: string) => void;
  onIconChange: (uid: string, icon: string) => void;
}) {
  const { currentProject } = useProjects();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <div className="flex items-center w-full">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <EmojiPicker
          value={project.icon && project.icon !== "Frame" ? project.icon : "⚪"}
          onChange={(emoji) => onIconChange(project.uid, emoji)}
        >
          <div
            className="hover:scale-110 transition-transform cursor-pointer"
            role="button"
            tabIndex={0}
          >
            {project.icon && project.icon !== "Frame" ? project.icon : "⚪"}
          </div>
        </EmojiPicker>
        <SidebarMenuButton
          onClick={() => onProjectClick(project.uid)}
          className={`flex-1 ${currentProject?.uid === project.uid ? "bg-accent" : ""}`}
        >
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate">{project.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {(project.testSet?.testCases?.length ?? 0) > 0 && (
                <> {project.testSet?.testCases?.length} Testcases</>
              )}
            </span>
          </div>
        </SidebarMenuButton>
      </div>
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
          <DropdownMenuItem onClick={() => onRename(project.uid)}>
            <FolderPen className="text-muted-foreground" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(project.uid)}>
            <Copy className="text-muted-foreground" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport(project.uid)}>
            <Download className="text-muted-foreground" />
            <span>Export</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(project.uid)}>
            <Trash2 className="text-muted-foreground" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function NavProjects() {
  const { isMobile } = useSidebar();
  const {
    projects,
    currentProject,
    setCurrentProject,
    addProject,
    deleteProject,
    updateProject,
    updateProjectIcon,
    reorderProjects,
  } = useProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectIcon, setNewProjectIcon] = useState("Frame");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameProjectName, setRenameProjectName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.uid === active.id);
      const newIndex = projects.findIndex((p) => p.uid === over.id);
      reorderProjects(oldIndex, newIndex);
    }
  };

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
      a.download = `${project.name.replace(/[<>:"/\\|?*]/g, "_")}.json`;
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SidebarMenu>
            <SortableContext
              items={projects.map((p) => p.uid)}
              strategy={verticalListSortingStrategy}
            >
              {projects.map((project) => (
                <SortableProjectItem
                  key={project.uid}
                  project={project}
                  isMobile={isMobile}
                  onProjectClick={handleProjectClick}
                  onRename={openRenameDialog}
                  onDuplicate={handleDuplicateProject}
                  onExport={handleExportProject}
                  onDelete={handleDeleteProject}
                  onIconChange={updateProjectIcon}
                />
              ))}
            </SortableContext>
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
        </DndContext>
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
