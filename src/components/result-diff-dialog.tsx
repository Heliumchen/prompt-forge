"use client";

import React from "react";
import { TestResult } from "@/lib/testSetStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface ResultDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryResult?: TestResult;
  comparisonResult?: TestResult;
  primaryVersionId: string;
  comparisonVersionId?: string;
  testCaseIndex: number;
}

function ResultDisplay({ 
  result, 
  versionId, 
  title 
}: { 
  result?: TestResult; 
  versionId: string;
  title: string;
}) {
  if (!result) {
    return (
      <div className="flex-1 space-y-3">
        <div className="font-medium text-foreground border-b pb-2">
          {title} ({versionId})
        </div>
        <div className="text-muted-foreground text-sm italic">
          No result available
        </div>
      </div>
    );
  }

  const getStatusDisplay = () => {
    switch (result.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Completed</span>
            {result.executionTime && (
              <span className="text-xs text-muted-foreground">
                ({result.executionTime}ms)
              </span>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Error</span>
          </div>
        );
      case 'pending':
      case 'running':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {result.status === 'pending' ? 'Pending...' : 'Running...'}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const getContentDisplay = () => {
    if (result.status === 'completed' && result.content) {
      return (
        <div className="bg-muted/50 rounded-md p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto max-h-96">
            {result.content}
          </pre>
        </div>
      );
    }
    
    if (result.status === 'error' && result.error) {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
          <pre className="whitespace-pre-wrap text-sm text-destructive overflow-auto max-h-96">
            {result.error}
          </pre>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex-1 space-y-3">
      <div className="font-medium text-foreground border-b pb-2">
        {title} ({versionId})
      </div>
      {getStatusDisplay()}
      {getContentDisplay()}
    </div>
  );
}

export function ResultDiffDialog({
  open,
  onOpenChange,
  primaryResult,
  comparisonResult,
  primaryVersionId,
  comparisonVersionId,
  testCaseIndex,
}: ResultDiffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Test Result Comparison - Test Case {testCaseIndex + 1}
          </DialogTitle>
          <DialogDescription>
            Compare results between {primaryVersionId} and {comparisonVersionId || 'comparison version'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-6 flex-1 overflow-hidden">
          <ResultDisplay 
            result={primaryResult}
            versionId={primaryVersionId}
            title="Primary Result"
          />
          
          <div className="w-px bg-border flex-shrink-0" />
          
          <ResultDisplay 
            result={comparisonResult}
            versionId={comparisonVersionId || 'comparison'}
            title="Comparison Result"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}