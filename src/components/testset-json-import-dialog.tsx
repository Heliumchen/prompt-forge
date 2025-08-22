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
import { useProjects } from "@/contexts/ProjectContext";
import { extractVariablesFromSystemMessage } from "@/lib/variableUtils";
import { Version } from "@/lib/storage";

interface TestSetJSONImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  jsonData: string;
  associatedProjectUid: string;
  onImport: (testCases: Array<{
    variableValues: Record<string, string>;
    messages: Array<{role: 'user' | 'assistant', content: string}>;
  }>) => void;
}

interface ParsedTestSetData {
  testCases: Array<{
    variableValues: Record<string, string>;
    messages: Array<{role: 'user' | 'assistant', content: string}>;
  }>;
  isValid: boolean;
  error?: string;
}


function parseTestSetJSON(jsonData: string, selectedVersion: Version): ParsedTestSetData {
  const projectPrompts = selectedVersion.data.prompts.map(p => p.content);
  try {
    const parsed = JSON.parse(jsonData);
    
    // Check if this is a messages array format
    if (Array.isArray(parsed) && parsed.length > 0 && 
        parsed.every(item => item && typeof item === 'object' && 'role' in item && 'content' in item)) {
      
      // This is a messages array - create a single test case
      const messages: Array<{role: 'user' | 'assistant', content: string}> = [];
      let systemMessage: {role: string, content: string} | null = null;
      
      // Separate system and other messages
      for (const [index, item] of parsed.entries()) {
        if (!item.role || !item.content) {
          return {
            testCases: [],
            isValid: false,
            error: `Message at index ${index} must have 'role' and 'content' properties`
          };
        }
        
        if (item.role === 'system') {
          systemMessage = { role: item.role, content: String(item.content) };
        } else if (['user', 'assistant'].includes(String(item.role))) {
          messages.push({
            role: String(item.role) as 'user' | 'assistant',
            content: String(item.content)
          });
        }
      }
      
      // Extract variable values from system message if available
      const variableValues = systemMessage && projectPrompts.length > 0
        ? extractVariablesFromSystemMessage(systemMessage.content, projectPrompts)
        : {};
      
      return {
        testCases: [{
          variableValues,
          messages
        }],
        isValid: true
      };
    }
    
    // Handle test case object format (original logic)
    let testCases: Array<unknown>;
    
    if (Array.isArray(parsed)) {
      // Direct array of test cases
      testCases = parsed;
    } else if (parsed && typeof parsed === 'object' && 'testCases' in parsed && 
               parsed.testCases && Array.isArray(parsed.testCases)) {
      // Object with testCases property
      testCases = parsed.testCases;
    } else {
      // Single test case object
      testCases = [parsed];
    }
    
    const validatedTestCases: Array<{
      variableValues: Record<string, string>;
      messages: Array<{role: 'user' | 'assistant', content: string}>;
    }> = [];
    
    for (const [index, testCase] of testCases.entries()) {
      if (!testCase || typeof testCase !== 'object') {
        return {
          testCases: [],
          isValid: false,
          error: `Test case at index ${index} must be an object`
        };
      }
      
      // Extract variable values
      const variableValues: Record<string, string> = {};
      if (testCase && typeof testCase === 'object' && 'variableValues' in testCase && 
          testCase.variableValues && typeof testCase.variableValues === 'object') {
        Object.entries(testCase.variableValues).forEach(([key, value]) => {
          variableValues[key] = String(value || '');
        });
      } else if (testCase && typeof testCase === 'object') {
        // If no variableValues, try to extract from other properties
        Object.entries(testCase).forEach(([key, value]) => {
          if (key !== 'messages' && typeof value === 'string') {
            variableValues[key] = value;
          }
        });
      }
      
      // Extract messages
      const messages: Array<{role: 'user' | 'assistant', content: string}> = [];
      if (testCase && typeof testCase === 'object' && 'messages' in testCase && 
          testCase.messages && Array.isArray(testCase.messages)) {
        for (const [msgIndex, msg] of testCase.messages.entries()) {
          if (!msg || typeof msg !== 'object' || 
              !('role' in msg) || !('content' in msg) || 
              !msg.role || !msg.content) {
            return {
              testCases: [],
              isValid: false,
              error: `Message at index ${msgIndex} in test case ${index} must have 'role' and 'content' properties`
            };
          }
          
          if (!['user', 'assistant'].includes(String(msg.role))) {
            return {
              testCases: [],
              isValid: false,
              error: `Message at index ${msgIndex} in test case ${index} must have role 'user' or 'assistant'`
            };
          }
          
          messages.push({
            role: String(msg.role) as 'user' | 'assistant',
            content: String(msg.content)
          });
        }
      }
      
      validatedTestCases.push({
        variableValues,
        messages
      });
    }
    
    if (validatedTestCases.length === 0) {
      return {
        testCases: [],
        isValid: false,
        error: "No valid test cases found in JSON"
      };
    }
    
    return {
      testCases: validatedTestCases,
      isValid: true
    };
  } catch (error) {
    return {
      testCases: [],
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid JSON format"
    };
  }
}

