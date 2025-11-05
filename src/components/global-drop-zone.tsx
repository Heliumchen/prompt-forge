"use client";

import React, { useState, useCallback, DragEvent } from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { validateAndFixProject } from "@/lib/storage";
import { toast } from "sonner";

export function GlobalDropZone({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [_dragCount, setDragCount] = useState(0);
  const { projects, addProject } = useProjects();

  // Helper function to get unique project name
  const getUniqueProjectName = useCallback(
    (name: string): string => {
      const existingNames = projects.map((p) => p.name);
      if (!existingNames.includes(name)) {
        return name;
      }

      let counter = 1;
      let newName = `${name} (${counter})`;
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${name} (${counter})`;
      }
      return newName;
    },
    [projects]
  );

  // Check if dragged items contain JSON files
  const hasJsonFiles = useCallback((e: DragEvent) => {
    const items = e.dataTransfer.items;
    if (!items) return false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.type;
        if (file === "application/json" || file === "") {
          // Empty type might be JSON file
          return true;
        }
      }
    }
    return false;
  }, []);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setDragCount((prev) => prev + 1);

      if (hasJsonFiles(e)) {
        setIsDragging(true);
      }
    },
    [hasJsonFiles]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Required to allow drop
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCount((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const processFile = useCallback(
    async (file: File): Promise<{ success: boolean; name?: string; error?: string }> => {
      return new Promise((resolve) => {
        // Validate file type
        if (!file.name.toLowerCase().endsWith(".json")) {
          resolve({ success: false, error: `"${file.name}" is not a JSON file` });
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const projectData = JSON.parse(content);

            // Basic validation
            if (!projectData.name || !projectData.versions || !projectData.currentVersion) {
              resolve({
                success: false,
                error: `"${file.name}" missing required fields (name, versions, currentVersion)`,
              });
              return;
            }

            if (!Array.isArray(projectData.versions) || projectData.versions.length === 0) {
              resolve({
                success: false,
                error: `"${file.name}" invalid or empty version data`,
              });
              return;
            }

            // Validate first version structure
            const firstVersionData = projectData.versions[0]?.data;
            if (!firstVersionData || !firstVersionData.prompts || !firstVersionData.messages) {
              resolve({
                success: false,
                error: `"${file.name}" invalid version data format`,
              });
              return;
            }

            // Use existing validation and fix
            const validatedProject = validateAndFixProject(projectData);
            if (!validatedProject) {
              resolve({
                success: false,
                error: `"${file.name}" project data validation failed`,
              });
              return;
            }

            // Get unique name to avoid duplicates
            const uniqueName = getUniqueProjectName(validatedProject.name);
            const nameChanged = uniqueName !== validatedProject.name;

            // Remove uid to generate new one
            const { uid, ...projectWithoutUid } = validatedProject;

            // Add project via context
            addProject(uniqueName, validatedProject.icon, projectWithoutUid);

            resolve({
              success: true,
              name: nameChanged ? `${validatedProject.name} → ${uniqueName}` : uniqueName,
            });
          } catch (error) {
            resolve({
              success: false,
              error:
                error instanceof Error
                  ? `"${file.name}" parsing failed: ${error.message}`
                  : `"${file.name}" import failed`,
            });
          }
        };

        reader.onerror = () => {
          resolve({ success: false, error: `"${file.name}" read failed` });
        };

        reader.readAsText(file);
      });
    },
    [addProject, getUniqueProjectName]
  );

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(false);
      setDragCount(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Filter JSON files
      const jsonFiles = files.filter((file) => file.name.toLowerCase().endsWith(".json"));

      if (jsonFiles.length === 0) {
        toast.error("Please drop JSON project files");
        return;
      }

      // Process all files
      const results = await Promise.all(jsonFiles.map((file) => processFile(file)));

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      // Show results
      if (successCount > 0 && failCount === 0) {
        const successNames = results.filter((r) => r.success).map((r) => r.name);
        toast.success(`Successfully imported ${successCount} project(s): ${successNames.join(", ")}`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Partial import success: ${successCount} succeeded, ${failCount} failed`);
      } else {
        const errors = results.filter((r) => !r.success).map((r) => r.error);
        toast.error(errors[0] || "All file imports failed");
      }

      // Log errors for debugging
      results.forEach((result) => {
        if (!result.success) {
          console.error("Import error:", result.error);
        }
      });
    },
    [processFile]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ width: "100%", height: "100%" }}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-primary bg-card p-12 shadow-lg">
            <div className="text-6xl">📥</div>
            <div className="text-center">
              <h3 className="text-2xl font-semibold">Drop JSON files to import projects</h3>
              <p className="mt-2 text-muted-foreground">Supports importing multiple project files at once</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
