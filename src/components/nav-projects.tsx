"use client"

import {
  FolderPen,
  MoreHorizontal,
  Share,
  Trash2,
  Plus,
  FileText
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useProjects } from "@/contexts/ProjectContext"
import { Project } from "@/lib/storage"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function NavProjects() {
  const { isMobile } = useSidebar()
  const { projects, currentProject, setCurrentProject, addProject, deleteProject, updateProject } = useProjects()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectIcon, setNewProjectIcon] = useState('Frame')
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [projectToRename, setProjectToRename] = useState<Project | null>(null)
  const [renameProjectName, setRenameProjectName] = useState('')

  const handleProjectClick = (projectUid: string) => {
    const project = projects.find(p => p.uid === projectUid)
    if (project) {
      setCurrentProject(project)
    }
  }

  const openRenameDialog = (projectUid: string) => {
    const project = projects.find(p => p.uid === projectUid);
    if (project) {
      setProjectToRename(project);
      setRenameProjectName(project.name);
      setIsRenameDialogOpen(true);
    }
  }

  const submitRenameProject = () => {
    if (projectToRename && renameProjectName.trim()) {
      const updatedProject = {
        ...projectToRename,
        name: renameProjectName.trim()
      };
      updateProject(updatedProject);
      setIsRenameDialogOpen(false);
    }
  }

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      addProject(newProjectName.trim(), newProjectIcon)
      setNewProjectName('')
      setNewProjectIcon('Frame')
      setIsDialogOpen(false)
    }
  }

  const handleDeleteProject = (uid: string) => {
    if (confirm('确定要删除此项目吗？')) {
      deleteProject(uid)
    }
  }

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
                  className={currentProject?.uid === project.uid ? "bg-accent" : ""}
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
                    <DropdownMenuItem onClick={() => openRenameDialog(project.uid)}>
                      <FolderPen className="text-muted-foreground" />
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share className="text-muted-foreground" />
                      <span>Share</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteProject(project.uid)}>
                      <Trash2 className="text-muted-foreground" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem>
            <SidebarMenuButton className="text-muted-foreground text-xs" onClick={() => setIsDialogOpen(true)}>
              <Plus />
              <span>New Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">项目名称</Label>
              <Input 
                id="name" 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                placeholder="输入项目名称" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddProject}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription className="hidden">
              Rename Project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name">项目名称</Label>
              <Input 
                id="rename-name" 
                value={renameProjectName} 
                onChange={(e) => setRenameProjectName(e.target.value)} 
                placeholder="输入新的项目名称" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>取消</Button>
            <Button onClick={submitRenameProject}>重命名</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
