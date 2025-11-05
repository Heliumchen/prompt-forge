"use client";

import React, { useState } from "react";
import { Play, Plus, RefreshCw, StopCircle, History, MoreHorizontal, Sheet, FileJson, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { VariableSyncDialog } from "@/components/variable-sync-dialog";
import { ResultHistoryDialog } from "@/components/result-history-dialog";
import { CSVImportDialog } from "@/components/csv-import-dialog";
import { toast } from "sonner";

interface TestSetControlsProps {
  testSetUid: string;
  onVersionChange?: (version: number | null) => void;
  selectedVersion?: number | null;
}

export function TestSetControls({
  testSetUid: _testSetUid,
  onVersionChange,
  selectedVersion: externalSelectedVersion,
}: TestSetControlsProps) {
  const {
    currentTestSet,
    runAllTests,
    runAllTestsForced,
    cancelBatchExecution,
    isBatchRunning,
    addTestCase,
    updateTestSet,
  } = useTestSets();
  const { projects } = useProjects();

  const [selectedVersion, setSelectedVersion] = useState<number | null>(
    externalSelectedVersion || null,
  );
  const [isVariableSyncDialogOpen, setIsVariableSyncDialogOpen] =
    useState(false);
  const [isResultHistoryDialogOpen, setIsResultHistoryDialogOpen] =
    useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Get the associated project (find project that contains this testSet)
  const associatedProject = currentTestSet
    ? projects.find((p) => p.testSet?.uid === currentTestSet.uid)
    : null;

  // Get available versions from the associated project
  const availableVersions = associatedProject?.versions || [];

  // Handle version selection
  const handleVersionChange = (versionId: string) => {
    const version = parseInt(versionId, 10);
    setSelectedVersion(version);
    onVersionChange?.(version);
  };

  // Check if all test cases have results for the selected version
  const hasAllTestsRun = () => {
    if (!currentTestSet || !currentTestSet.testCases.length) return false;

    const targetVersion = externalSelectedVersion || selectedVersion;
    if (!targetVersion) return false;

    const versionIdentifier = `v${targetVersion}`;
    return currentTestSet.testCases.every(
      (testCase) =>
        testCase.results[versionIdentifier] &&
        (testCase.results[versionIdentifier].status === "completed" ||
          testCase.results[versionIdentifier].status === "error"),
    );
  };

  // Handle run all tests
  const handleRunAllTests = async () => {
    const targetVersion = externalSelectedVersion || selectedVersion;
    if (!currentTestSet || !targetVersion) {
      toast.error("Please select a version to test against");
      return;
    }

    if (!associatedProject) {
      toast.error("Associated project not found");
      return;
    }

    // Check if there are test cases to run
    if (currentTestSet.testCases.length === 0) {
      toast.error("No test cases to run. Please add test cases first.");
      return;
    }

    const allTestsRun = hasAllTestsRun();

    setIsRunning(true);
    try {
      if (allTestsRun) {
        // All tests have been run before, re-run all
        await runAllTestsForced(currentTestSet.uid, targetVersion);
        toast.success("All tests re-run completed");
      } else {
        // Some tests haven't been run, run only unrun tests
        await runAllTests(currentTestSet.uid, targetVersion);
        toast.success("All tests completed");
      }
    } catch (error) {
      console.error("Batch execution failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to run tests",
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Handle cancel batch execution
  const handleCancelBatchExecution = () => {
    if (currentTestSet) {
      cancelBatchExecution(currentTestSet.uid);
      setIsRunning(false);
      toast.info("Test execution cancelled");
    }
  };

  // Handle add test case
  const handleAddTestCase = () => {
    if (!currentTestSet) {
      toast.error("No test set selected");
      return;
    }

    try {
      addTestCase(currentTestSet.uid);
      toast.success("Test case added");
    } catch (error) {
      console.error("Failed to add test case:", error);
      toast.error("Failed to add test case");
    }
  };

  // Handle export JSON
  const handleExportJSON = () => {
    if (!currentTestSet) return;

    try {
      const exportData = {
        testSetName: currentTestSet.name,
        projectName: associatedProject?.name || "Unknown Project",
        exportedAt: new Date().toISOString(),
        variableNames: currentTestSet.variableNames,
        testCases: currentTestSet.testCases.map((testCase, index) => ({
          testCaseIndex: index + 1,
          testCaseId: testCase.id,
          variableValues: testCase.variableValues,
          results: testCase.results,
        })),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentTestSet.name.replace(/[<>:"/\\|?*]/g, "_")}_testset.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Test set exported as JSON successfully");
    } catch (error) {
      console.error("Failed to export JSON:", error);
      toast.error("Failed to export JSON");
    }
  };

  // Handle export CSV
  const handleExportCSV = () => {
    if (!currentTestSet) return;

    try {
      // Create CSV headers
      const headers = [
        "Test Case #",
        ...currentTestSet.variableNames,
        "Messages",
        "Results (JSON)",
      ];

      // Create CSV rows
      const rows = currentTestSet.testCases.map((testCase, index) => {
        return [
          index + 1,
          ...currentTestSet.variableNames.map(
            (name) =>
              `"${(testCase.variableValues[name] || "").replace(/"/g, '""')}"`,
          ),
          `"${JSON.stringify(testCase.messages || []).replace(/"/g, '""')}"`,
          `"${JSON.stringify(testCase.results).replace(/"/g, '""')}"`,
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentTestSet.name.replace(/[<>:"/\\|?*]/g, "_")}_testset.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Test set exported as CSV successfully");
    } catch (error) {
      console.error("Failed to export CSV:", error);
      toast.error("Failed to export CSV");
    }
  };

  // Handle import CSV
  const handleImportCSV = () => {
    setIsImportDialogOpen(true);
  };

  // Check if batch is currently running
  const batchRunning = currentTestSet
    ? isBatchRunning(currentTestSet.uid)
    : false;

  if (!currentTestSet) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        No test set selected
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-4 border-b bg-background">
      {/* Version Selection */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Target Version:</span>
        <Select
          value={
            externalSelectedVersion || selectedVersion
              ? String(externalSelectedVersion || selectedVersion)
              : ""
          }
          onValueChange={handleVersionChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select version" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {availableVersions
                .slice()
                .sort((a, b) => b.id - a.id)
                .map((version) => (
                  <SelectItem key={version.id} value={String(version.id)}>
                    #{version.id}
                    {version.description ? ` - ${version.description}` : ""}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Run All Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {batchRunning || isRunning ? (
              <Button
                variant="destructive"
                onClick={handleCancelBatchExecution}
                disabled={!batchRunning && !isRunning}
              >
                <StopCircle className="h-4 w-4" />
                Cancel
              </Button>
            ) : (
              <Button
                onClick={handleRunAllTests}
                disabled={
                  !(externalSelectedVersion || selectedVersion) ||
                  currentTestSet.testCases.length === 0
                }
              >
                <Play className="h-4 w-4" />
                {hasAllTestsRun() ? "Re-run All" : "Run All"}
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {batchRunning || isRunning
                ? "Cancel batch execution"
                : hasAllTestsRun()
                  ? "Re-run all test cases"
                  : "Run all test cases"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Variable Sync Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => setIsVariableSyncDialogOpen(true)}
              disabled={!associatedProject}
            >
              <RefreshCw className="h-4 w-4" />
              Sync Variables
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Synchronize table columns with project version variables</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Add Test Case Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={handleAddTestCase}>
              <Plus className="h-4 w-4" />
              Add Test Case
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add a new test case row</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Result History Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => setIsResultHistoryDialogOpen(true)}
            >
              <History className="h-4 w-4" />
              History
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View result history and statistics</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCSV}>
            <Sheet className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Export CSV</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJSON}>
            <FileJson className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Export JSON</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleImportCSV}>
            <Download className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Import CSV</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Variable Sync Dialog */}
      {associatedProject && (
        <VariableSyncDialog
          open={isVariableSyncDialogOpen}
          onOpenChange={setIsVariableSyncDialogOpen}
          testSet={currentTestSet}
          onSync={(result) => {
            // Apply the synchronization result to update the test set
            if (currentTestSet && result.updatedTestSet && associatedProject) {
              try {
                updateTestSet(associatedProject.uid, result.updatedTestSet);
                toast.success("Variables synchronized successfully");
              } catch (error) {
                console.error(
                  "Failed to apply variable synchronization:",
                  error,
                );
                toast.error("Failed to synchronize variables");
              }
            }
          }}
        />
      )}

      {/* Result History Dialog */}
      {currentTestSet && (
        <ResultHistoryDialog
          open={isResultHistoryDialogOpen}
          onOpenChange={setIsResultHistoryDialogOpen}
          testSet={currentTestSet}
          versionIdentifier={
            externalSelectedVersion || selectedVersion
              ? `v${externalSelectedVersion || selectedVersion}`
              : undefined
          }
        />
      )}

      {/* CSV Import Dialog */}
      {currentTestSet && (
        <CSVImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onOpenChange={setIsImportDialogOpen}
          testSet={currentTestSet}
        />
      )}
    </div>
  );
}
