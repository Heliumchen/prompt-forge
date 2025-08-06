"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, PlusIcon, MinusIcon, InfoIcon } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { useTestSets } from "@/contexts/TestSetContext";
import { TestSet } from "@/lib/testSetStorage";

interface VariableConflict {
  type: 'removal' | 'addition';
  variable: string;
}

interface VariableSyncResult {
  updatedTestSet: TestSet;
  conflicts: VariableConflict[];
}

interface VariableSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSet: TestSet | null;
  onSync: (result: VariableSyncResult) => void;
}

export function VariableSyncDialog({
  open,
  onOpenChange,
  testSet,
  onSync,
}: VariableSyncDialogProps) {
  const { projects } = useProjects();
  const { syncVariablesFromVersion } = useTestSets();
  
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState<VariableSyncResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get the associated project
  const associatedProject = testSet 
    ? projects.find(p => p.uid === testSet.associatedProjectUid)
    : null;

  // Reset state when dialog opens/closes or testSet changes
  useEffect(() => {
    if (!open || !testSet) {
      setSelectedVersionId(null);
      setSyncResult(null);
      setShowConfirmation(false);
      setIsLoading(false);
    }
  }, [open, testSet]);

  // Handle version selection and preview synchronization
  const handleVersionSelect = (versionId: string) => {
    const versionIdNum = parseInt(versionId, 10);
    setSelectedVersionId(versionIdNum);
    
    if (testSet && associatedProject) {
      try {
        const result = syncVariablesFromVersion(
          testSet.uid,
          associatedProject.uid,
          versionIdNum
        );
        setSyncResult(result);
        
        // Show confirmation if there are removal conflicts
        const hasRemovals = result.conflicts.some(c => c.type === 'removal');
        setShowConfirmation(hasRemovals);
      } catch (error) {
        console.error('Error previewing synchronization:', error);
        setSyncResult(null);
      }
    }
  };

  // Handle synchronization confirmation
  const handleConfirmSync = () => {
    if (syncResult) {
      setIsLoading(true);
      try {
        onSync(syncResult);
        onOpenChange(false);
      } catch (error) {
        console.error('Error applying synchronization:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle direct sync (no confirmation needed)
  const handleDirectSync = () => {
    if (syncResult) {
      handleConfirmSync();
    }
  };

  // Render conflict list
  const renderConflicts = (conflicts: VariableConflict[]) => {
    const additions = conflicts.filter(c => c.type === 'addition');
    const removals = conflicts.filter(c => c.type === 'removal');

    return (
      <div className="space-y-3">
        {additions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <PlusIcon className="size-4" />
              Variables to be added ({additions.length})
            </div>
            <div className="pl-6 space-y-1">
              {additions.map(conflict => (
                <div key={conflict.variable} className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {conflict.variable}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        {removals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
              <MinusIcon className="size-4" />
              Variables to be removed ({removals.length})
            </div>
            <div className="pl-6 space-y-1">
              {removals.map(conflict => (
                <div key={conflict.variable} className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {conflict.variable}
                  </code>
                </div>
              ))}
            </div>
            <div className="pl-6 mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="size-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <div className="font-medium">Warning: Data will be lost</div>
                  <div className="mt-1">
                    Removing these variables will delete all associated test case data. 
                    This action cannot be undone.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!testSet || !associatedProject) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Synchronize Variables</DialogTitle>
          <DialogDescription>
            Synchronize test set variables with a project version. This will update 
            the table structure to match the selected version&apos;s variables.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project and Test Set Info */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Test Set:</span> {testSet.name}
            </div>
            <div className="text-sm">
              <span className="font-medium">Project:</span> {associatedProject.name}
            </div>
            <div className="text-sm">
              <span className="font-medium">Current Variables:</span>{" "}
              {testSet.variableNames.length > 0 ? (
                <span className="text-muted-foreground">
                  {testSet.variableNames.join(", ")}
                </span>
              ) : (
                <span className="text-muted-foreground italic">None</span>
              )}
            </div>
          </div>

          {/* Version Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Version to Sync With</label>
            <Select value={selectedVersionId?.toString() || ""} onValueChange={handleVersionSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project version..." />
              </SelectTrigger>
              <SelectContent>
                {associatedProject.versions
                  .sort((a, b) => b.id - a.id) // Show newest versions first
                  .map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>Version {version.id}</span>
                        {version.id === associatedProject.currentVersion && (
                          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                        {version.description && (
                          <span className="text-muted-foreground">- {version.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Synchronization Preview */}
          {syncResult && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Synchronization Preview</h4>
                
                {syncResult.conflicts.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <InfoIcon className="size-4" />
                    No changes needed - variables are already synchronized
                  </div>
                ) : (
                  renderConflicts(syncResult.conflicts)
                )}
              </div>
            </div>
          )}

          {/* Confirmation Dialog Content */}
          {showConfirmation && syncResult && (
            <div className="border-t pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangleIcon className="size-5" />
                  <span className="font-medium">Confirmation Required</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This synchronization will remove variables and their associated test case data. 
                  Are you sure you want to continue?
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {syncResult && (
            <>
              {showConfirmation ? (
                <Button 
                  variant="destructive" 
                  onClick={handleConfirmSync}
                  disabled={isLoading}
                >
                  {isLoading ? "Synchronizing..." : "Confirm & Synchronize"}
                </Button>
              ) : (
                <Button 
                  onClick={handleDirectSync}
                  disabled={isLoading || syncResult.conflicts.length === 0}
                >
                  {isLoading ? "Synchronizing..." : "Synchronize"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}