"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { TestSetControls } from "./test-set-controls";
import { TestSetTable } from "./test-set-table";
import { useTestSets } from "@/contexts/TestSetContext";
import { useProjects } from "@/contexts/ProjectContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { TestSetJSONImportDialog } from "./testset-json-import-dialog";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TestSetViewProps {
  testSetUid: string;
}

// Error boundary component for test set operations
class TestSetErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: React.ReactNode;
    onError?: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("TestSet Error Boundary caught an error:", error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Something went wrong with the test set interface. Please refresh
              the page or try again.
              {this.state.error && (
                <details className="mt-2 text-xs">
                  <summary>Error details</summary>
                  <pre className="mt-1 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export function TestSetView({ testSetUid }: TestSetViewProps) {
  const {
    currentTestSet,
    updateTestCase,
    updateTestCaseMessages,
    importTestCases,
    deleteTestCase,
    duplicateTestCase,
    bulkDeleteTestCases,
    runSingleTest,
    runAllTests: _runAllTests,
    isBatchRunning,
  } = useTestSets();
  const { projects } = useProjects();

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJSONImportOpen, setIsJSONImportOpen] = useState(false);
  const [jsonImportData, setJSONImportData] = useState<string>("");

  // Get the associated project with memoization for performance
  const associatedProject = useMemo(
    () =>
      currentTestSet
        ? projects.find((p) => p.uid === currentTestSet.associatedProjectUid)
        : null,
    [currentTestSet, projects],
  );

  // Check if batch execution is running
  const batchRunning = useMemo(
    () => (currentTestSet ? isBatchRunning(currentTestSet.uid) : false),
    [currentTestSet, isBatchRunning],
  );

  // Effect to handle test set changes and validation
  useEffect(() => {
    if (!currentTestSet) {
      setError("No test set selected");
      return;
    }

    if (!associatedProject) {
      setError(
        "Associated project not found. The project may have been deleted.",
      );
      return;
    }

    // Clear error if everything is valid
    setError(null);

    // Reset selected version if it doesn't exist in the project
    if (
      selectedVersion &&
      !associatedProject.versions.find((v) => v.id === selectedVersion)
    ) {
      setSelectedVersion(null);
      toast.error(
        "Selected version no longer exists. Please select a different version.",
      );
    }

    // Auto-select the latest version (highest version number) if no version is selected
    if (!selectedVersion && associatedProject.versions.length > 0) {
      const latestVersion = Math.max(
        ...associatedProject.versions.map((v) => v.id),
      );
      setSelectedVersion(latestVersion);
    }
  }, [currentTestSet, associatedProject, selectedVersion]);

  // Error handler for the error boundary
  const handleError = useCallback((error: Error) => {
    console.error("TestSetView error:", error);
    toast.error(`An error occurred: ${error.message}`);
    setError(error.message);
  }, []);

  // JSON import handlers
  const handleJSONPaste = useCallback(
    (jsonData: string) => {
      if (currentTestSet) {
        setJSONImportData(jsonData);
        setIsJSONImportOpen(true);
      }
    },
    [currentTestSet],
  );

  const handleJSONImport = useCallback(
    (
      testCasesData: Array<{
        variableValues: Record<string, string>;
        messages: Array<{ role: "user" | "assistant"; content: string }>;
      }>,
    ) => {
      if (!currentTestSet) return;

      try {
        importTestCases(currentTestSet.uid, testCasesData);
        setIsJSONImportOpen(false);
      } catch (error) {
        console.error("Failed to import test cases:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to import test cases";
        toast.error(errorMessage);
      }
    },
    [currentTestSet, importTestCases],
  );

  // Handle updating test case variables with loading state
  const handleUpdateTestCase = useCallback(
    async (caseId: string, variableValues: Record<string, string>) => {
      if (!currentTestSet) return;

      try {
        // Don't show global loading for quick operations like updating test case variables
        updateTestCase(currentTestSet.uid, caseId, variableValues);
      } catch (error) {
        console.error("Failed to update test case:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update test case";
        toast.error(errorMessage);
        setError(errorMessage);
      }
    },
    [currentTestSet, updateTestCase],
  );

  // Handle updating test case messages with loading state
  const handleUpdateTestCaseMessages = useCallback(
    async (
      caseId: string,
      messages: Array<{ role: "user" | "assistant"; content: string }>,
    ) => {
      if (!currentTestSet) return;

      try {
        // Don't show global loading for quick operations like updating test case messages
        updateTestCaseMessages(currentTestSet.uid, caseId, messages);
      } catch (error) {
        console.error("Failed to update test case messages:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update test case messages";
        toast.error(errorMessage);
        setError(errorMessage);
      }
    },
    [currentTestSet, updateTestCaseMessages],
  );

  // Handle deleting test case with loading state
  const handleDeleteTestCase = useCallback(
    async (caseId: string) => {
      if (!currentTestSet) return;

      try {
        // Don't show global loading for quick operations like deleting a single test case
        deleteTestCase(currentTestSet.uid, caseId);
        toast.success("Test case deleted");
      } catch (error) {
        console.error("Failed to delete test case:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete test case";
        toast.error(errorMessage);
        setError(errorMessage);
      }
    },
    [currentTestSet, deleteTestCase],
  );

  // Handle duplicating test case with loading state
  const handleDuplicateTestCase = useCallback(
    async (caseId: string) => {
      if (!currentTestSet) return;

      try {
        // Don't show global loading for quick operations like duplicating a test case
        duplicateTestCase(currentTestSet.uid, caseId);
        toast.success("Test case duplicated");
      } catch (error) {
        console.error("Failed to duplicate test case:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to duplicate test case";
        toast.error(errorMessage);
        setError(errorMessage);
      }
    },
    [currentTestSet, duplicateTestCase],
  );

  // Handle bulk deleting test cases with loading state
  const handleBulkDeleteTestCases = useCallback(
    async (caseIds: string[]) => {
      if (!currentTestSet || caseIds.length === 0) return;

      try {
        setIsLoading(true);
        bulkDeleteTestCases(currentTestSet.uid, caseIds);
        toast.success(
          `${caseIds.length} test case${caseIds.length !== 1 ? "s" : ""} deleted`,
        );
      } catch (error) {
        console.error("Failed to delete test cases:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete test cases";
        toast.error(errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentTestSet, bulkDeleteTestCases],
  );

  // Handle running single test with enhanced error handling
  const handleRunSingleTest = useCallback(
    async (caseId: string, versionIdentifier?: string) => {
      if (!currentTestSet || !associatedProject) {
        toast.error("Test set or project not available");
        return;
      }

      // Determine which version to use
      let targetVersion: number;
      let targetVersionIdentifier: string;

      if (versionIdentifier) {
        // Extract version number from identifier (e.g., "v2" -> 2)
        const versionMatch = versionIdentifier.match(/v(\d+)/);
        if (versionMatch) {
          targetVersion = parseInt(versionMatch[1], 10);
          targetVersionIdentifier = versionIdentifier;
        } else {
          toast.error("Invalid version identifier");
          return;
        }
      } else if (selectedVersion) {
        targetVersion = selectedVersion;
        targetVersionIdentifier = `v${selectedVersion}`;
      } else {
        toast.error("Please select a version to test against");
        return;
      }

      // Verify the version exists
      const version = associatedProject.versions.find(
        (v) => v.id === targetVersion,
      );
      if (!version) {
        toast.error(`Version #${targetVersion} not found`);
        return;
      }

      // Validate version has prompts
      if (!version.data.prompts || version.data.prompts.length === 0) {
        toast.error("Selected version has no prompts to test");
        return;
      }

      // Validate model configuration
      if (!version.data.modelConfig || !version.data.modelConfig.model) {
        toast.error("Selected version has no model configuration");
        return;
      }

      try {
        // Don't set global loading state for single test runs
        // The loading state is handled by the individual ResultCell components
        await runSingleTest(
          currentTestSet.uid,
          caseId,
          targetVersion,
          targetVersionIdentifier,
        );
      } catch (error) {
        console.error("Failed to run single test:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to run test";
        toast.error(errorMessage);
        setError(errorMessage);
      }
    },
    [currentTestSet, associatedProject, selectedVersion, runSingleTest],
  );

  // Add keyboard shortcut support for JSON import
  useKeyboardShortcuts(false, () => {}, handleJSONPaste);

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state for initial load
  if (!currentTestSet) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading test set...
        </div>
      </div>
    );
  }

  if (!associatedProject) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Associated project not found. The project may have been deleted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const versionIdentifier = selectedVersion ? `v${selectedVersion}` : "default";

  return (
    <TestSetErrorBoundary onError={handleError}>
      <div className="flex flex-col h-full relative">
        {/* Loading overlay - only show for non-batch operations like bulk delete */}
        {isLoading && !batchRunning && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing operation...</span>
            </div>
          </div>
        )}

        {/* Main controls */}
        <TestSetControls
          testSetUid={testSetUid}
          onVersionChange={setSelectedVersion}
          selectedVersion={selectedVersion}
        />

        {/* Test set table */}
        <div className="flex-1 custom-scrollbar">
          <TestSetTable
            testSet={currentTestSet}
            targetVersion={selectedVersion || undefined}
            versionIdentifier={versionIdentifier}
            onUpdateTestCase={handleUpdateTestCase}
            onUpdateTestCaseMessages={handleUpdateTestCaseMessages}
            onDeleteTestCase={handleDeleteTestCase}
            onDuplicateTestCase={handleDuplicateTestCase}
            onBulkDeleteTestCases={handleBulkDeleteTestCases}
            onRunSingleTest={handleRunSingleTest}
          />
        </div>
      </div>

      {/* JSON Import Dialog */}
      {currentTestSet && (
        <TestSetJSONImportDialog
          isOpen={isJSONImportOpen}
          onClose={() => setIsJSONImportOpen(false)}
          onOpenChange={setIsJSONImportOpen}
          jsonData={jsonImportData}
          associatedProjectUid={currentTestSet.associatedProjectUid}
          onImport={handleJSONImport}
        />
      )}
    </TestSetErrorBoundary>
  );
}
