"use client";

import React, { useState } from "react";
import { Play, Plus, RefreshCw, StopCircle, Download, History } from "lucide-react";
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
import { VariableSyncDialog } from "@/components/variable-sync-dialog";
import { ResultHistoryDialog } from "@/components/result-history-dialog";
import { toast } from "sonner";

interface TestSetControlsProps {
  testSetUid: string;
  onVersionChange?: (version: number | null) => void;
  selectedVersion?: number | null;
}

export function TestSetControls({
  testSetUid: _testSetUid,
  onVersionChange,
  selectedVersion: externalSelectedVersion
}: TestSetControlsProps) {
  const {
    currentTestSet,
    runAllTests,
    cancelBatchExecution,
    isBatchRunning,
    addTestCase,
    updateTestSet
  } = useTestSets();
  const { projects } = useProjects();

  const [selectedVersion, setSelectedVersion] = useState<number | null>(externalSelectedVersion || null);
  const [isVariableSyncDialogOpen, setIsVariableSyncDialogOpen] = useState(false);
  const [isResultHistoryDialogOpen, setIsResultHistoryDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Get the associated project
  const associatedProject = currentTestSet
    ? projects.find(p => p.uid === currentTestSet.associatedProjectUid)
    : null;

  // Get available versions from the associated project
  const availableVersions = associatedProject?.versions || [];

  // Handle version selection
  const handleVersionChange = (versionId: string) => {
    const version = parseInt(versionId, 10);
    setSelectedVersion(version);
    onVersionChange?.(version);
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

    setIsRunning(true);
    try {
      await runAllTests(currentTestSet.uid, targetVersion);
      toast.success("All tests completed");
    } catch (error) {
      console.error("Batch execution failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to run tests");
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

  // Handle export results
  const handleExportResults = () => {
    const targetVersion = externalSelectedVersion || selectedVersion;
    if (!currentTestSet || !targetVersion) {
      toast.error("Please select a version");
      return;
    }

    try {
      const versionIdentifier = `v${targetVersion}`;
      const exportData = {
        testSetName: currentTestSet.name,
        projectName: associatedProject?.name || 'Unknown Project',
        versionId: targetVersion,
        versionIdentifier,
        exportedAt: new Date().toISOString(),
        variableNames: currentTestSet.variableNames,
        results: currentTestSet.testCases.map((testCase, index) => ({
          testCaseIndex: index + 1,
          testCaseId: testCase.id,
          variableValues: testCase.variableValues,
          result: testCase.results[versionIdentifier] || null
        }))
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTestSet.name.replace(/[^a-zA-Z0-9]/g, '_')}_results_v${targetVersion}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Results exported successfully");
    } catch (error) {
      console.error("Failed to export results:", error);
      toast.error("Failed to export results");
    }
  };

  // Handle export CSV
  const handleExportCSV = () => {
    const targetVersion = externalSelectedVersion || selectedVersion;
    if (!currentTestSet || !targetVersion) {
      toast.error("Please select a version");
      return;
    }

    try {
      const versionIdentifier = `v${targetVersion}`;

      // Create CSV headers
      const headers = [
        'Test Case #',
        ...currentTestSet.variableNames,
        'Result Status',
        'Result Content',
        'Execution Time (ms)',
        'Error Message',
        'Timestamp'
      ];

      // Create CSV rows
      const rows = currentTestSet.testCases.map((testCase, index) => {
        const result = testCase.results[versionIdentifier];
        return [
          index + 1,
          ...currentTestSet.variableNames.map(name =>
            `"${(testCase.variableValues[name] || '').replace(/"/g, '""')}"`
          ),
          result?.status || 'Not Run',
          result?.content ? `"${result.content.replace(/"/g, '""')}"` : '',
          result?.executionTime || '',
          result?.error ? `"${result.error.replace(/"/g, '""')}"` : '',
          result?.timestamp || ''
        ];
      });

      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTestSet.name.replace(/[^a-zA-Z0-9]/g, '_')}_results_v${targetVersion}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Results exported as CSV successfully");
    } catch (error) {
      console.error("Failed to export CSV:", error);
      toast.error("Failed to export CSV");
    }
  };

  // Check if batch is currently running
  const batchRunning = currentTestSet ? isBatchRunning(currentTestSet.uid) : false;

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
          value={(externalSelectedVersion || selectedVersion) ? String(externalSelectedVersion || selectedVersion) : ""}
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
                .map(version => (
                  <SelectItem key={version.id} value={String(version.id)}>
                    #{version.id}{version.description ? ` - ${version.description}` : ''}
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
                disabled={!(externalSelectedVersion || selectedVersion) || currentTestSet.testCases.length === 0}
              >
                <Play className="h-4 w-4" />
                Run All
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {batchRunning || isRunning
                ? "Cancel batch execution"
                : "Run all test cases for selected version"
              }
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

      {/* Export Results Buttons */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleExportResults}
              disabled={!(externalSelectedVersion || selectedVersion)}
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export test results as JSON file</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!(externalSelectedVersion || selectedVersion)}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export test results as CSV file</p>
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

      {/* Variable Sync Dialog */}
      {associatedProject && (
        <VariableSyncDialog
          open={isVariableSyncDialogOpen}
          onOpenChange={setIsVariableSyncDialogOpen}
          testSet={currentTestSet}
          onSync={(result) => {
            // Apply the synchronization result to update the test set
            if (currentTestSet && result.updatedTestSet) {
              try {
                updateTestSet(result.updatedTestSet);
                toast.success("Variables synchronized successfully");
              } catch (error) {
                console.error("Failed to apply variable synchronization:", error);
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
            (externalSelectedVersion || selectedVersion)
              ? `v${externalSelectedVersion || selectedVersion}`
              : undefined
          }
        />
      )}
    </div>
  );
}