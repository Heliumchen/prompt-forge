import { generateUid } from './utils';
import { dataManager } from './data-manager';

// Test result stores the output and metadata for a test execution
export interface TestResult {
  id: string;
  content: string;
  timestamp: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
  executionTime?: number;
}

// Test case represents a single row in the test set table
export interface TestCase {
  id: string;
  variableValues: Record<string, string>; // variable name -> value mapping for this test case
  messages?: Array<{role: 'user' | 'assistant', content: string}>; // additional messages to append after prompts
  results: Record<string, TestResult>; // version identifier -> result
}

// UI state for TestSet preferences
export interface TestSetUIState {
  selectedComparisonVersion?: string; // Version identifier for comparison column
}

// Test set contains the complete test configuration and data
export interface TestSet {
  uid: string;
  name: string;
  associatedProjectUid: string;
  variableNames: string[]; // ordered list of variable names for table columns (defines table structure)
  testCases: TestCase[];
  uiState?: TestSetUIState; // UI preferences and state
  createdAt: string;
  updatedAt: string;
}

// Local storage key for test sets
const TEST_SETS_STORAGE_KEY = 'prompt-forge-test-sets';

/**
 * Creates a new test set with the given name and associated project
 * @param name - Name of the test set
 * @param associatedProjectUid - UID of the project this test set is associated with
 * @returns New TestSet object
 */
export const createTestSet = (name: string, associatedProjectUid: string): TestSet => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Test set name is required and must be a non-empty string');
  }

  if (!associatedProjectUid || typeof associatedProjectUid !== 'string') {
    throw new Error('Associated project UID is required and must be a string');
  }

  const now = new Date().toISOString();
  
  return {
    uid: generateUid(),
    name: name.trim(),
    associatedProjectUid,
    variableNames: [],
    testCases: [],
    uiState: {},
    createdAt: now,
    updatedAt: now
  };
};

/**
 * Creates a new test case for a test set
 * @param variableNames - Array of variable names to initialize with empty values
 * @returns New TestCase object
 */
export const createTestCase = (variableNames: string[] = []): TestCase => {
  const variableValues: Record<string, string> = {};
  
  // Initialize all variables with empty strings
  variableNames.forEach(name => {
    if (name && typeof name === 'string') {
      variableValues[name] = '';
    }
  });

  return {
    id: generateUid(),
    variableValues,
    messages: [],
    results: {}
  };
};

/**
 * Creates a new test result
 * @param content - The result content
 * @param status - The execution status
 * @param error - Optional error message
 * @param executionTime - Optional execution time in milliseconds
 * @returns New TestResult object
 */
export const createTestResult = (
  content: string = '',
  status: TestResult['status'] = 'pending',
  error?: string,
  executionTime?: number
): TestResult => {
  return {
    id: generateUid(),
    content,
    timestamp: new Date().toISOString(),
    status,
    error,
    executionTime
  };
};

/**
 * Validates a test set object
 * @param testSet - Test set to validate
 * @returns True if valid, throws error if invalid
 */
