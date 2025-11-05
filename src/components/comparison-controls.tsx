"use client";

import React, { useState } from "react";
import { Plus, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTestSets } from "@/contexts/TestSetContext";
import { useProjects } from "@/contexts/ProjectContext";
import { toast } from "sonner";

export interface ComparisonColumn {
  id: string;
  versionId: number;
  versionIdentifier: string;
  label: string;
}

interface ComparisonControlsProps {
  testSetUid: string;
  comparisonColumns: ComparisonColumn[];
  onAddComparisonColumn: (column: ComparisonColumn) => void;
  onRemoveComparisonColumn: (columnId: string) => void;
  onRunComparisonTests: (columnId: string) => Promise<void>;
}

export function ComparisonControls({
  testSetUid: _testSetUid,
  comparisonColumns,
  onAddComparisonColumn,
  onRemoveComparisonColumn,
  onRunComparisonTests,
}: ComparisonControlsProps) {
  const { currentTestSet } = useTestSets();
  const { projects } = useProjects();
  
  const [selectedVersionForComparison, setSelectedVersionForComparison] = useState<number | null>(null);

  // Get the associated project (find project that contains this testSet)
  const associatedProject = currentTestSet
    ? projects.find(p => p.testSet?.uid === currentTestSet.uid)
    : null;

  // Get available versions from the associated project
  const availableVersions = associatedProject?.versions || [];

  // Filter out versions that are already being compared
  const usedVersionIds = comparisonColumns.map(col => col.versionId);
  const availableVersionsForComparison = availableVersions.filter(
    version => !usedVersionIds.includes(version.id)
  );

  // Handle adding a comparison column
  const handleAddComparisonColumn = () => {
    if (!selectedVersionForComparison || !associatedProject) {
      toast.error("Please select a version for comparison");
      return;
    }

    const version = availableVersions.find(v => v.id === selectedVersionForComparison);
    if (!version) {
      toast.error("Selected version not found");
      return;
    }

    const newColumn: ComparisonColumn = {
      id: `comparison-${selectedVersionForComparison}-${Date.now()}`,
      versionId: selectedVersionForComparison,
      versionIdentifier: `v${selectedVersionForComparison}`,
      label: `#${selectedVersionForComparison}${version.description ? ` - ${version.description}` : ''}`,
    };

    onAddComparisonColumn(newColumn);
    setSelectedVersionForComparison(null);
    toast.success(`Added comparison column for version #${selectedVersionForComparison}`);
  };

  // Handle removing a comparison column
  const handleRemoveComparisonColumn = (columnId: string) => {
    const column = comparisonColumns.find(col => col.id === columnId);
    if (column) {
      onRemoveComparisonColumn(columnId);
      toast.success(`Removed comparison column for version #${column.versionId}`);
    }
  };

  // Handle running tests for a specific comparison column
  const handleRunComparisonTests = async (columnId: string) => {
    try {
      await onRunComparisonTests(columnId);
      const column = comparisonColumns.find(col => col.id === columnId);
      toast.success(`Completed tests for version #${column?.versionId}`);
    } catch (error) {
      console.error("Failed to run comparison tests:", error);
      toast.error("Failed to run comparison tests");
    }
  };

  if (!currentTestSet || !associatedProject) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
      <span className="text-sm font-medium text-muted-foreground">Compare with:</span>
      
      {/* Existing comparison columns */}
      {comparisonColumns.map((column) => (
        <div key={column.id} className="flex items-center gap-1 bg-background border rounded-md px-2 py-1">
          <span className="text-sm">{column.label}</span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRunComparisonTests(column.id)}
                >
                  <Play className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Run tests for this version</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveComparisonColumn(column.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove comparison column</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ))}

      {/* Add new comparison column */}
      {availableVersionsForComparison.length > 0 && (
        <div className="flex items-center gap-2">
          <Select 
            value={selectedVersionForComparison ? String(selectedVersionForComparison) : ""}
            onValueChange={(value) => setSelectedVersionForComparison(parseInt(value, 10))}
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableVersionsForComparison
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleAddComparisonColumn}
                  disabled={!selectedVersionForComparison}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add comparison column</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {availableVersionsForComparison.length === 0 && comparisonColumns.length === 0 && (
        <span className="text-sm text-muted-foreground">
          No additional versions available for comparison
        </span>
      )}
    </div>
  );
}