"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getTestSets,
  saveTestSet as saveTestSetToStorage,
  deleteTestSet as deleteTestSetFromStorage,
  createTestSet,
  createTestResult,
  addTestCase as addTestCaseToTestSet,
  duplicateTestCase as duplicateTestCaseInTestSet,
  updateTestCase as updateTestCaseInTestSet,
  deleteTestCase as deleteTestCaseFromTestSet,
  updateTestResult,
  updateTestSetUIState,
  clearResultHistory,
  getResultStatistics,
  testSetNameExists,
  generateUniqueTestSetName,
  synchronizeTestSetVariables,
  detectVariableDifferences,
  validateSynchronizationOperation,
  VariableConflict,
  VariableSyncResult,
  TestSet,
  TestCase,
  TestResult,
  TestSetUIState,
} from "@/lib/testSetStorage";
import {
  getProjectByUid,
  extractVariablesFromPrompts,
} from "@/lib/storage";
import { processTemplate } from "@/lib/variableUtils";
import { LLMClient } from "@/lib/openrouter";
import { ChatMessage } from "@/lib/openrouter/types";



interface TestSetContextType {
  testSets: TestSet[];
  currentTestSet: TestSet | null;
  setCurrentTestSet: (testSet: TestSet | null) => void;
  
  // Test set CRUD operations
  addTestSet: (name: string, associatedProjectUid: string) => TestSet;
  updateTestSet: (testSet: TestSet) => void;
  deleteTestSet: (uid: string) => void;
  getTestSetsByProject: (projectUid: string) => TestSet[];
  
  // Test case management
  addTestCase: (testSetUid: string) => void;
  duplicateTestCase: (testSetUid: string, caseId: string) => void;
  updateTestCase: (testSetUid: string, caseId: string, variableValues: Record<string, string>) => void;
  deleteTestCase: (testSetUid: string, caseId: string) => void;
  bulkDeleteTestCases: (testSetUid: string, caseIds: string[]) => void;
  
  // Variable synchronization
  syncVariablesFromVersion: (testSetUid: string, projectUid: string, versionId: number) => VariableSyncResult;
  detectVariableDifferences: (testSetUid: string, projectUid: string, versionId: number) => VariableConflict[];
  validateSynchronizationOperation: (testSetUid: string, projectUid: string, versionId: number) => void;
  
  // Test execution
  runSingleTest: (testSetUid: string, caseId: string, targetVersion: number, versionIdentifier?: string) => Promise<void>;
  runAllTests: (testSetUid: string, targetVersion: number, versionIdentifier?: string) => Promise<void>;
  runAllTestsForced: (testSetUid: string, targetVersion: number, versionIdentifier?: string) => Promise<void>;
  cancelBatchExecution: (testSetUid: string) => void;
  isBatchRunning: (testSetUid: string) => boolean;
  
  // Result management
  updateTestResult: (testSetUid: string, caseId: string, versionIdentifier: string, result: TestResult) => void;

  clearResultHistory: (testSetUid: string, caseId: string, versionIdentifier: string) => void;
  getResultStatistics: (testSetUid: string, versionIdentifier?: string) => {
    totalTestCases: number;
    completedTests: number;
    failedTests: number;
    pendingTests: number;
    runningTests: number;
    successRate: number;
    averageExecutionTime: number;
  };
  
  // UI state management
  updateTestSetUIState: (testSetUid: string, uiState: Partial<TestSetUIState>) => void;
  
  // Utility functions
  isTestSetNameUnique: (name: string, projectUid: string, excludeUid?: string) => boolean;
  generateUniqueTestSetName: (baseName: string, projectUid: string) => string;
}

const TestSetContext = createContext<TestSetContextType | undefined>(undefined);