export const validateTestSet = (testSet: unknown): testSet is TestSet => {
  if (!testSet || typeof testSet !== 'object') {
    throw new Error('Test set must be an object');
  }

  const ts = testSet as Partial<TestSet>;

  if (!ts.uid || typeof ts.uid !== 'string') {
    throw new Error('Test set must have a valid uid');
  }

  if (!ts.name || typeof ts.name !== 'string' || ts.name.trim().length === 0) {
    throw new Error('Test set must have a valid name');
  }

  if (!ts.associatedProjectUid || typeof ts.associatedProjectUid !== 'string') {
    throw new Error('Test set must have a valid associatedProjectUid');
  }

  if (!Array.isArray(ts.variableNames)) {
    throw new Error('Test set variableNames must be an array');
  }

  if (!Array.isArray(ts.testCases)) {
    throw new Error('Test set testCases must be an array');
  }

  if (!ts.createdAt || typeof ts.createdAt !== 'string') {
    throw new Error('Test set must have a valid createdAt timestamp');
  }

  if (!ts.updatedAt || typeof ts.updatedAt !== 'string') {
    throw new Error('Test set must have a valid updatedAt timestamp');
  }

  // Validate uiState if present (optional field for backward compatibility)
  if (ts.uiState !== undefined && (ts.uiState === null || typeof ts.uiState !== 'object')) {
    throw new Error('Test set uiState must be an object if present');
  }

  // Validate variable names are strings
  ts.variableNames.forEach((name, index) => {
    if (typeof name !== 'string') {
      throw new Error(`Variable name at index ${index} must be a string`);
    }
  });

  // Validate test cases
  ts.testCases.forEach((testCase, index) => {
    if (!testCase || typeof testCase !== 'object') {
      throw new Error(`Test case at index ${index} must be an object`);
    }

    if (!testCase.id || typeof testCase.id !== 'string') {
      throw new Error(`Test case at index ${index} must have a valid id`);
    }

    if (!testCase.variableValues || typeof testCase.variableValues !== 'object') {
      throw new Error(`Test case at index ${index} must have variableValues object`);
    }

    if (!testCase.results || typeof testCase.results !== 'object') {
      throw new Error(`Test case at index ${index} must have results object`);
    }
  });

  return true;
};

/**
 * Migrates test set data if needed (for future schema changes)
 * @param testSet - Test set to migrate
 * @returns Migrated test set
 */
export const migrateTestSet = (testSet: TestSet): TestSet => {
  // Add uiState if missing (backward compatibility)
  if (!testSet.uiState) {
    return {
      ...testSet,
      uiState: {}
    };
  }
  
  return testSet;
};

/**
 * Gets all test sets from localStorage
 * @returns Array of test sets
 */
export const getTestSets = (): TestSet[] => {
  const data = dataManager.safeGetItem(TEST_SETS_STORAGE_KEY);
  if (!data) return [];
  
  const parseResult = dataManager.parseJSON<TestSet[]>(data, () => []);
  if (!parseResult.isValid) {
    console.error('解析测试集数据失败:', parseResult.error);
    return [];
  }

  const validation = dataManager.validateArray(parseResult.data || [], (item): item is TestSet => {
    try {
      validateTestSet(item);
      return true;
    } catch {
      return false;
    }
  });

  // 应用迁移和修复
  const processedTestSets = (validation.data || [])
    .map(testSet => {
      try {
        return migrateTestSet(testSet);
      } catch {
        return null;
      }
    })
    .filter((testSet): testSet is TestSet => testSet !== null);

  // 如果有数据被修复，异步保存修复后的数据
  if (parseResult.data && processedTestSets.length !== parseResult.data.length) {
    console.log(`测试集数据验证完成：修复了 ${parseResult.data.length - processedTestSets.length} 个损坏的测试集`);
    setTimeout(() => saveTestSets(processedTestSets), 0);
  }

  return processedTestSets;
};

/**
 * Gets a specific test set by UID
 * @param uid - UID of the test set to retrieve
 * @returns Test set if found, undefined otherwise
 */
export const getTestSetByUid = (uid: string): TestSet | undefined => {
  if (!uid || typeof uid !== 'string') {
    return undefined;
  }

  const testSets = getTestSets();
  return testSets.find(testSet => testSet.uid === uid);
};

/**
 * Saves all test sets to localStorage
 * @param testSets - Array of test sets to save
 */
export const saveTestSets = async (testSets: TestSet[]): Promise<void> => {
  if (!Array.isArray(testSets)) {
    throw new Error('Test sets must be an array');
  }

  // Validate all test sets using DataManager
  const validation = dataManager.validateArray(testSets, (item): item is TestSet => {
    try {
      validateTestSet(item);
      return true;
    } catch {
      return false;
    }
  });

  if (!validation.isValid) {
    console.warn('Test set validation warnings:', validation.error);
  }

  try {
    await dataManager.safeSetItem(TEST_SETS_STORAGE_KEY, JSON.stringify(validation.data), { debounceMs: 200 });
  } catch (error) {
    console.error('Error saving test sets:', error);
    throw error;
  }
};

/**
 * Saves a single test set
 * @param testSet - Test set to save
 */
