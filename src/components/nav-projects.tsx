"use client"

import {
  Folder,
  FolderPen,
  MoreHorizontal,
  Share,
  Trash2,
  Plus,
  type LucideIcon,
  Frame,
  PieChart,
  Map
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
import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 图标映射
const iconMap: Record<string, LucideIcon> = {
  'Frame': Frame,
  'PieChart': PieChart,
  'Map': Map,
  'Folder': Folder
};

export function NavProjects() {
  const { isMobile } = useSidebar()
  const { projects, currentProject, setCurrentProject, addProject, deleteProject } = useProjects()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectIcon, setNewProjectIcon] = useState('Frame')

  const handleProjectClick = (projectUid: string) => {
    const project = projects.find(p => p.uid === projectUid)
    if (project) {
      setCurrentProject(project)
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
            const IconComponent = project.icon ? iconMap[project.icon] || Folder : Folder;
            
            return (
              <SidebarMenuItem key={project.uid}>
                <SidebarMenuButton 
                  onClick={() => handleProjectClick(project.uid)}
                  className={currentProject?.uid === project.uid ? "bg-accent" : ""}
                >
                  <IconComponent />
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
                    <DropdownMenuItem onClick={() => handleProjectClick(project.uid)}>
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
            <SidebarMenuButton onClick={() => setIsDialogOpen(true)}>
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
    </>
  )
}
