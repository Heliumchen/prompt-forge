"use client";

import React, { useState, useRef } from "react";
import { Upload, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TestSet, createTestCase, mergeTestSetVariables } from "@/lib/testSetStorage";
import { useTestSets } from "@/contexts/TestSetContext";

interface CSVImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  testSet: TestSet;
}

interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string>[];
  newVariables: string[];
  existingVariables: string[];
}

export function CSVImportDialog({ isOpen, onClose, onOpenChange, testSet }: CSVImportDialogProps) {
  const { updateTestSet } = useTestSets();
  const [isUploading, setIsUploading] = useState(false);
  const [csvData, setCSVData] = useState<ParsedCSVData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setCSVData(null);
    setError(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
    onOpenChange?.(open);
  };

  // Parse CSV content with proper handling of quoted fields and multiline content
  const parseCSV = (csvText: string): ParsedCSVData => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    // Parse CSV rows properly handling quoted fields
    const parseCSVRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;

      while (i < row.length) {
        const char = row[i];
        
        if (char === '"') {
          if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };

    // Reconstruct CSV properly by handling multiline quoted fields
    const reconstructCSV = (text: string): string[][] => {
      const rows: string[][] = [];
      const lines = text.split('\n');
      let currentRow = '';
      let inQuotes = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (currentRow) {
          currentRow += '\n' + line;
        } else {
          currentRow = line;
        }
        
        // Count quotes to determine if we're still inside a quoted field
        let quoteCount = 0;
        for (const char of currentRow) {
          if (char === '"') quoteCount++;
        }
        
        inQuotes = (quoteCount % 2) === 1;
        
        if (!inQuotes) {
          // Complete row found
          if (currentRow.trim()) {
            rows.push(parseCSVRow(currentRow));
          }
          currentRow = '';
        }
      }
      
      return rows;
    };

    const parsedRows = reconstructCSV(csvText.trim());
    if (parsedRows.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    // Parse header row
    const headers = parsedRows[0].map(header => 
      header.replace(/^"(.*)"$/, '$1').trim()
    );

    if (headers.length === 0) {
      throw new Error('CSV must contain at least one column header');
    }

    // Filter out empty headers and results columns
    const variableHeaders = headers.filter(header => 
      header && 
      !header.toLowerCase().includes('test case') &&
      !header.toLowerCase().includes('result')
    );

    if (variableHeaders.length === 0) {
      throw new Error('CSV must contain at least one variable column');
    }

    // Parse data rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < parsedRows.length; i++) {
      const values = parsedRows[i].map(value => 
        value.replace(/^"(.*)"$/, '$1').trim()
      );

      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} columns, but header has ${headers.length} columns`);
      }

      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (variableHeaders.includes(header)) {
          rowData[header] = values[index] || '';
        }
      });

      rows.push(rowData);
    }

    if (rows.length === 0) {
      throw new Error('CSV must contain at least one data row');
    }

    // Determine new vs existing variables
    const existingVariables = variableHeaders.filter(header => 
      testSet.variableNames.includes(header)
    );
    const newVariables = variableHeaders.filter(header => 
      !testSet.variableNames.includes(header)
    );

    return {
      headers: variableHeaders,
      rows,
      newVariables,
      existingVariables
    };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setCSVData(parsed);
      
      toast.success(`Successfully parsed CSV with ${parsed.rows.length} test cases`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!csvData) return;

    setIsUploading(true);
    try {
      // Start with the current test set
      let updatedTestSet = { ...testSet };

      // If there are new variables, add them to the test set
      if (csvData.newVariables.length > 0) {
        const allVariables = [...testSet.variableNames, ...csvData.newVariables];
        updatedTestSet = mergeTestSetVariables(updatedTestSet, allVariables);
      }

      // Create new test cases from CSV data
      const newTestCases = csvData.rows.map(rowData => {
        const testCase = createTestCase(updatedTestSet.variableNames);
        
        // Set variable values from CSV data
        Object.keys(rowData).forEach(variableName => {
          if (updatedTestSet.variableNames.includes(variableName)) {
            testCase.variableValues[variableName] = rowData[variableName];
          }
        });

        return testCase;
      });

      // Add new test cases to the test set (append mode)
      updatedTestSet = {
        ...updatedTestSet,
        testCases: [...updatedTestSet.testCases, ...newTestCases],
        updatedAt: new Date().toISOString()
      };

      // Update the test set
      updateTestSet(updatedTestSet);
      
      toast.success(`Successfully imported ${csvData.rows.length} test cases`);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import CSV data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import CSV to Test Set</DialogTitle>
          <DialogDescription>
            Import test cases from a CSV file. New variables will be automatically added to the test set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={triggerFileSelect}
            >
              <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select CSV file or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV format: Variable columns only (test case # and results columns will be ignored)
              </p>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* CSV Preview */}
          {csvData && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Import Preview</div>
              
              {/* Variables Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Existing Variables ({csvData.existingVariables.length})
                  </div>
                  <div className="text-xs">
                    {csvData.existingVariables.length > 0 
                      ? csvData.existingVariables.join(', ')
                      : 'None'
                    }
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    New Variables ({csvData.newVariables.length})
                  </div>
                  <div className="text-xs">
                    {csvData.newVariables.length > 0 
                      ? csvData.newVariables.join(', ')
                      : 'None'
                    }
                  </div>
                </div>
              </div>

              {/* Data Preview */}
              <div className="border rounded-lg p-3 max-h-40 overflow-auto">
                <div className="text-xs font-medium mb-2">
                  {csvData.rows.length} test cases to import
                </div>
                <div className="space-y-1">
                  {csvData.rows.slice(0, 3).map((row, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      Row {index + 1}: {Object.entries(row).map(([key, value]) => `${key}="${value}"`).join(', ')}
                    </div>
                  ))}
                  {csvData.rows.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      ... and {csvData.rows.length - 3} more rows
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!csvData || isUploading}
          >
            {isUploading ? "Importing..." : "Import Test Cases"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}