export const saveTestSet = async (testSet: TestSet): Promise<void> => {
  validateTestSet(testSet);
  
  const testSets = getTestSets();
  const index = testSets.findIndex(ts => ts.uid === testSet.uid);
  
  const updatedTestSet = {
    ...testSet,
    updatedAt: dataManager.getCurrentTimestamp()
  };
  
  if (index >= 0) {
    testSets[index] = updatedTestSet;
  } else {
    testSets.push(updatedTestSet);
  }
  
  await saveTestSets(testSets);
};

/**
 * Deletes a test set by UID
 * @param uid - UID of the test set to delete
 */
export const deleteTestSet = (uid: string): void => {
  if (!uid || typeof uid !== 'string') {
    throw new Error('Test set UID is required and must be a string');
  }

  const testSets = getTestSets();
  const filteredTestSets = testSets.filter(testSet => testSet.uid !== uid);
  
  if (filteredTestSets.length === testSets.length) {
    throw new Error('Test set not found');
  }
  
  saveTestSets(filteredTestSets);
};

/**
 * Updates UI state for a test set
 * @param testSet - Test set to update
 * @param uiState - New UI state to merge with existing state
 * @returns Updated test set
 */
export const updateTestSetUIState = (testSet: TestSet, uiState: Partial<TestSetUIState>): TestSet => {
  validateTestSet(testSet);
  
  if (!uiState || typeof uiState !== 'object') {
    throw new Error('UI state must be an object');
  }

  return {
    ...testSet,
    uiState: {
      ...testSet.uiState,
      ...uiState
    },
    updatedAt: new Date().toISOString()
  };
};

/**
 * Clears all test sets from localStorage
 */
export const clearTestSets = (): void => {
  localStorage.removeItem(TEST_SETS_STORAGE_KEY);
};

/**
 * Updates a test set's variable names and adjusts test cases accordingly
 * @param testSet - Test set to update
 * @param newVariableNames - New array of variable names
 * @returns Updated test set
 */
export const updateTestSetVariables = (testSet: TestSet, newVariableNames: string[]): TestSet => {
  validateTestSet(testSet);
  
  if (!Array.isArray(newVariableNames)) {
    throw new Error('Variable names must be an array');
  }

  // Validate variable names
  newVariableNames.forEach((name, index) => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error(`Variable name at index ${index} must be a non-empty string`);
    }
  });

  const trimmedVariableNames = newVariableNames.map(name => name.trim());
  
  // Update test cases to match new variable structure
  const updatedTestCases = testSet.testCases.map(testCase => {
    const newVariableValues: Record<string, string> = {};
    
    // Preserve existing values for variables that still exist
    trimmedVariableNames.forEach(variableName => {
      newVariableValues[variableName] = testCase.variableValues[variableName] || '';
    });
    
    return {
      ...testCase,
      variableValues: newVariableValues
    };
  });

  return {
    ...testSet,
    variableNames: trimmedVariableNames,
    testCases: updatedTestCases,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Adds a new test case to a test set
 * @param testSet - Test set to add the test case to
 * @returns Updated test set with new test case
 */
export const addTestCase = (testSet: TestSet): TestSet => {
  validateTestSet(testSet);
  
  const newTestCase = createTestCase(testSet.variableNames);
  
  return {
    ...testSet,
    testCases: [...testSet.testCases, newTestCase],
    updatedAt: new Date().toISOString()
  };
};

/**
 * Adds multiple test cases to a test set from imported data
 * @param testSet - Test set to add test cases to
 * @param testCasesData - Array of test case data with variable values and messages
 * @returns Updated test set with imported test cases
 */
export const addTestCasesFromImport = (
  testSet: TestSet,
  testCasesData: Array<{
    variableValues: Record<string, string>;
    messages?: Array<{role: 'user' | 'assistant', content: string}>;
  }>
): TestSet => {
  validateTestSet(testSet);
  
  if (!Array.isArray(testCasesData)) {
    throw new Error('Test cases data must be an array');
  }
  
  const newTestCases: TestCase[] = testCasesData.map(data => {
    if (!data || typeof data !== 'object') {
      throw new Error('Test case data must be an object');
    }
    
    // Validate variable values
    const variableValues: Record<string, string> = {};
    if (data.variableValues && typeof data.variableValues === 'object') {
      Object.entries(data.variableValues).forEach(([key, value]) => {
        variableValues[key] = String(value || '');
      });
    }
    
    // Validate messages
    const messages: Array<{role: 'user' | 'assistant', content: string}> = [];
    if (data.messages && Array.isArray(data.messages)) {
      data.messages.forEach((msg, index) => {
        if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
          throw new Error(`Message at index ${index} must have 'role' and 'content' properties`);
        }
        if (!['user', 'assistant'].includes(msg.role)) {
          throw new Error(`Message at index ${index} must have role 'user' or 'assistant'`);
        }
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: String(msg.content)
        });
      });
    }
    
    return {
      id: generateUid(),
      variableValues,
      messages,
      results: {}
    };
  });
  
  return {
    ...testSet,
    testCases: [...testSet.testCases, ...newTestCases],
    updatedAt: new Date().toISOString()
  };
};

