"use client";

import {
  FolderPen,
  MoreHorizontal,
  Trash2,
  Plus,
  TestTube,
  Download,
  FileText,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTestSets } from "@/contexts/TestSetContext";
import { useProjects } from "@/contexts/ProjectContext";
import { TestSet } from "@/lib/testSetStorage";
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
import { toast } from "sonner";

export function NavTestSets() {
  const { isMobile } = useSidebar();
  const {
    testSets,
    currentTestSet,
    setCurrentTestSet,
    addTestSet,
    deleteTestSet,
    updateTestSet,
  } = useTestSets();
  const { projects } = useProjects();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTestSetName, setNewTestSetName] = useState("");
  const [selectedProjectUid, setSelectedProjectUid] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [testSetToRename, setTestSetToRename] = useState<TestSet | null>(null);
  const [renameTestSetName, setRenameTestSetName] = useState("");

  const handleTestSetClick = (testSetUid: string) => {
    const testSet = testSets.find((ts) => ts.uid === testSetUid);
    if (testSet) {
      setCurrentTestSet(testSet);
    }
  };

  const openRenameDialog = (testSetUid: string) => {
    const testSet = testSets.find((ts) => ts.uid === testSetUid);
    if (testSet) {
      setTestSetToRename(testSet);
      setRenameTestSetName(testSet.name);
      setIsRenameDialogOpen(true);
    }
  };

  const submitRenameTestSet = () => {
    if (testSetToRename && renameTestSetName.trim()) {
      const updatedTestSet = {
        ...testSetToRename,
        name: renameTestSetName.trim(),
        updatedAt: new Date().toISOString(),
      };
      updateTestSet(updatedTestSet);
      setIsRenameDialogOpen(false);
      setTestSetToRename(null);
      setRenameTestSetName("");
    }
  };

  const handleAddTestSet = () => {
    if (newTestSetName.trim() && selectedProjectUid) {
      addTestSet(newTestSetName.trim(), selectedProjectUid);
      setNewTestSetName("");
      setSelectedProjectUid("");
      setIsDialogOpen(false);
    }
  };

  const handleDeleteTestSet = (uid: string) => {
    if (confirm("Are you sure you want to delete this test set?")) {
      deleteTestSet(uid);
    }
  };

  const getProjectName = (projectUid: string) => {
    const project = projects.find((p) => p.uid === projectUid);
    return project ? project.name : "Unknown Project";
  };

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Test Sets</SidebarGroupLabel>
        <SidebarMenu>
          {testSets.map((testSet) => {
            return (
              <SidebarMenuItem key={testSet.uid}>
                <SidebarMenuButton
                  onClick={() => handleTestSetClick(testSet.uid)}
                  className={
                    currentTestSet?.uid === testSet.uid ? "bg-accent" : ""
                  }
                >
                  <TestTube />
                  <div className="flex flex-col items-start">
                    <span>{testSet.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getProjectName(testSet.associatedProjectUid)}
                    </span>
                  </div>
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
                      onClick={() => openRenameDialog(testSet.uid)}
                    >
                      <FolderPen className="text-muted-foreground" />
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteTestSet(testSet.uid)}
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
              <span>New Test Set</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Test Set</DialogTitle>
            <DialogDescription>
              Create a new test set and associate it with a project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Test Set Name</Label>
              <Input
                id="name"
                value={newTestSetName}
                onChange={(e) => setNewTestSetName(e.target.value)}
                placeholder="Enter test set name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project">Associated Project</Label>
              <Select value={selectedProjectUid} onValueChange={setSelectedProjectUid}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.uid} value={project.uid}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTestSet}
              disabled={!newTestSetName.trim() || !selectedProjectUid}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Test Set</DialogTitle>
            <DialogDescription className="hidden">
              Rename Test Set
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name">Test Set Name</Label>
              <Input
                id="rename-name"
                value={renameTestSetName}
                onChange={(e) => setRenameTestSetName(e.target.value)}
                placeholder="Enter new test set name"
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
            <Button onClick={submitRenameTestSet}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}