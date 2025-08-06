"use client";

import React, { useMemo } from "react";
import { TestSet, getResultHistory, getResultStatistics } from "@/lib/testSetStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSet: TestSet;
  testCaseId?: string;
  versionIdentifier?: string;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  };

  return (
    <Badge variant="secondary" className={cn("capitalize", variants[status as keyof typeof variants])}>
      <StatusIcon status={status} />
      <span className="ml-1">{status}</span>
    </Badge>
  );
};

export function ResultHistoryDialog({
  open,
  onOpenChange,
  testSet,
  testCaseId,
  versionIdentifier,
}: ResultHistoryDialogProps) {
  const history = useMemo(() => 
    getResultHistory(testSet, testCaseId, versionIdentifier),
    [testSet, testCaseId, versionIdentifier]
  );

  const statistics = useMemo(() => 
    getResultStatistics(testSet, versionIdentifier),
    [testSet, versionIdentifier]
  );

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatExecutionTime = (executionTime?: number) => {
    if (!executionTime) return 'N/A';
    return `${executionTime}ms`;
  };

  const getTestCaseIndex = (testCaseId: string) => {
    const index = testSet.testCases.findIndex(tc => tc.id === testCaseId);
    return index >= 0 ? index + 1 : '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Result History
            {testCaseId && ` - Test Case #${getTestCaseIndex(testCaseId)}`}
            {versionIdentifier && ` - ${versionIdentifier}`}
          </DialogTitle>
          <DialogDescription>
            View historical test results and execution statistics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{statistics.totalTestCases}</div>
              <div className="text-sm text-muted-foreground">Total Tests</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{statistics.completedTests}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{statistics.failedTests}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{statistics.successRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>

          {statistics.averageExecutionTime > 0 && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                Average Execution Time: {formatExecutionTime(statistics.averageExecutionTime)}
              </div>
            </div>
          )}

          <Separator />

          {/* History List */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Execution History ({history.length} entries)
            </h3>
            
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No test results found
                {testCaseId && " for this test case"}
                {versionIdentifier && " for this version"}
                .
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={entry.result.status} />
                          {!testCaseId && (
                            <Badge variant="outline">
                              Test Case #{getTestCaseIndex(entry.testCaseId)}
                            </Badge>
                          )}
                          {!versionIdentifier && (
                            <Badge variant="outline">
                              {entry.versionIdentifier}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(entry.result.timestamp)}
                        </div>
                      </div>

                      {entry.result.executionTime && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Execution time: {formatExecutionTime(entry.result.executionTime)}
                        </div>
                      )}

                      {entry.result.content && (
                        <div>
                          <div className="text-sm font-medium mb-2">Result:</div>
                          <div className="bg-muted/50 rounded p-3 text-sm max-h-32 overflow-y-auto">
                            {entry.result.content}
                          </div>
                        </div>
                      )}

                      {entry.result.error && (
                        <div>
                          <div className="text-sm font-medium mb-2 text-red-600">Error:</div>
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-300">
                            {entry.result.error}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}