/**
 * Duplicates an existing test case in a test set
 * @param testSet - Test set containing the test case to duplicate
 * @param testCaseId - ID of the test case to duplicate
 * @returns Updated test set with duplicated test case
 */
export const duplicateTestCase = (testSet: TestSet, testCaseId: string): TestSet => {
  validateTestSet(testSet);
  
  if (!testCaseId || typeof testCaseId !== 'string') {
    throw new Error('Test case ID is required and must be a string');
  }

  const originalTestCase = testSet.testCases.find(tc => tc.id === testCaseId);
  if (!originalTestCase) {
    throw new Error('Test case not found');
  }

  const duplicatedTestCase: TestCase = {
    id: generateUid(),
    variableValues: { ...originalTestCase.variableValues },
    results: {}
  };
  
  return {
    ...testSet,
    testCases: [...testSet.testCases, duplicatedTestCase],
    updatedAt: new Date().toISOString()
  };
};

/**
 * Updates a test case's variable values
 * @param testSet - Test set containing the test case
 * @param testCaseId - ID of the test case to update
 * @param variableValues - New variable values
 * @returns Updated test set
 */
export const updateTestCase = (
  testSet: TestSet, 
  testCaseId: string, 
  variableValues: Record<string, string>
): TestSet => {
  validateTestSet(testSet);
  
  if (!testCaseId || typeof testCaseId !== 'string') {
    throw new Error('Test case ID is required and must be a string');
  }

  if (!variableValues || typeof variableValues !== 'object') {
    throw new Error('Variable values must be an object');
  }

  const testCaseIndex = testSet.testCases.findIndex(tc => tc.id === testCaseId);
  if (testCaseIndex === -1) {
    throw new Error('Test case not found');
  }

  const updatedTestCases = [...testSet.testCases];
  updatedTestCases[testCaseIndex] = {
    ...updatedTestCases[testCaseIndex],
    variableValues: { ...variableValues }
  };

  return {
    ...testSet,
    testCases: updatedTestCases,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Updates messages for a specific test case in a test set
 * @param testSet - Test set containing the test case to update
 * @param testCaseId - ID of the test case to update
 * @param messages - New messages array for the test case
 * @returns Updated test set with the test case messages modified
 */
export const updateTestCaseMessages = (
  testSet: TestSet, 
  testCaseId: string, 
  messages: Array<{role: 'user' | 'assistant', content: string}>
): TestSet => {
  validateTestSet(testSet);
  
  if (!testCaseId || typeof testCaseId !== 'string') {
    throw new Error('Test case ID is required and must be a string');
  }

  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }

  // Validate message format
  messages.forEach((msg, index) => {
    if (!msg || typeof msg !== 'object') {
      throw new Error(`Message at index ${index} must be an object`);
    }
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      throw new Error(`Message at index ${index} must have role 'user' or 'assistant'`);
    }
    if (!msg.content || typeof msg.content !== 'string') {
      throw new Error(`Message at index ${index} must have content as a string`);
    }
  });

  const testCaseIndex = testSet.testCases.findIndex(tc => tc.id === testCaseId);
  if (testCaseIndex === -1) {
    throw new Error('Test case not found');
  }

  const updatedTestCases = [...testSet.testCases];
  updatedTestCases[testCaseIndex] = {
    ...updatedTestCases[testCaseIndex],
    messages: [...messages]
  };

  return {
    ...testSet,
    testCases: updatedTestCases,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Deletes a test case from a test set
 * @param testSet - Test set to delete the test case from
 * @param testCaseId - ID of the test case to delete
 * @returns Updated test set without the test case
 */
export const deleteTestCase = (testSet: TestSet, testCaseId: string): TestSet => {
  validateTestSet(testSet);
  
  if (!testCaseId || typeof testCaseId !== 'string') {
    throw new Error('Test case ID is required and must be a string');
  }

  const filteredTestCases = testSet.testCases.filter(tc => tc.id !== testCaseId);
  
  if (filteredTestCases.length === testSet.testCases.length) {
    throw new Error('Test case not found');
  }

  return {
    ...testSet,
    testCases: filteredTestCases,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Deletes multiple test cases from a test set
 * @param testSet - Test set to delete the test cases from
 * @param testCaseIds - Array of test case IDs to delete
 * @returns Updated test set without the specified test cases
 */
export const bulkDeleteTestCases = (testSet: TestSet, testCaseIds: string[]): TestSet => {
  validateTestSet(testSet);
  
  if (!Array.isArray(testCaseIds)) {
    throw new Error('Test case IDs must be an array');
  }

  if (testCaseIds.length === 0) {
    throw new Error('At least one test case ID is required');
  }

  // Validate all IDs are strings
  testCaseIds.forEach((id, index) => {
    if (!id || typeof id !== 'string') {
      throw new Error(`Test case ID at index ${index} must be a non-empty string`);
    }
  });

  const idsToDelete = new Set(testCaseIds);
  const filteredTestCases = testSet.testCases.filter(tc => !idsToDelete.has(tc.id));
  
  if (filteredTestCases.length === testSet.testCases.length) {
    throw new Error('No matching test cases found to delete');
  }

  return {
    ...testSet,
    testCases: filteredTestCases,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Updates a test result for a specific test case and version
 * @param testSet - Test set containing the test case
 * @param testCaseId - ID of the test case
 * @param versionIdentifier - Version identifier for the result
 * @param result - Test result to store
 * @returns Updated test set
 */
export const updateTestResult = (
  testSet: TestSet,
  testCaseId: string,
  versionIdentifier: string,
  result: TestResult
): TestSet => {
  validateTestSet(testSet);
  
  if (!testCaseId || typeof testCaseId !== 'string') {
    throw new Error('Test case ID is required and must be a string');
  }

  if (!versionIdentifier || typeof versionIdentifier !== 'string') {
    throw new Error('Version identifier is required and must be a string');
  }

  if (!result || typeof result !== 'object') {
    throw new Error('Test result is required and must be an object');
  }

  const testCaseIndex = testSet.testCases.findIndex(tc => tc.id === testCaseId);
  if (testCaseIndex === -1) {
    throw new Error('Test case not found');
  }

  const updatedTestCases = [...testSet.testCases];
  updatedTestCases[testCaseIndex] = {
    ...updatedTestCases[testCaseIndex],
    results: {
      ...updatedTestCases[testCaseIndex].results,
      [versionIdentifier]: result
    }
  };

  return {
    ...testSet,
    testCases: updatedTestCases,
    updatedAt: new Date().toISOString()
  };
};



/**
 * Gets test sets associated with a specific project
 * @param projectUid - UID of the project to filter by
 * @returns Array of test sets associated with the project
 */
export const getTestSetsByProject = (projectUid: string): TestSet[] => {
  if (!projectUid || typeof projectUid !== 'string') {
    return [];
  }

  const testSets = getTestSets();
  return testSets.filter(testSet => testSet.associatedProjectUid === projectUid);
};

/**
 * Checks if a test set name already exists for a given project
 * @param name - Name to check
 * @param projectUid - Project UID to check within
 * @param excludeUid - Optional test set UID to exclude from the check (for updates)
 * @returns True if name exists, false otherwise
 */
export const testSetNameExists = (name: string, projectUid: string, excludeUid?: string): boolean => {
  if (!name || typeof name !== 'string' || !projectUid || typeof projectUid !== 'string') {
    return false;
  }

  const projectTestSets = getTestSetsByProject(projectUid);
  return projectTestSets.some(testSet => 
    testSet.name.toLowerCase() === name.toLowerCase() && 
    testSet.uid !== excludeUid
  );
};

/**
 * Generates a unique test set name for a project
 * @param baseName - Base name to use
 * @param projectUid - Project UID
 * @returns Unique name for the project
 */
export const generateUniqueTestSetName = (baseName: string, projectUid: string): string => {
  if (!baseName || typeof baseName !== 'string') {
    baseName = 'Test Set';
  }

  if (!projectUid || typeof projectUid !== 'string') {
    return baseName;
  }

  let counter = 1;
  let candidateName = baseName;

  while (testSetNameExists(candidateName, projectUid)) {
    candidateName = `${baseName} ${counter}`;
    counter++;
  }

  return candidateName;
};/**
 * Inte
rface for variable synchronization conflicts
 */
export interface VariableConflict {
  type: 'removal' | 'addition';
  variable: string;
}

/**
 * Interface for variable synchronization result
 */
export interface VariableSyncResult {
  updatedTestSet: TestSet;
  conflicts: VariableConflict[];
}

/**
 * Detects variable differences between a test set and project version variables
 * @param testSet - Test set to compare
 * @param versionVariables - Array of variable names from project version
 * @returns Array of conflicts representing the differences
 */
export const detectVariableDifferences = (
  testSet: TestSet, 
  versionVariables: string[]
): VariableConflict[] => {
  validateTestSet(testSet);
  
  if (!Array.isArray(versionVariables)) {
    throw new Error('Version variables must be an array');
  }

  const currentVariables = new Set(testSet.variableNames);
  const newVariables = new Set(versionVariables);
  const conflicts: VariableConflict[] = [];

  // Variables to be removed (exist in test set but not in version)
  Array.from(currentVariables).forEach(variable => {
    if (!newVariables.has(variable)) {
      conflicts.push({ type: 'removal', variable });
    }
  });

  // Variables to be added (exist in version but not in test set)
  Array.from(newVariables).forEach(variable => {
    if (!currentVariables.has(variable)) {
      conflicts.push({ type: 'addition', variable });
    }
  });

  return conflicts;
};

/**
 * Merges test set variables with project version variables
 * Preserves existing variable values and adds new variables with empty values
 * @param testSet - Test set to merge variables for
 * @param versionVariables - Array of variable names from project version
 * @returns Updated test set with merged variables
 */
export const mergeTestSetVariables = (
  testSet: TestSet, 
  versionVariables: string[]
): TestSet => {
  validateTestSet(testSet);
  
  if (!Array.isArray(versionVariables)) {
    throw new Error('Version variables must be an array');
  }

  // Validate variable names
  versionVariables.forEach((name, index) => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error(`Variable name at index ${index} must be a non-empty string`);
    }
  });

  const trimmedVariableNames = versionVariables.map(name => name.trim());
  
  // Update test cases to match new variable structure
  const updatedTestCases = testSet.testCases.map(testCase => {
    const newVariableValues: Record<string, string> = {};
    
    // Preserve existing values for variables that still exist
    trimmedVariableNames.forEach(variableName => {
      newVariableValues[variableName] = testCase.variableValues[variableName] || '';
    });
    
    return {
      ...testCase,
      variableValues: newVariableValues
    };
  });

  return {
    ...testSet,
    variableNames: trimmedVariableNames,
    testCases: updatedTestCases,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Validates synchronization operation parameters
 * @param testSet - Test set to validate
 * @param versionVariables - Version variables to validate
 * @throws Error if validation fails
 */
export const validateSynchronizationOperation = (
  testSet: TestSet, 
  versionVariables: string[]
): void => {
  validateTestSet(testSet);
  
  if (!Array.isArray(versionVariables)) {
    throw new Error('Version variables must be an array');
  }

  // Check for duplicate variable names
  const uniqueVariables = new Set(versionVariables);
  if (uniqueVariables.size !== versionVariables.length) {
    throw new Error('Version variables contain duplicates');
  }

  // Validate each variable name
  versionVariables.forEach((name, index) => {
    if (!name || typeof name !== 'string') {
      throw new Error(`Variable name at index ${index} must be a non-empty string`);
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error(`Variable name at index ${index} cannot be empty or whitespace only`);
    }

    // Check for valid variable name pattern (alphanumeric and underscore, starting with letter or underscore)
    const validNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validNamePattern.test(trimmedName)) {
      throw new Error(`Variable name "${trimmedName}" at index ${index} contains invalid characters. Variable names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
    }
  });
};

/**
 * Performs a complete variable synchronization operation
 * @param testSet - Test set to synchronize
 * @param versionVariables - Array of variable names from project version
 * @returns Synchronization result with updated test set and conflicts
 */
export const synchronizeTestSetVariables = (
  testSet: TestSet, 
  versionVariables: string[]
): VariableSyncResult => {
  // Validate inputs
  validateSynchronizationOperation(testSet, versionVariables);
  
  // Detect conflicts
  const conflicts = detectVariableDifferences(testSet, versionVariables);
  
  // Merge variables
  const updatedTestSet = mergeTestSetVariables(testSet, versionVariables);
  
  return {
    updatedTestSet,
    conflicts
  };
};

/**
 * Handles test case data updates during synchronization
 * This function ensures that test case data is properly preserved or cleaned up
 * when variables are added or removed during synchronization
 * @param testSet - Test set being synchronized
 * @param conflicts - Array of conflicts from synchronization
 * @returns Updated test set with properly handled test case data
 */
export const handleTestCaseDataUpdates = (
  testSet: TestSet, 
  conflicts: VariableConflict[]
): TestSet => {
  validateTestSet(testSet);
  
  if (!Array.isArray(conflicts)) {
    throw new Error('Conflicts must be an array');
  }

  // If no conflicts, no updates needed
  if (conflicts.length === 0) {
    return testSet;
  }

  const removedVariables = conflicts
    .filter(conflict => conflict.type === 'removal')
    .map(conflict => conflict.variable);

  // Update test cases to remove data for removed variables
  const updatedTestCases = testSet.testCases.map(testCase => {
    const updatedVariableValues = { ...testCase.variableValues };
    
    // Remove values for variables that no longer exist
    removedVariables.forEach(variableName => {
      delete updatedVariableValues[variableName];
    });
    
    return {
      ...testCase,
      variableValues: updatedVariableValues
    };
  });

  return {
    ...testSet,
    testCases: updatedTestCases,
    updatedAt: new Date().toISOString()
  };
};/**
 * Inte
rface for result history entry
 */
export interface ResultHistoryEntry {
  id: string;
  testCaseId: string;
  versionIdentifier: string;
  result: TestResult;
  createdAt: string;
}

/**
 * Gets result history for a test set
 * @param testSet - Test set to get history for
 * @param testCaseId - Optional test case ID to filter by
 * @param versionIdentifier - Optional version identifier to filter by
 * @returns Array of result history entries
 */
export const getResultHistory = (
  testSet: TestSet,
  testCaseId?: string,
  versionIdentifier?: string
): ResultHistoryEntry[] => {
  validateTestSet(testSet);
  
  const history: ResultHistoryEntry[] = [];
  
  testSet.testCases.forEach(testCase => {
    // Filter by test case ID if provided
    if (testCaseId && testCase.id !== testCaseId) {
      return;
    }
    
    Object.entries(testCase.results).forEach(([versionId, result]) => {
      // Filter by version identifier if provided
      if (versionIdentifier && versionId !== versionIdentifier) {
        return;
      }
      
      history.push({
        id: generateUid(),
        testCaseId: testCase.id,
        versionIdentifier: versionId,
        result,
        createdAt: result.timestamp
      });
    });
  });
  
  // Sort by creation date (newest first)
  return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * Gets result statistics for a test set
 * @param testSet - Test set to get statistics for
 * @param versionIdentifier - Optional version identifier to filter by
 * @returns Statistics object
 */
export const getResultStatistics = (
  testSet: TestSet,
  versionIdentifier?: string
): {
  totalTestCases: number;
  completedTests: number;
  failedTests: number;
  pendingTests: number;
  runningTests: number;
  successRate: number;
  averageExecutionTime: number;
} => {
  validateTestSet(testSet);
  
  const totalTestCases = testSet.testCases.length;
  let completedTests = 0;
  let failedTests = 0;
  let pendingTests = 0;
  let runningTests = 0;
  let totalExecutionTime = 0;
  let executionTimeCount = 0;
  
  testSet.testCases.forEach(testCase => {
    if (versionIdentifier) {
      const result = testCase.results[versionIdentifier];
      if (result) {
        switch (result.status) {
          case 'completed':
            completedTests++;
            if (result.executionTime) {
              totalExecutionTime += result.executionTime;
              executionTimeCount++;
            }
            break;
          case 'error':
            failedTests++;
            break;
          case 'pending':
            pendingTests++;
            break;
          case 'running':
            runningTests++;
            break;
        }
      } else {
        pendingTests++;
      }
    } else {
      // Count across all versions
      const hasAnyResult = Object.keys(testCase.results).length > 0;
      if (!hasAnyResult) {
        pendingTests++;
      } else {
        const latestResult = Object.values(testCase.results)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        switch (latestResult.status) {
          case 'completed':
            completedTests++;
            if (latestResult.executionTime) {
              totalExecutionTime += latestResult.executionTime;
              executionTimeCount++;
            }
            break;
          case 'error':
            failedTests++;
            break;
          case 'pending':
            pendingTests++;
            break;
          case 'running':
            runningTests++;
            break;
        }
      }
    }
  });
  
  const successRate = totalTestCases > 0 ? (completedTests / totalTestCases) * 100 : 0;
  const averageExecutionTime = executionTimeCount > 0 ? totalExecutionTime / executionTimeCount : 0;
  
  return {
    totalTestCases,
    completedTests,
    failedTests,
    pendingTests,
    runningTests,
    successRate,
    averageExecutionTime
  };
};

/**
 * Clears result history for a specific test case and version
 * @param testSet - Test set to clear history from
 * @param testCaseId - Test case ID to clear history for
 * @param versionIdentifier - Version identifier to clear history for
 * @returns Updated test set
 */
export const clearResultHistory = (
  testSet: TestSet,
  testCaseId: string,
  versionIdentifier: string
): TestSet => {
  validateTestSet(testSet);
  
  if (!testCaseId || typeof testCaseId !== 'string') {
    throw new Error('Test case ID is required and must be a string');
  }
  
  if (!versionIdentifier || typeof versionIdentifier !== 'string') {
    throw new Error('Version identifier is required and must be a string');
  }
  
  const testCaseIndex = testSet.testCases.findIndex(tc => tc.id === testCaseId);
  if (testCaseIndex === -1) {
    throw new Error('Test case not found');
  }
  
  const updatedTestCases = [...testSet.testCases];
  const updatedResults = { ...updatedTestCases[testCaseIndex].results };
  delete updatedResults[versionIdentifier];
  
  updatedTestCases[testCaseIndex] = {
    ...updatedTestCases[testCaseIndex],
    results: updatedResults
  };
  
  return {
    ...testSet,
    testCases: updatedTestCases,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Archives old results to keep storage manageable
 * @param testSet - Test set to archive results for
 * @param maxResultsPerTestCase - Maximum number of results to keep per test case per version
 * @returns Updated test set with archived results
 */
export const archiveOldResults = (
  testSet: TestSet,
  maxResultsPerTestCase: number = 10
): TestSet => {
  validateTestSet(testSet);
  
  if (typeof maxResultsPerTestCase !== 'number' || maxResultsPerTestCase < 1) {
    throw new Error('Max results per test case must be a positive number');
  }
  
  // For now, we only keep the latest result per version per test case
  // This function is a placeholder for future enhancement where we might
  // want to keep multiple historical results per version
  
  return testSet;
};