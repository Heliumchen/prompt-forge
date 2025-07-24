"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useProjects } from "@/contexts/ProjectContext"

interface ProjectSelectProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function ProjectSelect({ value = "", onChange }: ProjectSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedProjectUid, setSelectedProjectUid] = React.useState("")
  const { projects } = useProjects()

  // 初始化时从value中获取项目uid
  React.useEffect(() => {
    if (value) {
      setSelectedProjectUid(value)
    }
  }, [value])

  // 查找当前选中项目的名称
  const getSelectedProjectName = () => {
    const project = projects.find(project => project.uid === selectedProjectUid)
    return project ? project.name : "Select Project..."
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {selectedProjectUid ? getSelectedProjectName() : "Select Project..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search project..." />
          <CommandList>
            <CommandEmpty>No project found</CommandEmpty>
            <CommandGroup heading="Project List">
              {projects.map((project) => (
                <CommandItem
                  key={project.uid}
                  value={project.uid}
                  onSelect={(currentValue: string) => {
                    const newValue = currentValue === selectedProjectUid ? "" : currentValue
                    setSelectedProjectUid(newValue)
                    setOpen(false)
                    onChange?.(newValue)
                  }}
                >
                  {project.name}
                  <Check
                    className={cn(
                      "ml-auto",
                      selectedProjectUid === project.uid ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
