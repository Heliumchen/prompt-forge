"use client";

import React, { useState } from "react";
import { TestResult } from "@/lib/testSetStorage";
import { Button } from "@/components/ui/button";
import {
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultDiffDialog } from "./result-diff-dialog";

interface ResultCellProps {
  result?: TestResult;
  onRunTest: () => Promise<void>;
  testCaseIndex: number;
  className?: string;
  comparisonResult?: TestResult;
  currentVersionId?: string;
  comparisonVersionId?: string;
  isComparisonColumn?: boolean;
}

export function ResultCell({
  result,
  onRunTest,
  testCaseIndex,
  className,
  comparisonResult,
  currentVersionId,
  comparisonVersionId,
  isComparisonColumn = false,
}: ResultCellProps) {
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRunTest = async () => {
    setIsRetrying(true);
    try {
      await onRunTest();
    } catch (error) {
      console.error("Test execution failed:", error);
    } finally {
      // Keep the retrying state for a moment to show feedback
      setTimeout(() => setIsRetrying(false), 500);
    }
  };

  // Show run button if no result or if result is in error state
  if (!result || result.status === "error") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunTest}
          className="flex items-center gap-2"
          aria-label={`Run test case ${testCaseIndex + 1}`}
        >
          <Play className="h-3 w-3" />
          Run
        </Button>

        {result?.status === "error" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunTest}
            className="flex items-center gap-1 text-destructive hover:text-destructive"
            aria-label={`Retry test case ${testCaseIndex + 1}`}
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Show loading state
  if (result.status === "pending" || result.status === "running") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            {isRetrying
              ? "Running..."
              : result.status === "pending"
                ? "Pending..."
                : "Running..."}
          </span>
        </div>
        {result.status === "running" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunTest}
            disabled={isRetrying}
            className={cn(
              "flex items-center gap-1 text-xs transition-all",
              isRetrying && "opacity-50",
            )}
            aria-label={`Retry stuck test case ${testCaseIndex + 1}`}
            title="Test appears stuck. Click to retry."
          >
            <RotateCcw
              className={cn("h-3 w-3", isRetrying && "animate-spin")}
            />
            {isRetrying ? "Retrying..." : "Retry"}
          </Button>
        )}
      </div>
    );
  }

  // Show completed result
  if (result.status === "completed") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Completed</span>
          {result.executionTime && (
            <span className="text-xs text-muted-foreground">
              ({result.executionTime}ms)
            </span>
          )}
          {result.content && (
            <span className="text-xs text-muted-foreground">
              {result.content.length} chars
            </span>
          )}
        </div>

        {result.content && (
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <div className="max-h-32 overflow-y-auto custom-scrollbar">
              {result.content}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunTest}
            className="flex items-center gap-1 text-xs"
            aria-label={`Re-run test case ${testCaseIndex + 1}`}
          >
            <RotateCcw className="h-3 w-3" />
            Re-run
          </Button>

          {currentVersionId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiffDialog(true)}
              className="flex items-center gap-1 text-xs"
              aria-label={`Compare results for test case ${testCaseIndex + 1}`}
            >
              <GitCompare className="h-3 w-3" />
              Diff
            </Button>
          )}
        </div>

        <ResultDiffDialog
          open={showDiffDialog}
          onOpenChange={setShowDiffDialog}
          primaryResult={isComparisonColumn ? comparisonResult : result}
          comparisonResult={isComparisonColumn ? result : comparisonResult}
          primaryVersionId={
            isComparisonColumn
              ? comparisonVersionId || "comparison"
              : currentVersionId || "current"
          }
          comparisonVersionId={
            isComparisonColumn ? currentVersionId : comparisonVersionId
          }
          testCaseIndex={testCaseIndex}
        />
      </div>
    );
  }

  // Show error state
  if (result.status === "error") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Error</span>
        </div>

        {result.error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
            <div className="max-h-32 overflow-y-auto text-destructive">
              {result.error}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunTest}
            className="flex items-center gap-1 text-xs"
            aria-label={`Retry test case ${testCaseIndex + 1}`}
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>

          {currentVersionId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiffDialog(true)}
              className="flex items-center gap-1 text-xs"
              aria-label={`Compare results for test case ${testCaseIndex + 1}`}
            >
              <GitCompare className="h-3 w-3" />
              Diff
            </Button>
          )}
        </div>

        <ResultDiffDialog
          open={showDiffDialog}
          onOpenChange={setShowDiffDialog}
          primaryResult={isComparisonColumn ? comparisonResult : result}
          comparisonResult={isComparisonColumn ? result : comparisonResult}
          primaryVersionId={
            isComparisonColumn
              ? comparisonVersionId || "comparison"
              : currentVersionId || "current"
          }
          comparisonVersionId={
            isComparisonColumn ? currentVersionId : comparisonVersionId
          }
          testCaseIndex={testCaseIndex}
        />
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <>
      <div className={cn("text-muted-foreground text-sm", className)}>
        Unknown status
      </div>

      <ResultDiffDialog
        open={showDiffDialog}
        onOpenChange={setShowDiffDialog}
        primaryResult={isComparisonColumn ? comparisonResult : result}
        comparisonResult={isComparisonColumn ? result : comparisonResult}
        primaryVersionId={
          isComparisonColumn
            ? comparisonVersionId || "comparison"
            : currentVersionId || "current"
        }
        comparisonVersionId={
          isComparisonColumn ? currentVersionId : comparisonVersionId
        }
        testCaseIndex={testCaseIndex}
      />
    </>
  );
}
