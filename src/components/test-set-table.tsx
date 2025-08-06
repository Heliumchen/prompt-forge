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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TestSetTableProps {
  testSet: TestSet;
  targetVersion?: number;
  versionIdentifier?: string;
  comparisonColumns?: ComparisonColumn[];
  onUpdateTestCase: (caseId: string, variableValues: Record<string, string>) => void;
  onDeleteTestCase: (caseId: string) => void;
  onBulkDeleteTestCases?: (caseIds: string[]) => void;
  onRunSingleTest: (caseId: string, versionIdentifier?: string) => Promise<void>;
  className?: string;
}

export function TestSetTable({
  testSet,
  targetVersion,
  versionIdentifier = targetVersion ? `v${targetVersion}` : 'default',
  comparisonColumns = [],
  onUpdateTestCase,
  onDeleteTestCase,
  onBulkDeleteTestCases,
  onRunSingleTest,
  className,
}: TestSetTableProps) {
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Handle individual test case selection
  const handleTestCaseSelection = useCallback((caseId: string, selected: boolean) => {
    setSelectedTestCases(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(caseId);
      } else {
        newSet.delete(caseId);
      }
      return newSet;
    });
  }, []);

  // Handle select all/none
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedTestCases(new Set(testSet.testCases.map(tc => tc.id)));
    } else {
      setSelectedTestCases(new Set());
    }
  }, [testSet.testCases]);

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

  const allSelected = testSet.testCases.length > 0 && selectedTestCases.size === testSet.testCases.length;
  const someSelected = selectedTestCases.size > 0 && selectedTestCases.size < testSet.testCases.length;
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
      <div className={cn("w-full overflow-auto", className)}>
        {/* Bulk actions toolbar */}
        {selectedTestCases.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 border-b">
            <span className="text-sm text-muted-foreground">
              {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? 's' : ''} selected
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
                        const input = el.querySelector('input');
                        if (input) input.indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all test cases"
                  />
                </th>
              )}

              {/* Variable columns */}
              {testSet.variableNames.map((variableName) => (
                <th
                  key={variableName}
                  className="px-4 py-3 text-left text-sm font-medium text-foreground"
                >
                  {variableName}
                </th>
              ))}
              
              {/* Primary result column */}
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground min-w-[200px]">
                Result {versionIdentifier && `(${versionIdentifier})`}
              </th>

              {/* Comparison result columns */}
              {comparisonColumns.map((column) => (
                <th 
                  key={column.id}
                  className="px-4 py-3 text-left text-sm font-medium text-foreground min-w-[200px] border-l border-border"
                >
                  Result ({column.label})
                </th>
              ))}
              
              {/* Actions column */}
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground w-[60px]">
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
                comparisonColumns={comparisonColumns}
                rowIndex={index}
                selected={selectedTestCases.has(testCase.id)}
                showSelection={!!onBulkDeleteTestCases}
                onSelectionChange={(selected) => handleTestCaseSelection(testCase.id, selected)}
                onUpdateVariables={(variableValues) => 
                  onUpdateTestCase(testCase.id, variableValues)
                }
                onDelete={() => onDeleteTestCase(testCase.id)}
                onRunTest={(versionId) => onRunSingleTest(testCase.id, versionId)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Cases</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? 's' : ''}? 
              This action cannot be undone and will remove all associated test results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}