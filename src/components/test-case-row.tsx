"use client";

import React, { useState, useCallback } from "react";
import { TestCase } from "@/lib/testSetStorage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResultCell } from "./result-cell";
import { ComparisonColumn } from "./comparison-controls";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestCaseRowProps {
  testCase: TestCase;
  variableNames: string[];
  versionIdentifier: string;
  comparisonColumns?: ComparisonColumn[];
  rowIndex: number;
  selected?: boolean;
  showSelection?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  onUpdateVariables: (variableValues: Record<string, string>) => void;
  onDelete: () => void;
  onRunTest: (versionIdentifier?: string) => Promise<void>;
  className?: string;
}

export function TestCaseRow({
  testCase,
  variableNames,
  versionIdentifier,
  comparisonColumns = [],
  rowIndex,
  selected = false,
  showSelection = false,
  onSelectionChange,
  onUpdateVariables,
  onDelete,
  onRunTest,
  className,
}: TestCaseRowProps) {
  const [localVariableValues, setLocalVariableValues] = useState<Record<string, string>>(
    testCase.variableValues
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Handle variable value changes with debounced save
  const handleVariableChange = useCallback((variableName: string, value: string) => {
    const newValues = { ...localVariableValues, [variableName]: value };
    setLocalVariableValues(newValues);
    setHasUnsavedChanges(true);

    // Debounced save after 500ms of no changes
    const timeoutId = setTimeout(() => {
      onUpdateVariables(newValues);
      setHasUnsavedChanges(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [localVariableValues, onUpdateVariables]);

  // Handle immediate save on blur
  const handleVariableBlur = useCallback(() => {
    if (hasUnsavedChanges) {
      onUpdateVariables(localVariableValues);
      setHasUnsavedChanges(false);
    }
  }, [hasUnsavedChanges, localVariableValues, onUpdateVariables]);

  const result = testCase.results[versionIdentifier];

  return (
    <tr 
      className={cn(
        "border-b border-border hover:bg-muted/30 transition-colors",
        hasUnsavedChanges && "bg-yellow-50/50 dark:bg-yellow-900/10",
        selected && "bg-blue-50/50 dark:bg-blue-900/10",
        className
      )}
    >
      {/* Selection cell */}
      {showSelection && (
        <td className="px-4 py-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelectionChange}
            aria-label={`Select test case ${rowIndex + 1}`}
          />
        </td>
      )}

      {/* Variable value cells */}
      {variableNames.map((variableName) => (
        <td key={variableName} className="px-4 py-3">
          <Input
            value={localVariableValues[variableName] || ''}
            onChange={(e) => handleVariableChange(variableName, e.target.value)}
            onBlur={handleVariableBlur}
            placeholder={`Enter ${variableName}...`}
            className={cn(
              "min-w-[120px]",
              hasUnsavedChanges && "border-yellow-400 dark:border-yellow-600"
            )}
            aria-label={`${variableName} for test case ${rowIndex + 1}`}
          />
        </td>
      ))}

      {/* Primary result cell */}
      <td className="px-4 py-3">
        <ResultCell
          result={result}
          onRunTest={() => onRunTest(versionIdentifier)}
          testCaseIndex={rowIndex}
        />
      </td>

      {/* Comparison result cells */}
      {comparisonColumns.map((column) => {
        const comparisonResult = testCase.results[column.versionIdentifier];
        return (
          <td key={column.id} className="px-4 py-3 border-l border-border">
            <ResultCell
              result={comparisonResult}
              onRunTest={() => onRunTest(column.versionIdentifier)}
              testCaseIndex={rowIndex}
            />
          </td>
        );
      })}

      {/* Actions cell */}
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete test case ${rowIndex + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}