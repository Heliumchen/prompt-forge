"use client";

import React, { useState, useCallback } from "react";
import { TestSet } from "@/lib/testSetStorage";
import { TestCaseRow } from "./test-case-row";
import { ComparisonColumn } from "./comparison-controls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProjects } from "@/contexts/ProjectContext";
import { useTestSets } from "@/contexts/TestSetContext";

interface TestSetTableProps {
  testSet: TestSet;
  targetVersion?: number;
  versionIdentifier?: string;
  comparisonColumns?: ComparisonColumn[];
  onUpdateTestCase: (
    caseId: string,
    variableValues: Record<string, string>,
  ) => void;
  onUpdateTestCaseMessages: (
    caseId: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
  ) => void;
  onDeleteTestCase: (caseId: string) => void;
  onDuplicateTestCase: (caseId: string) => void;
  onBulkDeleteTestCases?: (caseIds: string[]) => void;
  onRunSingleTest: (
    caseId: string,
    versionIdentifier?: string,
  ) => Promise<void>;
  className?: string;
}

export function TestSetTable({
  testSet,
  targetVersion,
  versionIdentifier = targetVersion ? `v${targetVersion}` : "default",
  comparisonColumns: _comparisonColumns = [],
  onUpdateTestCase,
  onUpdateTestCaseMessages,
  onDeleteTestCase,
  onDuplicateTestCase,
  onBulkDeleteTestCases,
  onRunSingleTest,
  className,
}: TestSetTableProps) {
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { projects } = useProjects();
  const { updateTestSetUIState } = useTestSets();

  // Get comparison version from testSet's UI state
  const comparisonVersion = testSet.uiState?.selectedComparisonVersion
    ? parseInt(testSet.uiState.selectedComparisonVersion, 10)
    : null;

  // Handle individual test case selection
  const handleTestCaseSelection = useCallback(
    (caseId: string, selected: boolean) => {
      setSelectedTestCases((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(caseId);
        } else {
          newSet.delete(caseId);
        }
        return newSet;
      });
    },
    [],
  );

  // Handle select all/none
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedTestCases(new Set(testSet.testCases.map((tc) => tc.id)));
      } else {
        setSelectedTestCases(new Set());
      }
    },
    [testSet.testCases],
  );

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (selectedTestCases.size === 0) return;
    setShowBulkDeleteDialog(true);
  }, [selectedTestCases.size]);

  const confirmBulkDelete = useCallback(() => {
    if (onBulkDeleteTestCases && selectedTestCases.size > 0) {
      onBulkDeleteTestCases(Array.from(selectedTestCases));
      setSelectedTestCases(new Set());
    }
    setShowBulkDeleteDialog(false);
  }, [onBulkDeleteTestCases, selectedTestCases]);

  // Get the associated project for version selection
  const associatedProject = projects.find(
    (p) => p.testSet?.uid === testSet.uid,
  );
  const availableVersions = associatedProject?.versions || [];

  // Filter out the target version from comparison options
  const availableComparisonVersions = availableVersions.filter(
    (v) => v.id !== targetVersion,
  );

  // Handle comparison version change
  const handleComparisonVersionChange = useCallback(
    (value: string) => {
      if (value === "none") {
        updateTestSetUIState(testSet.uid, {
          selectedComparisonVersion: undefined,
        });
      } else {
        updateTestSetUIState(testSet.uid, { selectedComparisonVersion: value });
      }
    },
    [testSet.uid, updateTestSetUIState],
  );

  // Create comparison column based on selected version
  const dynamicComparisonColumn: ComparisonColumn | null = comparisonVersion
    ? {
        id: `comparison-${comparisonVersion}`,
        versionId: comparisonVersion,
        versionIdentifier: `v${comparisonVersion}`,
        label: `#${comparisonVersion}${availableVersions.find((v) => v.id === comparisonVersion)?.description ? ` - ${availableVersions.find((v) => v.id === comparisonVersion)?.description}` : ""}`,
      }
    : null;

  const allSelected =
    testSet.testCases.length > 0 &&
    selectedTestCases.size === testSet.testCases.length;
  const someSelected =
    selectedTestCases.size > 0 &&
    selectedTestCases.size < testSet.testCases.length;
  if (!testSet) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No test set selected
      </div>
    );
  }

  if (testSet.testCases.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No test cases yet. Add a test case to get started.
      </div>
    );
  }

  return (
    <>
      <div className={cn("w-full", className)}>
        {/* Bulk actions toolbar */}
        {selectedTestCases.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 border-b">
            <span className="text-sm text-muted-foreground">
              {selectedTestCases.size} test case
              {selectedTestCases.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="ml-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected
            </Button>
          </div>
        )}

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {/* Selection column */}
              {onBulkDeleteTestCases && (
                <th className="px-4 py-3 w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        const input = el.querySelector("input");
                        if (input) input.indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all test cases"
                  />
                </th>
              )}

              {/* Primary result column */}
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground min-w-[200px]">
                Result {versionIdentifier && `(${versionIdentifier})`}
              </th>

              {/* Compare selector column - always visible */}
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground min-w-[150px] border-l border-r border-border">
                <div className="flex items-center gap-2">
                  <span>Compare</span>
                  <Select
                    value={testSet.uiState?.selectedComparisonVersion || "none"}
                    onValueChange={handleComparisonVersionChange}
                  >
                    <SelectTrigger className="w-[120px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">None</SelectItem>
                        {availableComparisonVersions
                          .slice()
                          .sort((a, b) => b.id - a.id)
                          .map((version) => (
                            <SelectItem
                              key={version.id}
                              value={String(version.id)}
                            >
                              #{version.id}
                              {version.description
                                ? ` - ${version.description}`
                                : ""}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </th>

              {/* Variable columns */}
              {testSet.variableNames.map((variableName) => (
                <th
                  key={variableName}
                  className="px-4 py-3 text-left text-sm font-medium text-foreground"
                >
                  {variableName}
                </th>
              ))}

              {/* Messages column */}
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground w-[120px]">
                Messages
              </th>

              {/* Actions column */}
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground w-[60px] border-l border-border">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {testSet.testCases.map((testCase, index) => (
              <TestCaseRow
                key={testCase.id}
                testCase={testCase}
                variableNames={testSet.variableNames}
                versionIdentifier={versionIdentifier}
                comparisonColumns={
                  dynamicComparisonColumn ? [dynamicComparisonColumn] : []
                }
                rowIndex={index}
                selected={selectedTestCases.has(testCase.id)}
                showSelection={!!onBulkDeleteTestCases}
                onSelectionChange={(selected) =>
                  handleTestCaseSelection(testCase.id, selected)
                }
                onUpdateVariables={(variableValues) =>
                  onUpdateTestCase(testCase.id, variableValues)
                }
                onUpdateMessages={(messages) =>
                  onUpdateTestCaseMessages(testCase.id, messages)
                }
                onDelete={() => onDeleteTestCase(testCase.id)}
                onDuplicate={() => onDuplicateTestCase(testCase.id)}
                onRunTest={(versionId) =>
                  onRunSingleTest(testCase.id, versionId)
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Cases</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTestCases.size} test case
              {selectedTestCases.size !== 1 ? "s" : ""}? This action cannot be
              undone and will remove all associated test results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