export const TestSetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [currentTestSet, setCurrentTestSet] = useState<TestSet | null>(null);
  const [batchExecutionControllers, setBatchExecutionControllers] = useState<Map<string, AbortController>>(new Map());

  // Load test sets on initialization
  useEffect(() => {
    const loadedTestSets = getTestSets();
    setTestSets(loadedTestSets);

    // Don't automatically select the first test set
    // Let user explicitly choose which test set to work with
  }, []);

  // Helper function to update test sets state and sync with current test set
  const updateTestSetsState = (updatedTestSets: TestSet[]) => {
    setTestSets(updatedTestSets);
    
    // Update current test set if it was modified
    if (currentTestSet) {
      const updatedCurrentTestSet = updatedTestSets.find(ts => ts.uid === currentTestSet.uid);
      if (updatedCurrentTestSet) {
        setCurrentTestSet(updatedCurrentTestSet);
      } else {
        // Current test set was deleted
        setCurrentTestSet(null);
      }
    }
  };

  // Test set CRUD operations
  const addTestSet = (name: string, associatedProjectUid: string): TestSet => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Test set name is required');
    }

    if (!associatedProjectUid || typeof associatedProjectUid !== 'string') {
      throw new Error('Associated project UID is required');
    }

    // Ensure unique name
    const uniqueName = generateUniqueTestSetName(name.trim(), associatedProjectUid);
    const newTestSet = createTestSet(uniqueName, associatedProjectUid);
    
    saveTestSetToStorage(newTestSet);
    const updatedTestSets = [...testSets, newTestSet];
    updateTestSetsState(updatedTestSets);
    
    return newTestSet;
  };

  const updateTestSet = (updatedTestSet: TestSet) => {
    if (!updatedTestSet || !updatedTestSet.uid) {
      throw new Error('Invalid test set');
    }

    saveTestSetToStorage(updatedTestSet);
    const updatedTestSets = testSets.map(ts => 
      ts.uid === updatedTestSet.uid ? updatedTestSet : ts
    );
    updateTestSetsState(updatedTestSets);
  };

  const deleteTestSet = (uid: string) => {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Test set UID is required');
    }

    deleteTestSetFromStorage(uid);
    const updatedTestSets = testSets.filter(ts => ts.uid !== uid);
    updateTestSetsState(updatedTestSets);
  };

  const getTestSetsByProjectFn = (projectUid: string): TestSet[] => {
    if (!projectUid || typeof projectUid !== 'string') {
      return [];
    }

    return testSets.filter(ts => ts.associatedProjectUid === projectUid);
  };

  // Test case management
  const addTestCase = (testSetUid: string) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const updatedTestSet = addTestCaseToTestSet(testSet);
    updateTestSet(updatedTestSet);
  };

  const duplicateTestCase = (testSetUid: string, caseId: string) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const updatedTestSet = duplicateTestCaseInTestSet(testSet, caseId);
    updateTestSet(updatedTestSet);
  };

  const updateTestCase = (
    testSetUid: string, 
    caseId: string, 
    variableValues: Record<string, string>
  ) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const updatedTestSet = updateTestCaseInTestSet(testSet, caseId, variableValues);
    updateTestSet(updatedTestSet);
  };

  const deleteTestCase = (testSetUid: string, caseId: string) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const updatedTestSet = deleteTestCaseFromTestSet(testSet, caseId);
    updateTestSet(updatedTestSet);
  };

  const bulkDeleteTestCases = (testSetUid: string, caseIds: string[]) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      throw new Error('Case IDs must be a non-empty array');
    }

    // Filter out the test cases to delete
    const updatedTestCases = testSet.testCases.filter(tc => !caseIds.includes(tc.id));
    
    const updatedTestSet = {
      ...testSet,
      testCases: updatedTestCases,
      updatedAt: new Date().toISOString()
    };

    updateTestSet(updatedTestSet);
  };

  // Variable synchronization
  const syncVariablesFromVersion = (
    testSetUid: string, 
    projectUid: string, 
    versionId: number
  ): VariableSyncResult => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const project = getProjectByUid(projectUid);
    if (!project) {
      throw new Error('Project not found');
    }

    const version = project.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Extract variables from the version's prompts
    const versionVariables = extractVariablesFromPrompts(version.data.prompts || []);
    
    // Use enhanced synchronization logic
    return synchronizeTestSetVariables(testSet, versionVariables);
  };

  const detectVariableDifferencesFn = (
    testSetUid: string, 
    projectUid: string, 
    versionId: number
  ): VariableConflict[] => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const project = getProjectByUid(projectUid);
    if (!project) {
      throw new Error('Project not found');
    }

    const version = project.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Extract variables from the version's prompts
    const versionVariables = extractVariablesFromPrompts(version.data.prompts || []);
    
    // Detect differences using enhanced logic
    return detectVariableDifferences(testSet, versionVariables);
  };

  const validateSynchronizationOperationFn = (
    testSetUid: string, 
    projectUid: string, 
    versionId: number
  ): void => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const project = getProjectByUid(projectUid);
    if (!project) {
      throw new Error('Project not found');
    }

    const version = project.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Extract variables from the version's prompts
    const versionVariables = extractVariablesFromPrompts(version.data.prompts || []);
    
    // Validate synchronization operation
    validateSynchronizationOperation(testSet, versionVariables);
  };

  // Helper function to determine if an error is retryable
  const isRetryableError = (error: Error): boolean => {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /rate limit/i,
      /429/,
      /502/,
      /503/,
      /504/,
      /connection/i,
      /temporary/i
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  };

  // Helper function to get detailed error message
  const getDetailedErrorMessage = (error: Error): string => {
    if (error.message.includes('429')) {
      return 'Rate limit exceeded. Please wait before retrying or reduce concurrent requests.';
    }
    if (error.message.includes('401')) {
      return 'Authentication failed. Please check your API key configuration.';
    }
    if (error.message.includes('403')) {
      return 'Access forbidden. Please verify your API key permissions.';
    }
    if (error.message.includes('404')) {
      return 'Model not found. Please check your model configuration.';
    }
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
      return 'Server error. This is usually temporary, please try again.';
    }
    if (error.message.toLowerCase().includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (error.message.toLowerCase().includes('timeout')) {
      return 'Request timed out. The model may be taking too long to respond.';
    }
    
    return error.message;
  };

  // Test execution with retry logic
  const runSingleTest = async (
    testSetUid: string, 
    caseId: string, 
    targetVersion: number,
    versionIdentifier?: string,
    retryCount: number = 0
  ): Promise<void> => {
    const maxRetries = 2;
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const testCase = testSet.testCases.find(tc => tc.id === caseId);
    if (!testCase) {
      throw new Error('Test case not found');
    }

    const project = getProjectByUid(testSet.associatedProjectUid);
    if (!project) {
      throw new Error('Associated project not found');
    }

    const version = project.versions.find(v => v.id === targetVersion);
    if (!version) {
      throw new Error('Target version not found');
    }

    const identifier = versionIdentifier || `v${targetVersion}`;
    const startTime = Date.now();

    try {
      // Only set pending/running status on first attempt
      if (retryCount === 0) {
        // Create pending result
        const pendingResult = createTestResult('', 'pending');
        updateTestResultFn(testSetUid, caseId, identifier, pendingResult);

        // Update to running status
        const runningResult = createTestResult('', 'running');
        updateTestResultFn(testSetUid, caseId, identifier, runningResult);
      }

      // Validate prompts exist
      if (!version.data.prompts || version.data.prompts.length === 0) {
        throw new Error('No prompts found in version. Please add prompts to test.');
      }

      // Process prompts with test case variables
      const processedPrompts = version.data.prompts.map(prompt => {
        try {
          return {
            ...prompt,
            content: processTemplate(prompt.content, 
              Object.entries(testCase.variableValues).map(([name, value]) => ({ name, value }))
            )
          };
        } catch (templateError) {
          throw new Error(`Template processing failed for prompt ${prompt.id}: ${templateError instanceof Error ? templateError.message : 'Unknown template error'}`);
        }
      });

      // Convert prompts to chat messages format
      const messages: ChatMessage[] = processedPrompts.map(prompt => ({
        role: prompt.role,
        content: prompt.content,
        image_urls: prompt.image_urls
      }));

      // Validate messages
      if (messages.length === 0) {
        throw new Error('No valid messages to send. Please check your prompts.');
      }

      // Get API key from localStorage (following existing pattern)
      const apiKeysStr = localStorage.getItem('apiKeys');
      if (!apiKeysStr) {
        throw new Error('OpenRouter API key not found. Please configure your API key in settings.');
      }
      
      const apiKeys = JSON.parse(apiKeysStr);
      const apiKey = apiKeys.OpenRouter;
      if (!apiKey) {
        throw new Error('OpenRouter API key not found. Please configure your API key in settings.');
      }

      // Get model configuration from version or use default
      const modelConfig = version.data.modelConfig;
      if (!modelConfig || !modelConfig.model) {
        throw new Error('No model configuration found in version. Please configure a model.');
      }

      // Create LLM client and execute test
      const llmClient = new LLMClient(apiKey);
      
      console.log(`Executing test case ${caseId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      const response = await llmClient.chat(messages, {
        model: modelConfig.model,
        temperature: modelConfig.temperature || 1.0,
        max_tokens: modelConfig.max_tokens || 1024,
        top_p: modelConfig.top_p,
        frequency_penalty: modelConfig.frequency_penalty,
        presence_penalty: modelConfig.presence_penalty,
        stream: false // For test execution, we want the complete response
      });

      const executionTime = Date.now() - startTime;
      
      // Validate response
      if (typeof response !== 'string' || response.trim().length === 0) {
        throw new Error('Empty or invalid response from model');
      }
      
      // Create completed result
      const completedResult = createTestResult(
        response,
        'completed',
        undefined,
        executionTime
      );
      
      updateTestResultFn(testSetUid, caseId, identifier, completedResult);
      
      console.log(`Test case ${caseId} completed successfully`);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const detailedErrorMessage = error instanceof Error ? getDetailedErrorMessage(error) : errorMessage;
      
      console.error(`Test case ${caseId} failed (attempt ${retryCount + 1}):`, errorMessage);
      
      // Check if we should retry
      if (retryCount < maxRetries && error instanceof Error && isRetryableError(error)) {
        console.log(`Retrying test case ${caseId} in ${(retryCount + 1) * 1000}ms...`);
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        
        // Retry the test
        return runSingleTest(testSetUid, caseId, targetVersion, versionIdentifier, retryCount + 1);
      }
      
      // Create error result with detailed message
      const errorResult = createTestResult(
        '',
        'error',
        `${detailedErrorMessage}${retryCount > 0 ? ` (failed after ${retryCount + 1} attempts)` : ''}`,
        executionTime
      );
      
      updateTestResultFn(testSetUid, caseId, identifier, errorResult);
      
      // Log the error for debugging
      console.error(`Test case ${caseId} failed permanently:`, {
        error: errorMessage,
        retryCount,
        executionTime,
        testSetUid,
        targetVersion
      });
    }
  };

  const runAllTests = async (
    testSetUid: string, 
    targetVersion: number,
    versionIdentifier?: string
  ): Promise<void> => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const identifier = versionIdentifier || `v${targetVersion}`;

    // Filter test cases that don't have results for this version or have error status
    const testCasesToRun = testSet.testCases.filter(testCase => 
      !testCase.results[identifier] || 
      testCase.results[identifier].status === 'error'
    );

    return runTestsInternal(testSetUid, targetVersion, testCasesToRun, versionIdentifier);
  };

  const runAllTestsForced = async (
    testSetUid: string, 
    targetVersion: number,
    versionIdentifier?: string
  ): Promise<void> => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // Run all test cases regardless of their current status
    const testCasesToRun = testSet.testCases;

    return runTestsInternal(testSetUid, targetVersion, testCasesToRun, versionIdentifier);
  };

  const runTestsInternal = async (
    testSetUid: string, 
    targetVersion: number,
    testCasesToRun: TestCase[],
    versionIdentifier?: string
  ): Promise<void> => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const identifier = versionIdentifier || `v${targetVersion}`;

    if (testCasesToRun.length === 0) {
      console.log('No tests to run - all test cases already have results');
      return; // No tests to run
    }

    console.log(`Starting batch execution for ${testCasesToRun.length} test cases`);

    // Create abort controller for this batch execution
    const abortController = new AbortController();
    setBatchExecutionControllers(prev => new Map(prev.set(testSetUid, abortController)));

    let completedTests = 0;
    let failedTests = 0;

    try {
      // Validate prerequisites before starting
      const project = getProjectByUid(testSet.associatedProjectUid);
      if (!project) {
        throw new Error('Associated project not found');
      }

      const version = project.versions.find(v => v.id === targetVersion);
      if (!version) {
        throw new Error('Target version not found');
      }

      const apiKeysStr = localStorage.getItem('apiKeys');
      if (!apiKeysStr) {
        throw new Error('OpenRouter API key not found. Please configure your API key in settings.');
      }
      
      const apiKeys = JSON.parse(apiKeysStr);
      const apiKey = apiKeys.OpenRouter;
      if (!apiKey) {
        throw new Error('OpenRouter API key not found. Please configure your API key in settings.');
      }

      const modelConfig = version.data.modelConfig;
      if (!modelConfig || !modelConfig.model) {
        throw new Error('No model configuration found in version. Please configure a model.');
      }

      // Run tests with concurrency limit of 3 to respect API rate limits
      const concurrencyLimit = 3;
      const batches: TestCase[][] = [];
      
      for (let i = 0; i < testCasesToRun.length; i += concurrencyLimit) {
        batches.push(testCasesToRun.slice(i, i + concurrencyLimit));
      }

      console.log(`Executing ${batches.length} batches with concurrency limit of ${concurrencyLimit}`);

      // Execute batches sequentially, but tests within each batch concurrently
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // Check if execution was cancelled
        if (abortController.signal.aborted) {
          console.log('Batch execution was cancelled by user');
          
          // Mark remaining tests as cancelled
          const remainingTests = testCasesToRun.slice(completedTests + failedTests);
          remainingTests.forEach(testCase => {
            const cancelledResult = createTestResult(
              '',
              'error',
              'Execution was cancelled'
            );
            updateTestResultFn(testSetUid, testCase.id, identifier, cancelledResult);
          });
          
          throw new Error('Batch execution was cancelled');
        }

        console.log(`Executing batch ${batchIndex + 1}/${batches.length} with ${batch.length} tests`);

        const promises = batch.map(testCase => 
          runSingleTest(testSetUid, testCase.id, targetVersion, identifier)
            .then(() => {
              completedTests++;
              console.log(`Test case ${testCase.id} completed (${completedTests + failedTests}/${testCasesToRun.length})`);
            })
            .catch(error => {
              failedTests++;
              console.error(`Test case ${testCase.id} failed (${completedTests + failedTests}/${testCasesToRun.length}):`, error);
            })
        );
        
        // Wait for all tests in the current batch to complete
        await Promise.allSettled(promises);
        
        // Check again if execution was cancelled before proceeding to next batch
        if (abortController.signal.aborted) {
          console.log('Batch execution was cancelled during batch processing');
          throw new Error('Batch execution was cancelled');
        }
        
        // Add a small delay between batches to be respectful to the API
        if (batchIndex < batches.length - 1) {
          console.log('Waiting 100ms before next batch...');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Batch execution completed: ${completedTests} successful, ${failedTests} failed`);

    } catch (error) {
      console.error('Batch execution failed:', error);
      
      // If it's not a cancellation, log additional details
      if (!abortController.signal.aborted) {
        console.error('Batch execution error details:', {
          testSetUid,
          targetVersion,
          identifier,
          completedTests,
          failedTests,
          totalTests: testCasesToRun.length
        });
      }
      
      throw error;
    } finally {
      // Clean up the abort controller
      setBatchExecutionControllers(prev => {
        const newMap = new Map(prev);
        newMap.delete(testSetUid);
        return newMap;
      });
      
      console.log('Batch execution cleanup completed');
    }
  };

  // Result management
  const updateTestResultFn = (
    testSetUid: string, 
    caseId: string, 
    versionIdentifier: string, 
    result: TestResult
  ) => {
    // Use functional update to avoid race conditions during batch execution
    setTestSets(prevTestSets => {
      const testSetIndex = prevTestSets.findIndex(ts => ts.uid === testSetUid);
      if (testSetIndex === -1) {
        throw new Error('Test set not found');
      }

      const testSet = prevTestSets[testSetIndex];
      const updatedTestSet = updateTestResult(testSet, caseId, versionIdentifier, result);
      
      // Save to localStorage
      saveTestSetToStorage(updatedTestSet);
      
      // Update the test sets array
      const newTestSets = [...prevTestSets];
      newTestSets[testSetIndex] = updatedTestSet;
      
      return newTestSets;
    });
    
    // Update currentTestSet if it matches the updated test set
    setCurrentTestSet(prevCurrentTestSet => {
      if (prevCurrentTestSet && prevCurrentTestSet.uid === testSetUid) {
        const updatedTestSet = updateTestResult(prevCurrentTestSet, caseId, versionIdentifier, result);
        return updatedTestSet;
      }
      return prevCurrentTestSet;
    });
  };



  const clearResultHistoryFn = (testSetUid: string, caseId: string, versionIdentifier: string) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const updatedTestSet = clearResultHistory(testSet, caseId, versionIdentifier);
    updateTestSet(updatedTestSet);
  };

  const getResultStatisticsFn = (testSetUid: string, versionIdentifier?: string) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    return getResultStatistics(testSet, versionIdentifier);
  };

  // Batch execution control
  const cancelBatchExecution = (testSetUid: string) => {
    const controller = batchExecutionControllers.get(testSetUid);
    if (controller) {
      controller.abort();
    }
  };

  const isBatchRunning = (testSetUid: string): boolean => {
    return batchExecutionControllers.has(testSetUid);
  };

  // Utility functions
  const isTestSetNameUnique = (name: string, projectUid: string, excludeUid?: string): boolean => {
    return !testSetNameExists(name, projectUid, excludeUid);
  };

  const generateUniqueTestSetNameFn = (baseName: string, projectUid: string): string => {
    return generateUniqueTestSetName(baseName, projectUid);
  };

  // UI state management
  const updateTestSetUIStateFn = (testSetUid: string, uiState: Partial<TestSetUIState>) => {
    const testSet = testSets.find(ts => ts.uid === testSetUid);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const updatedTestSet = updateTestSetUIState(testSet, uiState);
    updateTestSet(updatedTestSet);
  };

  const value: TestSetContextType = {
    testSets,
    currentTestSet,
    setCurrentTestSet,
    addTestSet,
    updateTestSet,
    deleteTestSet,
    getTestSetsByProject: getTestSetsByProjectFn,
    addTestCase,
    duplicateTestCase,
    updateTestCase,
    deleteTestCase,
    bulkDeleteTestCases,
    syncVariablesFromVersion,
    detectVariableDifferences: detectVariableDifferencesFn,
    validateSynchronizationOperation: validateSynchronizationOperationFn,
    runSingleTest,
    runAllTests,
    runAllTestsForced,
    cancelBatchExecution,
    isBatchRunning,
    updateTestResult: updateTestResultFn,
    clearResultHistory: clearResultHistoryFn,
    getResultStatistics: getResultStatisticsFn,
    updateTestSetUIState: updateTestSetUIStateFn,
    isTestSetNameUnique,
    generateUniqueTestSetName: generateUniqueTestSetNameFn,
  };

  return (
    <TestSetContext.Provider value={value}>
      {children}
    </TestSetContext.Provider>
  );
};

export const useTestSets = () => {
  const context = useContext(TestSetContext);
  if (context === undefined) {
    throw new Error("useTestSets must be used within a TestSetProvider");
  }
  return context;
};