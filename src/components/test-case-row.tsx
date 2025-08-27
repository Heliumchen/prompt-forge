"use client";

import React, { useState, useCallback } from "react";
import { TestCase } from "@/lib/testSetStorage";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResultCell } from "./result-cell";
import { ComparisonColumn } from "./comparison-controls";
import { Trash2, Copy } from "lucide-react";
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
  onUpdateMessages: (
    messages: Array<{ role: "user" | "assistant"; content: string }>,
  ) => void;
  onDelete: () => void;
  onDuplicate: () => void;
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
  onUpdateMessages,
  onDelete,
  onDuplicate,
  onRunTest,
  className,
}: TestCaseRowProps) {
  const [localVariableValues, setLocalVariableValues] = useState<
    Record<string, string>
  >(testCase.variableValues);
  const [localMessages, setLocalMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >(testCase.messages || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasUnsavedMessagesChanges, setHasUnsavedMessagesChanges] =
    useState(false);

  // Handle variable value changes with debounced save
  const handleVariableChange = useCallback(
    (variableName: string, value: string) => {
      const newValues = { ...localVariableValues, [variableName]: value };
      setLocalVariableValues(newValues);
      setHasUnsavedChanges(true);

      // Debounced save after 500ms of no changes
      const timeoutId = setTimeout(() => {
        onUpdateVariables(newValues);
        setHasUnsavedChanges(false);
      }, 500);

      return () => clearTimeout(timeoutId);
    },
    [localVariableValues, onUpdateVariables],
  );

  // Handle immediate save on blur
  const handleVariableBlur = useCallback(() => {
    if (hasUnsavedChanges) {
      onUpdateVariables(localVariableValues);
      setHasUnsavedChanges(false);
    }
  }, [hasUnsavedChanges, localVariableValues, onUpdateVariables]);

  // Handle messages changes with debounced save
  const handleMessagesChange = useCallback(
    (messagesText: string) => {
      try {
        const parsed = messagesText.trim() ? JSON.parse(messagesText) : [];

        // Validate format
        if (Array.isArray(parsed)) {
          for (const msg of parsed) {
            if (
              !msg.role ||
              !msg.content ||
              !["user", "assistant"].includes(msg.role)
            ) {
              throw new Error("Invalid message format");
            }
          }

          setLocalMessages(parsed);
          setHasUnsavedMessagesChanges(true);

          // Debounced save after 500ms of no changes
          const timeoutId = setTimeout(() => {
            onUpdateMessages(parsed);
            setHasUnsavedMessagesChanges(false);
          }, 500);

          return () => clearTimeout(timeoutId);
        }
      } catch {
        // Invalid JSON, don't update state
      }
    },
    [onUpdateMessages],
  );

  // Handle immediate save on blur for messages
  const handleMessagesBlur = useCallback(() => {
    if (hasUnsavedMessagesChanges) {
      onUpdateMessages(localMessages);
      setHasUnsavedMessagesChanges(false);
    }
  }, [hasUnsavedMessagesChanges, localMessages, onUpdateMessages]);

  const result = testCase.results[versionIdentifier];

  return (
    <tr
      className={cn(
        "border-b border-border hover:bg-muted/30 transition-colors",
        (hasUnsavedChanges || hasUnsavedMessagesChanges) &&
          "bg-yellow-50/50 dark:bg-yellow-900/10",
        selected && "bg-blue-50/50 dark:bg-blue-900/10",
        className,
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

      {/* Primary result cell */}
      <td className="px-4 py-3">
        <ResultCell
          result={result}
          onRunTest={() => onRunTest(versionIdentifier)}
          testCaseIndex={rowIndex}
          comparisonResult={
            comparisonColumns.length > 0 && comparisonColumns[0]
              ? testCase.results[comparisonColumns[0].versionIdentifier]
              : undefined
          }
          currentVersionId={versionIdentifier}
          comparisonVersionId={
            comparisonColumns.length > 0 && comparisonColumns[0]
              ? comparisonColumns[0].versionIdentifier
              : undefined
          }
        />
      </td>

      {/* Compare selector cell - always visible to match header, shows comparison result when active */}
      <td className="px-4 py-3 border-r border-l border-border">
        {comparisonColumns.length > 0 && comparisonColumns[0] ? (
          <ResultCell
            result={testCase.results[comparisonColumns[0].versionIdentifier]}
            onRunTest={() => onRunTest(comparisonColumns[0].versionIdentifier)}
            testCaseIndex={rowIndex}
            comparisonResult={result}
            currentVersionId={comparisonColumns[0].versionIdentifier}
            comparisonVersionId={versionIdentifier}
            isComparisonColumn={true}
          />
        ) : null}
      </td>

      {/* Variable value cells */}
      {variableNames.map((variableName) => (
        <td key={variableName} className="px-4 py-3 align-top">
          <AutoTextarea
            value={localVariableValues[variableName] || ""}
            onChange={(e) => handleVariableChange(variableName, e.target.value)}
            onBlur={handleVariableBlur}
            placeholder={`${variableName}`}
            maxHeight={220}
            className={cn(
              "min-w-[160px] custom-scrollbar",
              hasUnsavedChanges && "border-yellow-400 dark:border-yellow-600",
            )}
            aria-label={`${variableName} for test case ${rowIndex + 1}`}
          />
        </td>
      ))}

      {/* Messages cell */}
      <td className="px-4 py-3 align-top">
        <AutoTextarea
          value={JSON.stringify(localMessages, null, 2)}
          onChange={(e) => handleMessagesChange(e.target.value)}
          onBlur={handleMessagesBlur}
          placeholder='[{"role":"user","content":""}]'
          maxHeight={220}
          className={cn(
            "min-w-[160px] custom-scrollbar font-mono text-xs",
            hasUnsavedMessagesChanges &&
              "border-yellow-400 dark:border-yellow-600",
          )}
          aria-label={`Messages for test case ${rowIndex + 1}`}
        />
        {localMessages.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {localMessages.length} message
            {localMessages.length !== 1 ? "s" : ""}
          </div>
        )}
      </td>

      {/* Actions cell */}
      <td className="px-4 py-3 border-l border-border">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDuplicate}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Duplicate test case ${rowIndex + 1}`}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete test case ${rowIndex + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
