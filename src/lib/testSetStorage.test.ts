import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TestSet,
  TestResult,
  createTestSet,
  createTestCase,
  createTestResult,
  validateTestSet,
  getTestSets,
  getTestSetByUid,
  saveTestSets,
  saveTestSet,
  deleteTestSet,
  clearTestSets,
  updateTestSetVariables,
  addTestCase,
  updateTestCase,
  deleteTestCase,
  updateTestResult,
  getTestSetsByProject,
  testSetNameExists,
  generateUniqueTestSetName,
  detectVariableDifferences,
  mergeTestSetVariables,
  validateSynchronizationOperation,
  synchronizeTestSetVariables,
  handleTestCaseDataUpdates,
  VariableConflict
} from './testSetStorage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock generateUid to return predictable values
vi.mock('./utils', () => ({
  generateUid: vi.fn(() => 'test-uid-123')
}));

describe('testSetStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('createTestSet', () => {
    it('should create a new test set with valid parameters', () => {
      const testSet = createTestSet('My Test Set', 'project-uid-123');
      
      expect(testSet).toEqual({
        uid: 'test-uid-123',
        name: 'My Test Set',
        associatedProjectUid: 'project-uid-123',
        variableNames: [],
        testCases: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
      
      expect(new Date(testSet.createdAt)).toBeInstanceOf(Date);
      expect(new Date(testSet.updatedAt)).toBeInstanceOf(Date);
    });

    it('should trim whitespace from name', () => {
      const testSet = createTestSet('  My Test Set  ', 'project-uid-123');
      expect(testSet.name).toBe('My Test Set');
    });

    it('should throw error for empty name', () => {
      expect(() => createTestSet('', 'project-uid-123')).toThrow('Test set name is required');
      expect(() => createTestSet('   ', 'project-uid-123')).toThrow('Test set name is required');
    });

    it('should throw error for invalid name type', () => {
      expect(() => createTestSet(null as unknown as string, 'project-uid-123')).toThrow('Test set name is required');
      expect(() => createTestSet(123 as unknown as string, 'project-uid-123')).toThrow('Test set name is required');
    });

    it('should throw error for invalid project UID', () => {
      expect(() => createTestSet('Test Set', '')).toThrow('Associated project UID is required');
      expect(() => createTestSet('Test Set', null as unknown as string)).toThrow('Associated project UID is required');
    });
  });

  describe('createTestCase', () => {
    it('should create a test case with empty variable names', () => {
      const testCase = createTestCase();
      
      expect(testCase).toEqual({
        id: 'test-uid-123',
        variableValues: {},
        results: {}
      });
    });

    it('should create a test case with initialized variables', () => {
      const testCase = createTestCase(['var1', 'var2']);
      
      expect(testCase).toEqual({
        id: 'test-uid-123',
        variableValues: {
          var1: '',
          var2: ''
        },
        results: {}
      });
    });

    it('should handle invalid variable names gracefully', () => {
      const testCase = createTestCase(['var1', '', null as unknown as string, 'var2']);
      
      expect(testCase.variableValues).toEqual({
        var1: '',
        var2: ''
      });
    });
  });

  describe('createTestResult', () => {
    it('should create a test result with default values', () => {
      const result = createTestResult();
      
      expect(result).toEqual({
        id: 'test-uid-123',
        content: '',
        timestamp: expect.any(String),
        status: 'pending',
        error: undefined,
        executionTime: undefined
      });
    });

    it('should create a test result with provided values', () => {
      const result = createTestResult('Test output', 'completed', undefined, 1500);
      
      expect(result).toEqual({
        id: 'test-uid-123',
        content: 'Test output',
        timestamp: expect.any(String),
        status: 'completed',
        error: undefined,
        executionTime: 1500
      });
    });

    it('should create a test result with error', () => {
      const result = createTestResult('', 'error', 'API call failed');
      
      expect(result).toEqual({
        id: 'test-uid-123',
        content: '',
        timestamp: expect.any(String),
        status: 'error',
        error: 'API call failed',
        executionTime: undefined
      });
    });
  });

  describe('validateTestSet', () => {
    const validTestSet: TestSet = {
      uid: 'test-uid',
      name: 'Test Set',
      associatedProjectUid: 'project-uid',
      variableNames: ['var1', 'var2'],
      testCases: [{
        id: 'case-1',
        variableValues: { var1: 'value1', var2: 'value2' },
        results: {}
      }],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };

    it('should validate a correct test set', () => {
      expect(validateTestSet(validTestSet)).toBe(true);
    });

    it('should throw error for non-object', () => {
      expect(() => validateTestSet(null)).toThrow('Test set must be an object');
      expect(() => validateTestSet('string')).toThrow('Test set must be an object');
    });

    it('should throw error for missing uid', () => {
      const invalid = { ...validTestSet, uid: '' };
      expect(() => validateTestSet(invalid)).toThrow('Test set must have a valid uid');
    });

    it('should throw error for invalid name', () => {
      const invalid = { ...validTestSet, name: '' };
      expect(() => validateTestSet(invalid)).toThrow('Test set must have a valid name');
    });

    it('should throw error for missing associatedProjectUid', () => {
      const invalid = { ...validTestSet, associatedProjectUid: '' };
      expect(() => validateTestSet(invalid)).toThrow('Test set must have a valid associatedProjectUid');
    });

    it('should throw error for non-array variableNames', () => {
      const invalid = { ...validTestSet, variableNames: 'not-array' };
      expect(() => validateTestSet(invalid)).toThrow('Test set variableNames must be an array');
    });

    it('should throw error for non-array testCases', () => {
      const invalid = { ...validTestSet, testCases: 'not-array' };
      expect(() => validateTestSet(invalid)).toThrow('Test set testCases must be an array');
    });

    it('should throw error for invalid variable names', () => {
      const invalid = { ...validTestSet, variableNames: ['var1', 123 as unknown as string] };
      expect(() => validateTestSet(invalid)).toThrow('Variable name at index 1 must be a string');
    });

    it('should throw error for invalid test case structure', () => {
      const invalid = { ...validTestSet, testCases: [{ id: '', variableValues: {}, results: {} }] };
      expect(() => validateTestSet(invalid)).toThrow('Test case at index 0 must have a valid id');
    });
  });

  describe('localStorage operations', () => {
    const mockTestSets: TestSet[] = [
      {
        uid: 'test-1',
        name: 'Test Set 1',
        associatedProjectUid: 'project-1',
        variableNames: ['var1'],
        testCases: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    ];

    describe('getTestSets', () => {
      it('should return empty array when no data exists', () => {
        localStorageMock.getItem.mockReturnValue(null);
        expect(getTestSets()).toEqual([]);
      });

      it('should return parsed test sets from localStorage', () => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTestSets));
        expect(getTestSets()).toEqual(mockTestSets);
      });

      it('should handle invalid JSON gracefully', () => {
        localStorageMock.getItem.mockReturnValue('invalid-json');
        expect(getTestSets()).toEqual([]);
      });

      it('should filter out invalid test sets', () => {
        const invalidData = [
          mockTestSets[0],
          { invalid: 'test-set' }
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidData));
        
        const result = getTestSets();
        expect(result).toEqual([mockTestSets[0]]);
      });
    });

    describe('getTestSetByUid', () => {
      beforeEach(() => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTestSets));
      });

      it('should return test set by UID', () => {
        expect(getTestSetByUid('test-1')).toEqual(mockTestSets[0]);
      });

      it('should return undefined for non-existent UID', () => {
        expect(getTestSetByUid('non-existent')).toBeUndefined();
      });

      it('should return undefined for invalid UID', () => {
        expect(getTestSetByUid('')).toBeUndefined();
        expect(getTestSetByUid(null as unknown as string)).toBeUndefined();
      });
    });

    describe('saveTestSets', () => {
      it('should save valid test sets to localStorage', () => {
        saveTestSets(mockTestSets);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'prompt-forge-test-sets',
          JSON.stringify(mockTestSets)
        );
      });

      it('should throw error for non-array input', () => {
        expect(() => saveTestSets('not-array' as unknown as TestSet[])).toThrow('Test sets must be an array');
      });

      it('should throw error for invalid test sets', () => {
        const invalidTestSets = [{ invalid: 'test-set' }] as unknown as TestSet[];
        expect(() => saveTestSets(invalidTestSets)).toThrow('Invalid test set at index 0');
      });
    });

    describe('saveTestSet', () => {
      it('should save new test set', () => {
        localStorageMock.getItem.mockReturnValue('[]');
        
        const testSet = mockTestSets[0];
        saveTestSet(testSet);
        
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'prompt-forge-test-sets',
          expect.stringContaining('"uid":"test-1"')
        );
        
        // Verify the saved data structure
        const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
        expect(savedData).toHaveLength(1);
        expect(savedData[0]).toMatchObject({
          uid: testSet.uid,
          name: testSet.name,
          associatedProjectUid: testSet.associatedProjectUid
        });
        expect(savedData[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should update existing test set', () => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTestSets));
        
        const updatedTestSet = { ...mockTestSets[0], name: 'Updated Name' };
        saveTestSet(updatedTestSet);
        
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'prompt-forge-test-sets',
          expect.stringContaining('"name":"Updated Name"')
        );
        
        // Verify the saved data structure
        const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
        expect(savedData).toHaveLength(1);
        expect(savedData[0]).toMatchObject({
          uid: updatedTestSet.uid,
          name: 'Updated Name',
          associatedProjectUid: updatedTestSet.associatedProjectUid
        });
        expect(savedData[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('deleteTestSet', () => {
      beforeEach(() => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTestSets));
      });

      it('should delete test set by UID', () => {
        deleteTestSet('test-1');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'prompt-forge-test-sets',
          JSON.stringify([])
        );
      });

      it('should throw error for non-existent UID', () => {
        expect(() => deleteTestSet('non-existent')).toThrow('Test set not found');
      });

      it('should throw error for invalid UID', () => {
        expect(() => deleteTestSet('')).toThrow('Test set UID is required');
      });
    });

    describe('clearTestSets', () => {
      it('should remove test sets from localStorage', () => {
        clearTestSets();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('prompt-forge-test-sets');
      });
    });
  });

  describe('test set operations', () => {
    const baseTestSet: TestSet = {
      uid: 'test-uid',
      name: 'Test Set',
      associatedProjectUid: 'project-uid',
      variableNames: ['var1', 'var2'],
      testCases: [{
        id: 'case-1',
        variableValues: { var1: 'value1', var2: 'value2' },
        results: {}
      }],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };

    describe('updateTestSetVariables', () => {
      it('should update variable names and adjust test cases', () => {
        const result = updateTestSetVariables(baseTestSet, ['var1', 'var3']);
        
        expect(result.variableNames).toEqual(['var1', 'var3']);
        expect(result.testCases[0].variableValues).toEqual({
          var1: 'value1',
          var3: ''
        });
        expect(result.updatedAt).not.toBe(baseTestSet.updatedAt);
      });

      it('should trim variable names', () => {
        const result = updateTestSetVariables(baseTestSet, ['  var1  ', '  var3  ']);
        expect(result.variableNames).toEqual(['var1', 'var3']);
      });

      it('should throw error for invalid variable names', () => {
        expect(() => updateTestSetVariables(baseTestSet, ['var1', ''] as unknown as string[])).toThrow(
          'Variable name at index 1 must be a non-empty string'
        );
      });
    });

    describe('addTestCase', () => {
      it('should add a new test case with initialized variables', () => {
        const result = addTestCase(baseTestSet);
        
        expect(result.testCases).toHaveLength(2);
        expect(result.testCases[1]).toEqual({
          id: 'test-uid-123',
          variableValues: { var1: '', var2: '' },
          results: {}
        });
      });
    });

    describe('updateTestCase', () => {
      it('should update test case variable values', () => {
        const newValues = { var1: 'new-value1', var2: 'new-value2' };
        const result = updateTestCase(baseTestSet, 'case-1', newValues);
        
        expect(result.testCases[0].variableValues).toEqual(newValues);
        expect(result.updatedAt).not.toBe(baseTestSet.updatedAt);
      });

      it('should throw error for non-existent test case', () => {
        expect(() => updateTestCase(baseTestSet, 'non-existent', {})).toThrow('Test case not found');
      });

      it('should throw error for invalid parameters', () => {
        expect(() => updateTestCase(baseTestSet, '', {})).toThrow('Test case ID is required');
        expect(() => updateTestCase(baseTestSet, 'case-1', null as unknown as Record<string, string>)).toThrow('Variable values must be an object');
      });
    });

    describe('deleteTestCase', () => {
      it('should delete test case by ID', () => {
        const result = deleteTestCase(baseTestSet, 'case-1');
        
        expect(result.testCases).toHaveLength(0);
        expect(result.updatedAt).not.toBe(baseTestSet.updatedAt);
      });

      it('should throw error for non-existent test case', () => {
        expect(() => deleteTestCase(baseTestSet, 'non-existent')).toThrow('Test case not found');
      });

      it('should throw error for invalid test case ID', () => {
        expect(() => deleteTestCase(baseTestSet, '')).toThrow('Test case ID is required');
      });
    });

    describe('updateTestResult', () => {
      it('should update test result for specific version', () => {
        const testResult = createTestResult('Test output', 'completed');
        const result = updateTestResult(baseTestSet, 'case-1', 'version-1', testResult);
        
        expect(result.testCases[0].results['version-1']).toEqual(testResult);
        expect(result.updatedAt).not.toBe(baseTestSet.updatedAt);
      });

      it('should throw error for invalid parameters', () => {
        const testResult = createTestResult();
        
        expect(() => updateTestResult(baseTestSet, '', 'version-1', testResult)).toThrow('Test case ID is required');
        expect(() => updateTestResult(baseTestSet, 'case-1', '', testResult)).toThrow('Version identifier is required');
        expect(() => updateTestResult(baseTestSet, 'case-1', 'version-1', null as unknown as TestResult)).toThrow('Test result is required');
      });
    });

  });

  describe('utility functions', () => {
    const mockTestSetsForProject: TestSet[] = [
      {
        uid: 'test-1',
        name: 'Test Set 1',
        associatedProjectUid: 'project-1',
        variableNames: [],
        testCases: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      },
      {
        uid: 'test-2',
        name: 'Test Set 2',
        associatedProjectUid: 'project-1',
        variableNames: [],
        testCases: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      },
      {
        uid: 'test-3',
        name: 'Other Project Test',
        associatedProjectUid: 'project-2',
        variableNames: [],
        testCases: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    ];

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTestSetsForProject));
    });

    describe('getTestSetsByProject', () => {
      it('should return test sets for specific project', () => {
        const result = getTestSetsByProject('project-1');
        expect(result).toHaveLength(2);
        expect(result.map(ts => ts.name)).toEqual(['Test Set 1', 'Test Set 2']);
      });

      it('should return empty array for non-existent project', () => {
        const result = getTestSetsByProject('non-existent');
        expect(result).toEqual([]);
      });

      it('should return empty array for invalid project UID', () => {
        expect(getTestSetsByProject('')).toEqual([]);
        expect(getTestSetsByProject(null as unknown as string)).toEqual([]);
      });
    });

    describe('testSetNameExists', () => {
      it('should return true for existing name', () => {
        expect(testSetNameExists('Test Set 1', 'project-1')).toBe(true);
        expect(testSetNameExists('test set 1', 'project-1')).toBe(true); // case insensitive
      });

      it('should return false for non-existing name', () => {
        expect(testSetNameExists('Non Existent', 'project-1')).toBe(false);
      });

      it('should exclude specific UID from check', () => {
        expect(testSetNameExists('Test Set 1', 'project-1', 'test-1')).toBe(false);
      });

      it('should return false for invalid parameters', () => {
        expect(testSetNameExists('', 'project-1')).toBe(false);
        expect(testSetNameExists('Test', '')).toBe(false);
      });
    });

    describe('generateUniqueTestSetName', () => {
      it('should return base name if unique', () => {
        const result = generateUniqueTestSetName('Unique Name', 'project-1');
        expect(result).toBe('Unique Name');
      });

      it('should append number for duplicate names', () => {
        const result = generateUniqueTestSetName('Test Set 1', 'project-1');
        expect(result).toBe('Test Set 1 1');
      });

      it('should handle multiple duplicates', () => {
        // Mock additional test sets to test counter increment
        const additionalTestSets = [
          ...mockTestSetsForProject,
          {
            uid: 'test-4',
            name: 'New Test',
            associatedProjectUid: 'project-1',
            variableNames: [],
            testCases: [],
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          },
          {
            uid: 'test-5',
            name: 'New Test 1',
            associatedProjectUid: 'project-1',
            variableNames: [],
            testCases: [],
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          }
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(additionalTestSets));
        
        const result = generateUniqueTestSetName('New Test', 'project-1');
        expect(result).toBe('New Test 2');
      });

      it('should use default name for invalid base name', () => {
        const result = generateUniqueTestSetName('', 'project-1');
        expect(result).toBe('Test Set');
      });

      it('should return base name for invalid project UID', () => {
        const result = generateUniqueTestSetName('Test Name', '');
        expect(result).toBe('Test Name');
      });
    });
  });
});

  describe('variable synchronization', () => {
    let testSet: TestSet;
    
    beforeEach(() => {
      testSet = createTestSet('Sync Test', 'project-1');
      testSet.variableNames = ['name', 'age', 'city'];
      testSet.testCases = [
        createTestCase(['name', 'age', 'city']),
        createTestCase(['name', 'age', 'city'])
      ];
      testSet.testCases[0].variableValues = { name: 'John', age: '25', city: 'NYC' };
      testSet.testCases[1].variableValues = { name: 'Jane', age: '30', city: 'LA' };
    });

    describe('detectVariableDifferences', () => {
      it('should detect no differences when variables match', () => {
        const versionVariables = ['name', 'age', 'city'];
        const conflicts = detectVariableDifferences(testSet, versionVariables);
        
        expect(conflicts).toHaveLength(0);
      });

      it('should detect additions when version has new variables', () => {
        const versionVariables = ['name', 'age', 'city', 'country'];
        const conflicts = detectVariableDifferences(testSet, versionVariables);
        
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]).toEqual({ type: 'addition', variable: 'country' });
      });

      it('should detect removals when version has fewer variables', () => {
        const versionVariables = ['name', 'age'];
        const conflicts = detectVariableDifferences(testSet, versionVariables);
        
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]).toEqual({ type: 'removal', variable: 'city' });
      });

      it('should detect both additions and removals', () => {
        const versionVariables = ['name', 'country', 'email'];
        const conflicts = detectVariableDifferences(testSet, versionVariables);
        
        expect(conflicts).toHaveLength(4);
        
        const additions = conflicts.filter(c => c.type === 'addition');
        const removals = conflicts.filter(c => c.type === 'removal');
        
        expect(additions).toHaveLength(2);
        expect(removals).toHaveLength(2);
        
        expect(additions.map(c => c.variable)).toContain('country');
        expect(additions.map(c => c.variable)).toContain('email');
        expect(removals.map(c => c.variable)).toContain('age');
        expect(removals.map(c => c.variable)).toContain('city');
      });

      it('should throw error for invalid test set', () => {
        expect(() => detectVariableDifferences({} as TestSet, ['name'])).toThrow();
      });

      it('should throw error for non-array version variables', () => {
        expect(() => detectVariableDifferences(testSet, 'invalid' as unknown as string[])).toThrow();
      });
    });

    describe('mergeTestSetVariables', () => {
      it('should preserve existing variable values', () => {
        const versionVariables = ['name', 'age', 'city'];
        const result = mergeTestSetVariables(testSet, versionVariables);
        
        expect(result.variableNames).toEqual(['name', 'age', 'city']);
        expect(result.testCases[0].variableValues).toEqual({
          name: 'John',
          age: '25',
          city: 'NYC'
        });
      });

      it('should add new variables with empty values', () => {
        const versionVariables = ['name', 'age', 'city', 'country'];
        const result = mergeTestSetVariables(testSet, versionVariables);
        
        expect(result.variableNames).toEqual(['name', 'age', 'city', 'country']);
        expect(result.testCases[0].variableValues).toEqual({
          name: 'John',
          age: '25',
          city: 'NYC',
          country: ''
        });
      });

      it('should remove variables not in version', () => {
        const versionVariables = ['name', 'age'];
        const result = mergeTestSetVariables(testSet, versionVariables);
        
        expect(result.variableNames).toEqual(['name', 'age']);
        expect(result.testCases[0].variableValues).toEqual({
          name: 'John',
          age: '25'
        });
      });

      it('should trim variable names', () => {
        const versionVariables = [' name ', ' age ', ' city '];
        const result = mergeTestSetVariables(testSet, versionVariables);
        
        expect(result.variableNames).toEqual(['name', 'age', 'city']);
      });

      it('should update updatedAt timestamp', async () => {
        const originalTimestamp = testSet.updatedAt;
        // Add small delay to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 1));
        const versionVariables = ['name', 'age', 'city'];
        const result = mergeTestSetVariables(testSet, versionVariables);
        
        expect(result.updatedAt).not.toEqual(originalTimestamp);
      });

      it('should throw error for invalid variable names', () => {
        expect(() => mergeTestSetVariables(testSet, ['name', '', 'city'])).toThrow();
      });
    });

    describe('validateSynchronizationOperation', () => {
      it('should pass validation for valid inputs', () => {
        const versionVariables = ['name', 'age', 'city'];
        expect(() => validateSynchronizationOperation(testSet, versionVariables)).not.toThrow();
      });

      it('should throw error for invalid test set', () => {
        expect(() => validateSynchronizationOperation({} as TestSet, ['name'])).toThrow();
      });

      it('should throw error for non-array version variables', () => {
        expect(() => validateSynchronizationOperation(testSet, 'invalid' as unknown as string[])).toThrow();
      });

      it('should throw error for duplicate variable names', () => {
        const versionVariables = ['name', 'age', 'name'];
        expect(() => validateSynchronizationOperation(testSet, versionVariables)).toThrow('duplicates');
      });

      it('should throw error for empty variable names', () => {
        const versionVariables = ['name', '', 'city'];
        expect(() => validateSynchronizationOperation(testSet, versionVariables)).toThrow();
      });

      it('should throw error for whitespace-only variable names', () => {
        const versionVariables = ['name', '   ', 'city'];
        expect(() => validateSynchronizationOperation(testSet, versionVariables)).toThrow();
      });

      it('should throw error for invalid variable name patterns', () => {
        const versionVariables = ['name', '123invalid', 'city'];
        expect(() => validateSynchronizationOperation(testSet, versionVariables)).toThrow('invalid characters');
      });

      it('should allow valid variable name patterns', () => {
        const versionVariables = ['name', 'age_2', '_private', 'camelCase'];
        expect(() => validateSynchronizationOperation(testSet, versionVariables)).not.toThrow();
      });
    });

    describe('synchronizeTestSetVariables', () => {
      it('should return complete synchronization result', () => {
        const versionVariables = ['name', 'country'];
        const result = synchronizeTestSetVariables(testSet, versionVariables);
        
        expect(result).toHaveProperty('updatedTestSet');
        expect(result).toHaveProperty('conflicts');
        
        expect(result.updatedTestSet.variableNames).toEqual(['name', 'country']);
        expect(result.conflicts).toHaveLength(3); // 1 addition, 2 removals
      });

      it('should handle no conflicts scenario', () => {
        const versionVariables = ['name', 'age', 'city'];
        const result = synchronizeTestSetVariables(testSet, versionVariables);
        
        expect(result.conflicts).toHaveLength(0);
        expect(result.updatedTestSet.variableNames).toEqual(['name', 'age', 'city']);
      });
    });

    describe('handleTestCaseDataUpdates', () => {
      it('should return unchanged test set when no conflicts', () => {
        const conflicts: VariableConflict[] = [];
        const result = handleTestCaseDataUpdates(testSet, conflicts);
        
        expect(result).toEqual(testSet);
      });

      it('should remove data for removed variables', () => {
        const conflicts: VariableConflict[] = [
          { type: 'removal', variable: 'city' },
          { type: 'addition', variable: 'country' }
        ];
        const result = handleTestCaseDataUpdates(testSet, conflicts);
        
        expect(result.testCases[0].variableValues).toEqual({
          name: 'John',
          age: '25'
        });
        expect(result.testCases[1].variableValues).toEqual({
          name: 'Jane',
          age: '30'
        });
      });

      it('should update updatedAt timestamp', async () => {
        const originalTimestamp = testSet.updatedAt;
        // Add small delay to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 1));
        const conflicts: VariableConflict[] = [
          { type: 'removal', variable: 'city' }
        ];
        const result = handleTestCaseDataUpdates(testSet, conflicts);
        
        expect(result.updatedAt).not.toEqual(originalTimestamp);
      });

      it('should throw error for invalid conflicts array', () => {
        expect(() => handleTestCaseDataUpdates(testSet, 'invalid' as unknown as VariableConflict[])).toThrow();
      });
    });
  });