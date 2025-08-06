import React from 'react';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestSetProvider, useTestSets } from './TestSetContext';
import * as testSetStorage from '@/lib/testSetStorage';
import * as storage from '@/lib/storage';

// Mock the storage modules
vi.mock('@/lib/testSetStorage');
vi.mock('@/lib/storage');

// Mock the LLM client
vi.mock('@/lib/openrouter', () => ({
  LLMClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue('Mock LLM response')
  }))
}));

const mockTestSetStorage = vi.mocked(testSetStorage);
const mockStorage = vi.mocked(storage);

// Test component to access context
const TestComponent = () => {
  const context = useTestSets();
  
  return (
    <div>
      <div data-testid="test-sets-count">{context.testSets.length}</div>
      <div data-testid="current-test-set">
        {context.currentTestSet ? context.currentTestSet.name : 'none'}
      </div>
      <button 
        data-testid="add-test-set"
        onClick={() => context.addTestSet('Test Set 1', 'project-1')}
      >
        Add Test Set
      </button>
      <button 
        data-testid="add-test-case"
        onClick={() => context.currentTestSet && context.addTestCase(context.currentTestSet.uid)}
      >
        Add Test Case
      </button>
    </div>
  );
};

describe('TestSetContext', () => {
  const mockTestSet = {
    uid: 'test-set-1',
    name: 'Test Set 1',
    associatedProjectUid: 'project-1',
    variableNames: ['var1', 'var2'],
    testCases: [
      {
        id: 'case-1',
        variableValues: { var1: 'value1', var2: 'value2' },
        results: {}
      }
    ],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  const mockProject = {
    uid: 'project-1',
    name: 'Test Project',
    currentVersion: 1,
    versions: [
      {
        id: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        description: 'Initial version',
        data: {
          prompts: [
            { id: 1, role: 'user' as const, content: 'Hello {{name}}' }
          ],
          messages: [],
          variables: [{ name: 'name', value: 'World' }],
          modelConfig: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            max_tokens: 1000
          }
        }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === 'apiKeys') {
          return JSON.stringify({ OpenRouter: 'mock-api-key' });
        }
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    
    // Setup default mocks
    mockTestSetStorage.getTestSets.mockReturnValue([]);
    mockTestSetStorage.createTestSet.mockReturnValue(mockTestSet);
    mockTestSetStorage.saveTestSet.mockImplementation(() => {});
    mockTestSetStorage.deleteTestSet.mockImplementation(() => {});
    mockTestSetStorage.addTestCase.mockReturnValue({
      ...mockTestSet,
      testCases: [...mockTestSet.testCases, {
        id: 'case-2',
        variableValues: { var1: '', var2: '' },
        results: {}
      }]
    });
    mockTestSetStorage.generateUniqueTestSetName.mockImplementation((name) => name);
    
    mockStorage.getProjectByUid.mockReturnValue(mockProject);
    mockStorage.extractVariablesFromPrompts.mockReturnValue(['name']);
  });

  afterEach(() => {
    cleanup();
  });

  it('should provide test set context', () => {
    render(
      <TestSetProvider>
        <TestComponent />
      </TestSetProvider>
    );

    expect(screen.getByTestId('test-sets-count')).toHaveTextContent('0');
    expect(screen.getByTestId('current-test-set')).toHaveTextContent('none');
  });

  it('should load test sets on initialization', () => {
    mockTestSetStorage.getTestSets.mockReturnValue([mockTestSet]);

    render(
      <TestSetProvider>
        <TestComponent />
      </TestSetProvider>
    );

    expect(screen.getByTestId('test-sets-count')).toHaveTextContent('1');
    expect(screen.getByTestId('current-test-set')).toHaveTextContent('Test Set 1');
  });

  it('should add a new test set', async () => {
    mockTestSetStorage.getTestSets.mockReturnValue([]);

    render(
      <TestSetProvider>
        <TestComponent />
      </TestSetProvider>
    );

    const addButton = screen.getByTestId('add-test-set');
    
    await act(async () => {
      addButton.click();
    });

    expect(mockTestSetStorage.createTestSet).toHaveBeenCalledWith('Test Set 1', 'project-1');
    expect(mockTestSetStorage.saveTestSet).toHaveBeenCalledWith(mockTestSet);
  });

  it('should add a test case to current test set', async () => {
    mockTestSetStorage.getTestSets.mockReturnValue([mockTestSet]);

    render(
      <TestSetProvider>
        <TestComponent />
      </TestSetProvider>
    );

    const addCaseButton = screen.getByTestId('add-test-case');
    
    await act(async () => {
      addCaseButton.click();
    });

    expect(mockTestSetStorage.addTestCase).toHaveBeenCalledWith(mockTestSet);
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTestSets must be used within a TestSetProvider');
    
    consoleSpy.mockRestore();
  });

  it('should handle variable synchronization', async () => {
    mockTestSetStorage.getTestSets.mockReturnValue([mockTestSet]);
    mockTestSetStorage.synchronizeTestSetVariables.mockReturnValue({
      updatedTestSet: {
        ...mockTestSet,
        variableNames: ['name'],
        testCases: [{
          ...mockTestSet.testCases[0],
          variableValues: { name: '' }
        }]
      },
      conflicts: [
        { type: 'addition', variable: 'name' },
        { type: 'removal', variable: 'var1' },
        { type: 'removal', variable: 'var2' }
      ]
    });

    const TestSyncComponent = () => {
      const context = useTestSets();
      
      const handleSync = () => {
        if (context.currentTestSet) {
          const result = context.syncVariablesFromVersion(
            context.currentTestSet.uid,
            'project-1',
            1
          );
          
          // Update the test set with synchronized variables
          context.updateTestSet(result.updatedTestSet);
        }
      };

      return (
        <div>
          <div data-testid="sync-result">
            {context.currentTestSet?.variableNames.join(', ')}
          </div>
          <button data-testid="sync-button" onClick={handleSync}>
            Sync Variables
          </button>
        </div>
      );
    };

    render(
      <TestSetProvider>
        <TestSyncComponent />
      </TestSetProvider>
    );

    const syncButton = screen.getByTestId('sync-button');
    
    await act(async () => {
      syncButton.click();
    });

    expect(mockStorage.getProjectByUid).toHaveBeenCalledWith('project-1');
    expect(mockStorage.extractVariablesFromPrompts).toHaveBeenCalled();
    expect(mockTestSetStorage.synchronizeTestSetVariables).toHaveBeenCalled();
  });

  it('should handle test execution', async () => {
    mockTestSetStorage.getTestSets.mockReturnValue([mockTestSet]);
    mockTestSetStorage.createTestResult.mockImplementation((content, status, error, executionTime) => ({
      id: 'result-1',
      content,
      timestamp: '2023-01-01T00:00:00.000Z',
      status,
      error,
      executionTime
    }));
    mockTestSetStorage.updateTestResult.mockReturnValue(mockTestSet);

    const TestExecutionComponent = () => {
      const context = useTestSets();
      
      const handleRunTest = async () => {
        if (context.currentTestSet && context.currentTestSet.testCases.length > 0) {
          await context.runSingleTest(
            context.currentTestSet.uid,
            context.currentTestSet.testCases[0].id,
            1
          );
        }
      };

      return (
        <button data-testid="run-test" onClick={handleRunTest}>
          Run Test
        </button>
      );
    };

    render(
      <TestSetProvider>
        <TestExecutionComponent />
      </TestSetProvider>
    );

    const runButton = screen.getByTestId('run-test');
    
    await act(async () => {
      runButton.click();
    });

    // Wait for async execution to complete
    await waitFor(() => {
      expect(mockTestSetStorage.createTestResult).toHaveBeenCalledWith('', 'pending');
    });

    expect(mockTestSetStorage.updateTestResult).toHaveBeenCalled();
  });

  it('should handle batch test execution', async () => {
    const testSetWithMultipleCases = {
      ...mockTestSet,
      testCases: [
        mockTestSet.testCases[0],
        {
          id: 'case-2',
          variableValues: { var1: 'value3', var2: 'value4' },
          results: {}
        },
        {
          id: 'case-3',
          variableValues: { var1: 'value5', var2: 'value6' },
          results: {}
        }
      ]
    };

    mockTestSetStorage.getTestSets.mockReturnValue([testSetWithMultipleCases]);
    mockTestSetStorage.createTestResult.mockImplementation((content, status, error, executionTime) => ({
      id: 'result-1',
      content,
      timestamp: '2023-01-01T00:00:00.000Z',
      status,
      error,
      executionTime
    }));
    mockTestSetStorage.updateTestResult.mockReturnValue(testSetWithMultipleCases);

    const TestBatchComponent = () => {
      const context = useTestSets();
      
      const handleRunAllTests = async () => {
        if (context.currentTestSet) {
          await context.runAllTests(context.currentTestSet.uid, 1);
        }
      };

      return (
        <button data-testid="run-all-tests" onClick={handleRunAllTests}>
          Run All Tests
        </button>
      );
    };

    render(
      <TestSetProvider>
        <TestBatchComponent />
      </TestSetProvider>
    );

    const runAllButton = screen.getByTestId('run-all-tests');
    
    await act(async () => {
      runAllButton.click();
    });

    // Wait for async execution to complete
    await waitFor(() => {
      expect(mockTestSetStorage.createTestResult).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Should have been called for each test case (pending, running, completed states)
    expect(mockTestSetStorage.updateTestResult).toHaveBeenCalled();
  });
});