export function TestSetJSONImportDialog({ 
  isOpen, 
  onClose, 
  onOpenChange, 
  jsonData,
  associatedProjectUid,
  onImport 
}: TestSetJSONImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { projects } = useProjects();
  
  // Get the associated project
  const associatedProject = projects.find(p => p.uid === associatedProjectUid);
  const [selectedVersionId, setSelectedVersionId] = useState<number>(associatedProject?.currentVersion || 1);
  
  // Get the selected version
  const selectedVersion = associatedProject?.versions.find(v => v.id === selectedVersionId) || associatedProject?.versions.find(v => v.id === associatedProject?.currentVersion);
  
  const parsedData = selectedVersion ? parseTestSetJSON(jsonData, selectedVersion) : null;

  const handleClose = () => {
    if (associatedProject) {
      setSelectedVersionId(associatedProject.currentVersion); // Reset to current version
    }
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      if (associatedProject) {
        setSelectedVersionId(associatedProject.currentVersion); // Reset to current version when opening
      }
    }
    onOpenChange?.(open);
  };

  const handleImport = async () => {
    if (!parsedData || !parsedData.isValid) return;

    setIsProcessing(true);
    try {
      onImport(parsedData.testCases);
      toast.success(`Successfully imported ${parsedData.testCases.length} test case${parsedData.testCases.length !== 1 ? 's' : ''}`);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import test cases';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Test Cases from JSON</DialogTitle>
          <DialogDescription>
            Import test cases with variable values and messages from JSON data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Selector */}
          {associatedProject && (
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
                  {associatedProject.versions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      Version {version.id}
                      {version.id === associatedProject.currentVersion && " (Current)"}
                      {version.description && ` - ${version.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which version&apos;s prompt template to use for variable extraction
              </p>
            </div>
          )}

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
              
              {/* Test Cases Summary */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Test Cases to Import ({parsedData.testCases.length})
                </div>
                <div className="border rounded-lg p-3 max-h-40 overflow-auto space-y-2">
                  {parsedData.testCases.slice(0, 3).map((testCase, index) => (
                    <div key={index} className="text-xs border-b last:border-b-0 pb-2 last:pb-0">
                      <div className="font-medium">Test Case {index + 1}:</div>
                      <div className="ml-2 space-y-1">
                        <div>
                          <span className="text-muted-foreground">Variables: </span>
                          {Object.keys(testCase.variableValues).length > 0 ? (
                            <div className="space-y-1 mt-1">
                              {Object.entries(testCase.variableValues).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-mono text-blue-600">{`{{${key}}}`}</span>
                                  <span className="text-muted-foreground"> = </span>
                                  <span className="text-foreground">&quot;{value}&quot;</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          Messages: {testCase.messages.length}
                        </div>
                      </div>
                    </div>
                  ))}
                  {parsedData.testCases.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      ... and {parsedData.testCases.length - 3} more test cases
                    </div>
                  )}
                </div>
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