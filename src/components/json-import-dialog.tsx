"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { extractVariableNames, extractVariablesFromSystemMessage } from "@/lib/variableUtils";
import { Project, Version } from "@/lib/storage";

interface JSONImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  jsonData: string;
  project: Project;
  onImport: (variableValues: Record<string, string>, messages: Array<{role: string, content: string}>) => void;
}

interface ParsedJSONData {
  messages: Array<{role: string, content: string}>;
  extractedVariables: Record<string, string>;
  allVariableNames: string[];
  isValid: boolean;
  error?: string;
}

function parseMessagesJSON(jsonData: string, selectedVersion: Version): ParsedJSONData {
  try {
    const parsed = JSON.parse(jsonData);
    
    // Ensure it's an array
    if (!Array.isArray(parsed)) {
      return {
        messages: [],
        extractedVariables: {},
        allVariableNames: [],
        isValid: false,
        error: "JSON must be an array of messages"
      };
    }

    // Validate message format
    const messages: Array<{role: string, content: string}> = [];
    let systemMessage: {role: string, content: string} | null = null;
    
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || !item.role || !item.content) {
        return {
          messages: [],
          extractedVariables: {},
          allVariableNames: [],
          isValid: false,
          error: "Each message must have 'role' and 'content' properties"
        };
      }
      
      if (item.role === 'system') {
        systemMessage = { role: item.role, content: item.content };
      } else {
        messages.push({ role: item.role, content: item.content });
      }
    }

    // Extract variables from selected version's prompts
    const allVariableNames: string[] = [];
    selectedVersion.data.prompts.forEach(prompt => {
      const variables = extractVariableNames(prompt.content);
      variables.forEach(varName => {
        if (!allVariableNames.includes(varName)) {
          allVariableNames.push(varName);
        }
      });
    });

    // Extract variable values from system message if it exists
    const extractedVariables = systemMessage
      ? extractVariablesFromSystemMessage(systemMessage.content, selectedVersion.data.prompts.map(p => p.content))
      : {};

    return {
      messages,
      extractedVariables,
      allVariableNames,
      isValid: true
    };
  } catch (error) {
    return {
      messages: [],
      extractedVariables: {},
      allVariableNames: [],
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid JSON format"
    };
  }
}


export function JSONImportDialog({ 
  isOpen, 
  onClose, 
  onOpenChange, 
  jsonData, 
  project,
  onImport 
}: JSONImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number>(project.currentVersion);
  
  // Get the selected version
  const selectedVersion = project.versions.find(v => v.id === selectedVersionId) || project.versions.find(v => v.id === project.currentVersion);
  
  const parsedData = selectedVersion ? parseMessagesJSON(jsonData, selectedVersion) : null;

  const handleClose = () => {
    setSelectedVersionId(project.currentVersion); // Reset to current version
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      setSelectedVersionId(project.currentVersion); // Reset to current version when opening
    }
    onOpenChange?.(open);
  };

  const handleImport = async () => {
    if (!parsedData || !parsedData.isValid) return;

    setIsProcessing(true);
    try {
      onImport(parsedData.extractedVariables, parsedData.messages);
      toast.success(`Successfully imported ${parsedData.messages.length} messages and extracted ${Object.keys(parsedData.extractedVariables).length} variables`);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import JSON data';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import JSON Messages</DialogTitle>
          <DialogDescription>
            Import messages from JSON array and extract variable values from system prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Selector */}
          <div className="space-y-2">
            <Label htmlFor="version-select">Template Version</Label>
            <Select 
              value={selectedVersionId.toString()} 
              onValueChange={(value) => setSelectedVersionId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {project.versions.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    Version {version.id}
                    {version.id === project.currentVersion && " (Current)"}
                    {version.description && ` - ${version.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select which version&apos;s prompt template to use for variable extraction
            </p>
          </div>

          {/* Error Display */}
          {parsedData && !parsedData.isValid && parsedData.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parsedData.error}</AlertDescription>
            </Alert>
          )}

          {/* Success Preview */}
          {parsedData && parsedData.isValid && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium">Import Preview</div>
              </div>
              
              {/* Variables Summary */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Variable Values ({Object.keys(parsedData.extractedVariables).length} extracted)
                </div>
                {Object.keys(parsedData.extractedVariables).length > 0 ? (
                  <div className="border rounded-lg p-3 max-h-32 overflow-auto space-y-1">
                    {Object.entries(parsedData.extractedVariables).map(([name, value]) => (
                      <div key={name} className="text-xs">
                        <span className="font-mono text-blue-600">{`{{${name}}}`}</span>
                        <span className="text-muted-foreground"> = </span>
                        <span className="text-foreground">&quot;{value}&quot;</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No variables could be extracted from the system message
                  </div>
                )}
              </div>

              {/* Messages Summary */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Messages to Import ({parsedData.messages.length})
                </div>
                {parsedData.messages.length > 0 ? (
                  <div className="border rounded-lg p-3 max-h-40 overflow-auto space-y-2">
                    {parsedData.messages.slice(0, 3).map((message, index) => (
                      <div key={index} className="text-xs">
                        <span className="font-medium capitalize">{message.role}:</span>
                        <span className="text-muted-foreground ml-2">
                          {message.content.length > 100 
                            ? `${message.content.substring(0, 100)}...` 
                            : message.content
                          }
                        </span>
                      </div>
                    ))}
                    {parsedData.messages.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        ... and {parsedData.messages.length - 3} more messages
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No non-system messages found in JSON
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!parsedData || !parsedData.isValid || isProcessing}
          >
            {isProcessing ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}